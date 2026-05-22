/**
 * Placeholder world activity map — lightweight SVG dot mask.
 * PR-3 will wire real aggregate region data.
 */
export function WorldActivityMapPlaceholder() {
  return (
    <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-surface-1 border border-border">
      <svg viewBox="0 0 320 180" className="w-full h-full opacity-70" aria-hidden="true">
        <defs>
          <radialGradient id="hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(45 100% 62%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(45 100% 62%)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Dot grid suggesting continents */}
        {Array.from({ length: 200 }).map((_, i) => {
          const x = (i * 17) % 320;
          const y = ((i * 31) % 180);
          return <circle key={i} cx={x} cy={y} r={0.8} fill="hsl(240 5% 35%)" />;
        })}
        {/* Hot spots */}
        {[
          { x: 240, y: 70 },  // Seoul/Tokyo
          { x: 80,  y: 80 },  // NY
          { x: 165, y: 60 },  // London/Berlin
          { x: 215, y: 100 }, // Singapore
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={12} fill="url(#hot)">
            <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
        global activity (preview)
      </div>
    </div>
  );
}
