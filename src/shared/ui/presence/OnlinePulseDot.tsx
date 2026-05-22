export function OnlinePulseDot({
  color = "var(--success)",
  size = 8,
  className = "",
}: { color?: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block rounded-full phonara-pulse ${className}`}
      style={{ width: size, height: size, background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}
