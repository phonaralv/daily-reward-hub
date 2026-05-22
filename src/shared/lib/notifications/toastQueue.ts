import { notify } from "@/shared/lib/notify";

type Priority = "reward" | "limited" | "friend" | "system";

interface QueuedToast {
  id: string;
  priority: Priority;
  title: string;
  description?: string;
}

const PRIO: Record<Priority, number> = { reward: 4, limited: 3, friend: 2, system: 1 };
const queue: QueuedToast[] = [];
const CAP = 5;
let active = 0;

export function enqueueToast(t: QueuedToast): void {
  queue.push(t);
  queue.sort((a, b) => PRIO[b.priority] - PRIO[a.priority]);
  if (queue.length > CAP) queue.length = CAP;
  drain();
}

function drain(): void {
  if (active >= 1) return;
  const next = queue.shift();
  if (!next) return;
  active += 1;
  if (next.priority === "reward") {
    notify.reward(next.title, { description: next.description });
  } else if (next.priority === "limited") {
    notify.info(next.title, { description: next.description });
  } else {
    notify.info(next.title, { description: next.description });
  }
  window.setTimeout(() => {
    active -= 1;
    drain();
  }, 1800);
}
