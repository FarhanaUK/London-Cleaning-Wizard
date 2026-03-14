export function Sparkle({ size = 16, color = "#c8b89a", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
        fill={color}
      />
    </svg>
  );
}

export function WandIcon({ size = 28, color = "#c8b89a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <line x1="6"  y1="26" x2="22" y2="10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="10" x2="26" y2="6"  stroke={color} strokeWidth="2"   strokeLinecap="round" />
      <path d="M22 10 L24 6 L26 10 L30 12 L26 14 L24 18 L22 14 L18 12 Z" fill={color} opacity="0.85" />
      <circle cx="8"  cy="24" r="1.5" fill={color} opacity="0.5"  />
      <circle cx="5"  cy="20" r="1"   fill={color} opacity="0.35" />
      <circle cx="12" cy="27" r="1"   fill={color} opacity="0.35" />
    </svg>
  );
}

export function Constellation({ width = 200, height = 120, color = "#c8b89a", opacity = 0.18 }) {
  const stars = [
    [20, 30], [60, 10], [100, 50], [150, 20],
    [180, 60], [130, 90], [70, 80], [40, 70],
  ];
  const lines = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[2,6]];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={stars[a][0]} y1={stars[a][1]}
          x2={stars[b][0]} y2={stars[b][1]}
          stroke={color}
          strokeWidth="0.6"
        />
      ))}
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={color} />
      ))}
    </svg>
  );
}

export function LogoMark({ size = 36, color = "#c8b89a", innerColor }) {
  const ic = innerColor || color;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="1" />
      <path
        d="M18 8 L19.5 15.5 L27 18 L19.5 20.5 L18 28 L16.5 20.5 L9 18 L16.5 15.5 Z"
        fill={color}
      />
      <circle cx="18" cy="18" r="2" fill={ic} />
    </svg>
  );
}