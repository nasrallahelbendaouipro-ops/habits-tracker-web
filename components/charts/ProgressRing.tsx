'use client';

type Props = {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
};

export default function ProgressRing({ pct, size = 80, strokeWidth = 8, color = '#6C63FF', label }: Props) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(pct, 100)) / 100 * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', position: 'absolute' }}
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      {/* Center label */}
      <div className="flex flex-col items-center z-10">
        <span className="font-bold leading-none" style={{ fontSize: size * 0.22, color: 'var(--text-primary)' }}>
          {pct}%
        </span>
        {label && (
          <span style={{ fontSize: size * 0.12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</span>
        )}
      </div>
    </div>
  );
}
