import { useTeamStore } from '../../store/teamStore';
import { useShallow } from 'zustand/shallow';
import { ROLE_META } from '../../lib/permissions';
import { initials } from '../../lib/utils';
import type { TeamRole } from '../../types/team';

interface Props {
  value: string | null | 'auto';
  onChange: (v: string | 'auto') => void;
  allowAuto?: boolean;
  roleFilter?: TeamRole | null;
  className?: string;
}

/** Select per scegliere l'assegnatario (con opzione smistamento automatico). */
export function AssigneePicker({ value, onChange, allowAuto = true, roleFilter, className }: Props) {
  const allMembers = useTeamStore((s) => s.members);
  const members = allMembers.filter((m) => m.status === 'active' && (!roleFilter || m.role === roleFilter));

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value as string | 'auto')}
      className={className ?? 'auth-input'}
    >
      {allowAuto && <option value="auto">⚡ Smistamento automatico</option>}
      <option value="">— Non assegnato —</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.first_name} {m.last_name} · {ROLE_META[m.role].label}
        </option>
      ))}
    </select>
  );
}

/** Avatar compatto dell'assegnatario (o placeholder se non assegnato). */
export function AssigneeAvatar({ memberId, size = 24 }: { memberId: string | null; size?: number }) {
  const member = useTeamStore(useShallow((s) => s.members.find((m) => m.id === memberId)));
  if (!member) {
    return (
      <div className="rounded-full border border-dashed border-surface-300 dark:border-surface-600
                      flex items-center justify-center text-surface-300"
           style={{ width: size, height: size, fontSize: size * 0.4 }} title="Non assegnato">
        ?
      </div>
    );
  }
  const color = ROLE_META[member.role].color;
  return (
    <div className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
         style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: color }}
         title={`${member.first_name} ${member.last_name} · ${ROLE_META[member.role].label}`}>
      {initials(member.first_name, member.last_name)}
    </div>
  );
}
