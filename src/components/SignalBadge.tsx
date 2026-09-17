export type SignalType = 'FUNDING' | 'HIRING' | 'GROWTH' | 'OPPORTUNITY' | 'MILESTONE';

const CFG: Record<SignalType, string> = {
  FUNDING:     'bg-purple-900/40 text-purple-400 border-purple-700/30',
  HIRING:      'bg-green-900/40  text-green-400  border-green-700/30',
  GROWTH:      'bg-blue-900/40   text-blue-400   border-blue-700/30',
  OPPORTUNITY: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/30',
  MILESTONE:   'bg-orange-900/40 text-orange-400 border-orange-700/30',
};

export function SignalBadge({ type }: { type: SignalType }) {
  return (
    <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border ${CFG[type]}`}>
      {type}
    </span>
  );
}
