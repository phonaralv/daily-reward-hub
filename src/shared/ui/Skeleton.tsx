export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-surface-2 animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}
