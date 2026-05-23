import { useEffect, useState } from 'react';
import { presenceSource, PresenceState } from '@/lib/presence/PresenceSource';

export function usePresence() {
  const [state, setState] = useState<PresenceState>(presenceSource.getState());

  useEffect(() => {
    presenceSource.start();

    const unsubscribe = presenceSource.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}