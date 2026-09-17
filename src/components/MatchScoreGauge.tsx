interface Props { score: number; size?: 'sm' | 'md'; }

export function MatchScoreGauge({ score, size = 'md' }: Props) {
  const r   = size === 'sm' ? 20 : 26;
  const sw  = size === 'sm' ? 3.5 : 4.5;
  const w   = (r + sw) * 2;
  const h   = r + sw + 4;
  const circ = Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#a855f7' : '#eab308';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path
          d={`M ${sw} ${r + sw} A ${r} ${r} 0 0 1 ${w - sw} ${r + sw}`}
          fill="none" stroke="#1a1a2e" strokeWidth={sw} strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${sw} ${r + sw} A ${r} ${r} 0 0 1 ${w - sw} ${r + sw}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
        />
      </svg>
      <span className={`font-bold text-white leading-none ${size === 'sm' ? 'text-xl' : 'text-2xl'}`}>{score}%</span>
      <span className="text-gray-500 text-[10px]">Match Score</span>
    </div>
  );
}
