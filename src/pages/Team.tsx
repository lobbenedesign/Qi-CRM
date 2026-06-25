import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Navigate } from 'react-router-dom';
import { 
  UserPlus, Users2, Shield, MoreVertical, Trash2, Ban, CheckCircle2,
  Clock, Plus, Settings2, Briefcase, UserCheck, ShieldAlert, CalendarClock, Check
} from 'lucide-react';
import { useTeamStore } from '../store/teamStore';
import { useRoleStore } from '../store/roleStore';
import { useTeamGroupStore } from '../store/teamGroupStore';
import { useCan } from '../hooks/useCan';
import { logAudit } from '../lib/audit';
import { ROLE_META, AVAILABLE_PERMISSIONS } from '../lib/permissions';
import { initials } from '../lib/utils';
import { InviteUserModal } from '../components/team/InviteUserModal';

function timeAgo(iso: string | null): string {
  if (!iso) return 'mai';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h fa`;
  return `${Math.floor(h / 24)}g fa`;
}

const PRESET_COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#ec4899', name: 'Rose' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#ef4444', name: 'Red' },
];

export default function Team() {
  const canManage = useCan('team:manage');
  const { members, updateRole, setStatus, remove } = useTeamStore(
    useShallow((s) => ({ members: s.members, updateRole: s.updateRole, setStatus: s.setStatus, remove: s.remove }))
  );
  const { roles, addRole, updateRole: updateRoleStore, deleteRole } = useRoleStore(
    useShallow((s) => ({ roles: s.roles, addRole: s.addRole, updateRole: s.updateRole, deleteRole: s.deleteRole }))
  );
  const { groups, createGroup, deleteGroup } = useTeamGroupStore(
    useShallow((s) => ({ groups: s.groups, createGroup: s.createGroup, deleteGroup: s.deleteGroup }))
  );

  const [activeTab, setActiveTab] = useState<'members' | 'groups' | 'roles'>('members');
  const [showInvite, setShowInvite] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  // Form states for creating custom role
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('ceo');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ key: '', label: '', description: '', color: '#8b5cf6' });

  // Form states for creating team group
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ name: '', competence_area: '', leader_id: '', member_ids: [] as string[] });

  // Booking link copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyBookingLink = (id: string) => {
    const url = `${window.location.origin}/book/${id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
  };

  if (!canManage) return <Navigate to="/" replace />;

  const activeCount = members.filter((m) => m.status === 'active').length;
  const invitedCount = members.filter((m) => m.status === 'invited').length;

  const activeMembers = members.filter(m => m.status === 'active');

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.key || !newRoleForm.label) return;
    const cleanKey = newRoleForm.key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    addRole({
      key: cleanKey,
      label: newRoleForm.label,
      description: newRoleForm.description,
      color: newRoleForm.color,
      permissions: ['dashboard:view'],
      is_custom: true
    });
    logAudit('create', 'automation', `Ruolo ${newRoleForm.label}`);
    setSelectedRoleKey(cleanKey);
    setShowCreateRole(false);
    setNewRoleForm({ key: '', label: '', description: '', color: '#8b5cf6' });
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupForm.name || !newGroupForm.leader_id) return;
    createGroup(
      newGroupForm.name,
      newGroupForm.competence_area,
      newGroupForm.leader_id,
      newGroupForm.member_ids
    );
    logAudit('create', 'member', `Team ${newGroupForm.name}`);
    setShowCreateGroup(false);
    setNewGroupForm({ name: '', competence_area: '', leader_id: '', member_ids: [] });
  };

  const togglePermission = (roleKey: string, permKey: string) => {
    const roleDef = roles.find(r => r.key === roleKey);
    if (!roleDef || roleDef.key === 'superadmin') return;
    const isPresent = roleDef.permissions.includes(permKey);
    const newPerms = isPresent
      ? roleDef.permissions.filter(p => p !== permKey)
      : [...roleDef.permissions, permKey];
    updateRoleStore(roleKey, { permissions: newPerms });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users2 className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Gestione Team & Organizzazione</h1>
          <span className="text-sm text-surface-400 ml-1">
            {activeCount} attivi · {invitedCount} invitati
          </span>
        </div>
        {activeTab === 'members' && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors font-medium">
            <UserPlus size={15} /> Invita membro
          </button>
        )}
        {activeTab === 'roles' && (
          <button onClick={() => setShowCreateRole(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors font-medium">
            <Plus size={15} /> Crea Ruolo
          </button>
        )}
        {activeTab === 'groups' && (
          <button onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors font-medium">
            <Plus size={15} /> Crea Nuovo Team
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700 pb-px">
        {(['members', 'groups', 'roles'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all capitalize -mb-px ${
              activeTab === tab
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            {tab === 'members' && 'Membri Team'}
            {tab === 'groups' && 'Suddivisione Reparti / Team'}
            {tab === 'roles' && 'Ruoli e Permessi'}
          </button>
        ))}
      </div>

      {/* Tab content: MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Membro</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Ruolo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden md:table-cell">Stato</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden lg:table-cell">Ultima attività</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {members.map((m) => {
                const meta = ROLE_META[m.role] || { label: m.role, color: '#64748b' };
                const isOwner = m.id === 'tm-owner';
                return (
                  <tr key={m.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                             style={{ backgroundColor: meta.color }}>
                          {m.role === 'superadmin' ? <Shield size={14} /> : initials(m.first_name, m.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-surface-100">{m.first_name} {m.last_name}</p>
                          <p className="text-xs text-surface-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                              style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                          <Shield size={11} /> {meta.label}
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => { 
                            updateRole(m.id, e.target.value); 
                            logAudit('role_change', 'member', `${m.first_name} ${m.last_name}`, { role: e.target.value }); 
                          }}
                          className="text-xs rounded-md border border-surface-200 dark:border-surface-700
                                     bg-white dark:bg-surface-800 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-500/30"
                        >
                          {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-surface-400">{timeAgo(m.last_active_at)}</td>
                    <td className="px-4 py-3 relative">
                      <div className="flex items-center gap-1 justify-end">
                        {m.status === 'active' && (
                          <button
                            onClick={() => copyBookingLink(m.id)}
                            title="Copia link prenotazione appuntamenti"
                            className={`p-1 rounded transition-colors ${copiedId === m.id ? 'text-emerald-500' : 'text-surface-400 hover:text-brand-600'}`}
                          >
                            {copiedId === m.id ? <Check size={16} /> : <CalendarClock size={16} />}
                          </button>
                        )}
                        {!isOwner && (
                          <button onClick={() => setMenuId(menuId === m.id ? null : m.id)}
                            className="p-1 text-surface-400 hover:text-surface-600 rounded">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </div>
                      {menuId === m.id && (
                        <div className="absolute right-4 top-10 w-44 bg-white dark:bg-surface-900 rounded-lg border
                                        border-surface-200 dark:border-surface-700 shadow-lg py-1 z-20">
                          {m.status === 'active' ? (
                            <MenuBtn icon={<Ban size={13} />} label="Disattiva"
                              onClick={() => { setStatus(m.id, 'disabled'); logAudit('member_disable', 'member', `${m.first_name} ${m.last_name}`); setMenuId(null); }} />
                          ) : (
                            <MenuBtn icon={<CheckCircle2 size={13} />} label="Riattiva"
                              onClick={() => { setStatus(m.id, 'active'); logAudit('member_enable', 'member', `${m.first_name} ${m.last_name}`); setMenuId(null); }} />
                          )}
                          <MenuBtn icon={<Trash2 size={13} />} label="Rimuovi" danger
                            onClick={() => { if (confirm(`Rimuovere ${m.first_name}?`)) { remove(m.id); setMenuId(null); } }} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab content: GROUPS */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const leader = members.find(m => m.id === group.leader_id);
            const leaderMeta = leader ? (ROLE_META[leader.role] || { color: '#64748b' }) : null;
            return (
              <div key={group.id} className="bg-white dark:bg-surface-900 p-5 rounded-xl border border-surface-200 dark:border-surface-700 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-surface-900 dark:text-surface-50 flex items-center gap-1.5">
                      <Briefcase size={16} className="text-brand-500" />
                      {group.name}
                    </h3>
                    <p className="text-xs text-surface-400 mt-0.5">Area: <span className="font-semibold text-surface-600 dark:text-surface-300">{group.competence_area || 'Generica'}</span></p>
                  </div>
                  <button 
                    onClick={() => { if (confirm(`Rimuovere il team "${group.name}"?`)) deleteGroup(group.id); }}
                    className="p-1.5 text-surface-400 hover:text-risk-high hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Leader Section */}
                <div className="bg-surface-50 dark:bg-surface-800/40 p-3 rounded-lg border border-surface-100 dark:border-surface-800">
                  <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 mb-1.5">
                    <UserCheck size={11} /> Team Leader (Manager)
                  </span>
                  {leader ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                           style={{ backgroundColor: leaderMeta?.color }}>
                        {initials(leader.first_name, leader.last_name)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">{leader.first_name} {leader.last_name}</p>
                        <p className="text-[10px] text-surface-400">{leader.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400 italic">Nessun leader assegnato</p>
                  )}
                </div>

                {/* Subordinates Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-surface-500">Membri del Team (Subordinati)</span>
                  {group.member_ids.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {group.member_ids.map(mid => {
                        const m = members.find(u => u.id === mid);
                        if (!m) return null;
                        const mmMeta = ROLE_META[m.role] || { color: '#64748b' };
                        return (
                          <div key={mid} className="flex items-center justify-between text-xs p-2 bg-surface-50 dark:bg-surface-900 rounded border border-surface-100 dark:border-surface-800">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0"
                                   style={{ backgroundColor: mmMeta.color }}>
                                {initials(m.first_name, m.last_name)}
                              </div>
                              <span className="font-medium text-surface-700 dark:text-surface-300">{m.first_name} {m.last_name}</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded">
                              {mmMeta.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400 italic">Nessun subordinato in questo reparto</p>
                  )}
                </div>
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="col-span-2 text-center py-10 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700">
              <Users2 className="mx-auto text-surface-300 mb-2" size={32} />
              <p className="text-sm text-surface-500">Nessun team o reparto configurato.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab content: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles list */}
          <div className="lg:col-span-1 bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-700 space-y-2">
            <h3 className="text-xs uppercase font-bold text-surface-400 mb-3 tracking-wide">Elenco Ruoli</h3>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setSelectedRoleKey(r.key)}
                  className={`w-full flex items-center justify-between text-left p-3 rounded-lg border transition-all ${
                    selectedRoleKey === r.key
                      ? 'border-brand-500 bg-brand-500/5 shadow-sm'
                      : 'border-surface-150 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-surface-900 dark:text-surface-100">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      {r.label}
                    </div>
                    <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-0.5 line-clamp-1">{r.description}</p>
                  </div>
                  {r.is_custom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Eliminare il ruolo ${r.label}? Tutti i membri con questo ruolo torneranno a commerciali.`)) {
                          deleteRole(r.key);
                          setSelectedRoleKey('ceo');
                        }
                      }}
                      className="text-surface-400 hover:text-risk-high p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="lg:col-span-2 bg-white dark:bg-surface-900 p-5 rounded-xl border border-surface-200 dark:border-surface-700 space-y-4">
            {(() => {
              const currentRoleDef = roles.find(r => r.key === selectedRoleKey) || roles[0];
              const isSuper = currentRoleDef.key === 'superadmin';
              
              return (
                <>
                  <div className="border-b border-surface-100 dark:border-surface-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: currentRoleDef.color }} />
                      <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">{currentRoleDef.label}</h3>
                    </div>
                    <p className="text-xs text-surface-400 mt-1">{currentRoleDef.description}</p>
                  </div>

                  {isSuper ? (
                    <div className="flex items-start gap-3 bg-brand-500/10 rounded-lg p-4 border border-brand-500/20 text-brand-700 dark:text-brand-400">
                      <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold">Ruolo Root di Sistema</p>
                        <p className="mt-1 opacity-90 leading-relaxed">
                          Il ruolo <strong>Superadmin</strong> possiede per definizione la wildcard di controllo totale <code>*</code>. Non è possibile rimuovere o modificare le sue autorizzazioni per motivi di sicurezza del sistema.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category))).map((cat) => (
                        <div key={cat} className="space-y-2">
                          <h4 className="text-[10px] uppercase font-bold text-surface-400 border-b border-surface-100 dark:border-surface-800 pb-1">{cat}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {AVAILABLE_PERMISSIONS.filter(p => p.category === cat).map((perm) => {
                              const checked = currentRoleDef.permissions.includes(perm.key);
                              return (
                                <label key={perm.key} className="flex items-start gap-2.5 p-2 rounded hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors cursor-pointer text-xs">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(currentRoleDef.key, perm.key)}
                                    className="mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                                  />
                                  <div>
                                    <span className="font-semibold text-surface-800 dark:text-surface-200">{perm.label}</span>
                                    <span className="block text-[10px] text-surface-400 font-mono mt-0.5">{perm.key}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Invite member Modal */}
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}

      {/* Create Custom Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateRole(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-1.5">
              <Settings2 size={16} className="text-brand-500" />
              Crea Ruolo Personalizzato
            </h2>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Codice Identificativo (Unico, minuscolo, senza spazi)</label>
                <input
                  required
                  placeholder="es. lead_commerciale"
                  value={newRoleForm.key}
                  onChange={(e) => setNewRoleForm(f => ({ ...f, key: e.target.value }))}
                  className="auth-input font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Nome Ruolo (Label visualizzato)</label>
                <input
                  required
                  placeholder="es. Lead Commerciale"
                  value={newRoleForm.label}
                  onChange={(e) => setNewRoleForm(f => ({ ...f, label: e.target.value }))}
                  className="auth-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Descrizione del ruolo</label>
                <input
                  required
                  placeholder="es. Supervisiona le vendite e gestisce il budget commerciale"
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm(f => ({ ...f, description: e.target.value }))}
                  className="auth-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Colore Rappresentativo</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewRoleForm(f => ({ ...f, color: c.hex }))}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        newRoleForm.color === c.hex ? 'border-surface-900 scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateRole(false)} className="px-4 py-2 text-xs text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">Annulla</button>
                <button type="submit" className="px-4 py-2 text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg">Salva Ruolo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateGroup(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-1.5">
              <Users2 size={16} className="text-brand-500" />
              Crea Reparto / Team
            </h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Nome Team</label>
                <input
                  required
                  placeholder="es. Team Vendite Nord"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm(f => ({ ...f, name: e.target.value }))}
                  className="auth-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Area di Competenza</label>
                <input
                  required
                  placeholder="es. B2B Sales, Assistenza Server, Supporto Amministrativo"
                  value={newGroupForm.competence_area}
                  onChange={(e) => setNewGroupForm(f => ({ ...f, competence_area: e.target.value }))}
                  className="auth-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Team Leader (Responsabile)</label>
                <select
                  required
                  value={newGroupForm.leader_id}
                  onChange={(e) => setNewGroupForm(f => ({ ...f, leader_id: e.target.value }))}
                  className="auth-input"
                >
                  <option value="">Seleziona un leader...</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-2">Membri del Team (Subordinati)</label>
                <div className="max-h-40 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-lg p-2.5 space-y-1.5">
                  {activeMembers
                    .filter(m => m.id !== newGroupForm.leader_id)
                    .map((m) => {
                      const checked = newGroupForm.member_ids.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-surface-50 dark:hover:bg-surface-850">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const updated = checked
                                ? newGroupForm.member_ids.filter(id => id !== m.id)
                                : [...newGroupForm.member_ids, m.id];
                              setNewGroupForm(f => ({ ...f, member_ids: updated }));
                            }}
                            className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span>{m.first_name} {m.last_name}</span>
                        </label>
                      );
                    })}
                  {activeMembers.filter(m => m.id !== newGroupForm.leader_id).length === 0 && (
                    <p className="text-xs text-surface-400 italic">Nessun altro utente attivo disponibile</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateGroup(false)} className="px-4 py-2 text-xs text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">Annulla</button>
                <button type="submit" className="px-4 py-2 text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg font-semibold">Salva Team</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'invited' | 'disabled' }) {
  const map = {
    active:   { label: 'Attivo',    color: '#22c55e', icon: <CheckCircle2 size={11} /> },
    invited:  { label: 'Invitato',  color: '#f59e0b', icon: <Clock size={11} /> },
    disabled: { label: 'Disattivo', color: '#94a3b8', icon: <Ban size={11} /> },
  }[status];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: `${map.color}20`, color: map.color }}>
      {map.icon} {map.label}
    </span>
  );
}

function MenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface-50 dark:hover:bg-surface-800
                  ${danger ? 'text-risk-high' : 'text-surface-700 dark:text-surface-300'}`}>
      {icon} {label}
    </button>
  );
}
