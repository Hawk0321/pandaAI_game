import type { SkillId } from './model';

export function SkillGlyph({ id }: { id: SkillId }) {
  return <svg viewBox="0 0 180 108" fill="none" aria-hidden="true">
    <g stroke="currentColor" opacity=".12">{[26, 54, 82].map(y => <path key={y} d={`M8 ${y}H172`} />)}{[34, 70, 106, 142].map(x => <path key={x} d={`M${x} 8V100`} />)}</g>
    {id === 'trend' && <><path d="M14 85L39 67L59 77L84 43L105 53L129 27L163 15" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /><path d="M14 91C61 91 66 72 89 67S136 48 163 44" stroke="currentColor" opacity=".45" strokeWidth="2" /><circle cx="129" cy="27" r="8" stroke="currentColor" fill="#181d2f" /><circle cx="129" cy="27" r="3" fill="currentColor" /></>}
    {id === 'shield' && <><path d="M90 13L125 27V52C125 74 108 88 90 97C72 88 55 74 55 52V27L90 13Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity=".08" /><path d="M74 53L86 65L109 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 56H43M137 56H161" stroke="currentColor" strokeDasharray="3 5" /><circle cx="26" cy="56" r="3" fill="currentColor" /><circle cx="154" cy="56" r="3" fill="currentColor" /></>}
    {id === 'reversal' && <><path d="M15 23L43 41L67 37L94 83L119 69L144 38L163 26" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /><path d="M15 45L163 66" stroke="currentColor" opacity=".4" strokeWidth="2" strokeDasharray="4 5" /><circle cx="94" cy="83" r="7" stroke="currentColor" /><path d="M147 24H165V42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>}
    {id === 'review' && <><rect x="45" y="22" width="76" height="75" rx="8" stroke="currentColor" opacity=".35" /><rect x="57" y="11" width="76" height="75" rx="8" fill="#1a1e2e" stroke="currentColor" strokeWidth="2" /><path d="M73 29H115M73 42H106M73 55H96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="129" cy="78" r="17" fill="#1a1e2e" stroke="currentColor" strokeWidth="2" /><path d="M121 78L127 84L138 71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>}
  </svg>;
}
