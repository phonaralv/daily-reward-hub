import { PresenceState } from './types';

export class PresenceSource {
  private state: PresenceState = {
    isPresent: false,
    lastSeenAt: null,
    sessionStartTime: null,
  };

  private listeners = new Set<(state: PresenceState) => void>();
  private heartbeatInterval: number | null = null;
  private isStarted = false;

  constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    if (this.isStarted) return;
    this.isStarted = true;

    const isVisible = document.visibilityState === 'visible';
    this.updateState(isVisible);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.heartbeatInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.updateState(true);
      }
    }, 30000);
  }

  stop() {
    if (!this.isStarted) return;
    this.isStarted = false;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.updateState(false);
  }

  private handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';
    this.updateState(isVisible);
  };

  private updateState(isPresent: boolean) {
    const now = new Date();

    if (isPresent && !this.state.isPresent) {
      this.state = {
        isPresent: true,
        lastSeenAt: now,
        sessionStartTime: now,
      };
    } else if (!isPresent && this.state.isPresent) {
      this.state = {
        isPresent: false,
        lastSeenAt: now,
        sessionStartTime: null,
      };
    } else {
      this.state = {
        ...this.state,
        lastSeenAt: now,
      };
    }

    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  subscribe(callback: (state: PresenceState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getState(): PresenceState {
    return { ...this.state };
  }
}

export const presenceSource = new PresenceSource();