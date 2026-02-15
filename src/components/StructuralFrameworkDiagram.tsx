export default function StructuralFrameworkDiagram() {
  const cx = 200;
  const cy = 200;
  const outerR = 140;
  const centerR = 48;
  const nodeR = 34;

  const axes = [
    "Energy",
    "Finance",
    "Defense",
    "Technology",
    "Critical\nInputs",
    "Logistics",
  ];

  const nodes = axes.map((label, i) => {
    const angle = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 6;
    return {
      label,
      x: cx + outerR * Math.cos(angle),
      y: cy + outerR * Math.sin(angle),
    };
  });

  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto block w-full max-w-[380px] lg:max-w-none"
      role="img"
      aria-label="ISI structural framework: Sovereign Exposure at center, connected to six strategic axes — Energy, Finance, Defense, Technology, Critical Inputs, and Logistics"
    >
      {/* Connecting lines — center to each outer node */}
      {nodes.map(({ label, x, y }) => (
        <line
          key={`line-${label}`}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="#64748b"
          strokeWidth={1}
        />
      ))}

      {/* Center node */}
      <circle cx={cx} cy={cy} r={centerR} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - 7}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#e2e8f0"
        fontSize={11}
        fontWeight={600}
        fontFamily="var(--font-serif, Georgia, serif)"
      >
        Sovereign
      </text>
      <text
        x={cx}
        y={cy + 9}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#e2e8f0"
        fontSize={11}
        fontWeight={600}
        fontFamily="var(--font-serif, Georgia, serif)"
      >
        Exposure
      </text>

      {/* Outer nodes */}
      {nodes.map(({ label, x, y }) => {
        const lines = label.split("\n");
        return (
          <g key={label}>
            <circle cx={x} cy={y} r={nodeR} fill="none" stroke="#64748b" strokeWidth={1} />
            {lines.length === 1 ? (
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#94a3b8"
                fontSize={9}
                fontWeight={500}
                letterSpacing="0.06em"
                fontFamily="var(--font-sans, system-ui, sans-serif)"
              >
                {label.toUpperCase()}
              </text>
            ) : (
              <>
                <text
                  x={x}
                  y={y - 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#94a3b8"
                  fontSize={9}
                  fontWeight={500}
                  letterSpacing="0.06em"
                  fontFamily="var(--font-sans, system-ui, sans-serif)"
                >
                  {lines[0].toUpperCase()}
                </text>
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#94a3b8"
                  fontSize={9}
                  fontWeight={500}
                  letterSpacing="0.06em"
                  fontFamily="var(--font-sans, system-ui, sans-serif)"
                >
                  {lines[1].toUpperCase()}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
