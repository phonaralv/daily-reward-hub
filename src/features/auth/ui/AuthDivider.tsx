export function AuthDivider({ label = "또는" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3" role="separator" aria-label={label}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
