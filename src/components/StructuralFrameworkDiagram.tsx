export default function StructuralFrameworkDiagram() {
  // ── Geometry ──────────────────────────────────────────────────────
  const W = 520;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const orbit = 190; // distance from center to outer nodes

  const axes: { label: string; short: string }[] = [
    { label: "Energy", short: "ENR" },
    { label: "Finance", short: "FIN" },
    { label: "Defense", short: "DEF" },
    { label: "Technology", short: "TCH" },
    { label: "Critical Inputs", short: "CRI" },
    { label: "Logistics", short: "LOG" },
  ];

  // Start at top (−90°), go clockwise
  const nodes = axes.map((a, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
    return {
      ...a,
      x: cx + orbit * Math.cos(angle),
      y: cy + orbit * Math.sin(angle),
    };
  });

  // ── Line endpoints trimmed to node edges ──────────────────────────
  const centerR = 52;
  const nodeR = 38;

  function trimmedLine(nx: number, ny: number) {
    const dx = nx - cx;
    const dy = ny - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist;
    const uy = dy / dist;
    return {
      x1: cx + ux * centerR,
      y1: cy + uy * centerR,
      x2: nx - ux * nodeR,
      y2: ny - uy * nodeR,
    };
  }

  // ── Hexagon path connecting outer nodes ───────────────────────────
  const hexPoints = nodes.map((n) => `${n.x},${n.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto block w-full"
      role="img"
      aria-label="ISI structural framework: Sovereign Exposure at center, connected to six strategic axes — Energy, Finance, Defense, Technology, Critical Inputs, and Logistics"
    >
      {/* Outer hexagon — faint structural ring */}
      <polygon
        points={hexPoints}
        fill="none"
        stroke="#334155"
        strokeWidth={0.5}
        opacity={0.5}
      />

      {/* Radial lines — center to each node, trimmed to edges */}
      {nodes.map((n) => {
        const l = trimmedLine(n.x, n.y);
        return (
          <line
            key={`ln-${n.short}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Center node */}
      <circle
        cx={cx}
        cy={cy}
        r={centerR}
        fill="#0f172a"
        stroke="#94a3b8"
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f1f5f9"
        fontSize={13}
        fontWeight={600}
        fontFamily="var(--font-serif, Georgia, serif)"
        letterSpacing="0.02em"
      >
        Sovereign
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#cbd5e1"
        fontSize={12}
        fontWeight={400}
        fontFamily="var(--font-serif, Georgia, serif)"
        letterSpacing="0.02em"
      >
        Exposure
      </text>

      {/* Outer nodes */}
      {nodes.map((n) => {
        const lines = n.label.split(" ");
        const isMulti = lines.length > 1;
        return (
          <g key={n.short}>
            <circle
              cx={n.x}
              cy={n.y}
              r={nodeR}
              fill="#0f172a"
              stroke="#475569"
              strokeWidth={1}
            />
            {/* Axis abbreviation — small, above */}
            <text
              x={n.x}
              y={n.y - (isMulti ? 14 : 8)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#64748b"
              fontSize={8}
              fontWeight={500}
              fontFamily="var(--font-mono, monospace)"
              letterSpacing="0.12em"
            >
              {n.short}
            </text>
            {/* Full label */}
            {isMulti ? (
              <>
                <text
                  x={n.x}
                  y={n.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#cbd5e1"
                  fontSize={10}
                  fontWeight={500}
                  fontFamily="var(--font-sans, system-ui, sans-serif)"
                  letterSpacing="0.04em"
                >
                  {lines[0]}
                </text>
                <text
                  x={n.x}
                  y={n.y + 13}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#cbd5e1"
                  fontSize={10}
                  fontWeight={500}
                  fontFamily="var(--font-sans, system-ui, sans-serif)"
                  letterSpacing="0.04em"
                >
                  {lines[1]}
                </text>
              </>
            ) : (
              <text
                x={n.x}
                y={n.y + 5}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#cbd5e1"
                fontSize={10}
                fontWeight={500}
                fontFamily="var(--font-sans, system-ui, sans-serif)"
                letterSpacing="0.04em"
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Small tick marks at each vertex of the hexagon — subtle detail */}
      {nodes.map((n, i) => {
        const next = nodes[(i + 1) % 6];
        const mx = (n.x + next.x) / 2;
        const my = (n.y + next.y) / 2;
        const dx = next.x - n.x;
        const dy = next.y - n.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const px = -dy / len;
        const py = dx / len;
        return (
          <line
            key={`tick-${i}`}
            x1={mx - px * 3}
            y1={my - py * 3}
            x2={mx + px * 3}
            y2={my + py * 3}
            stroke="#334155"
            strokeWidth={0.5}
            opacity={0.5}
          />
        );
      })}
    </svg>
  );
}
