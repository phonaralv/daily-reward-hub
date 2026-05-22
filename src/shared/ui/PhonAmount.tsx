import { formatPhon } from "@/shared/lib/format";

export function PhonAmount({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span data-numeric className={`font-tabular ${className}`}>
      {formatPhon(value)}
    </span>
  );
}
