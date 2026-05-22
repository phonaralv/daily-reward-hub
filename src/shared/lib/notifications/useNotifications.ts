// PR-1 stub. Real implementation lands in PR-9 (DB table `notifications`).
import { useState } from "react";

export interface NotificationRow {
  id: string;
  type: string;
  key: string;
  params: Record<string, string | number>;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const [items] = useState<NotificationRow[]>([]);
  return { items, isLoading: false, error: null as Error | null };
}
