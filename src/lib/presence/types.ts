export interface PresenceState {
  isPresent: boolean;
  lastSeenAt: Date | null;
  sessionStartTime: Date | null;
}