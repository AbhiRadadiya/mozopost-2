'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

const ALL_PERMISSIONS = [
  { group:'Merchants', perms:['view_merchants','create_merchants','edit_merchants','delete_merchants','approve_merchants'] },
  { group:'Orders',    perms:['view_orders','create_orders','edit_orders','cancel_orders'] },
  { group:'Finance',   perms:['view_wallet','adjust_wallet','export_wallet','view_credit','manage_credit','view_cod','release_cod'] },
  { group:'Disputes',  perms:['view_disputes','resolve_disputes','refund_disputes'] },
  { group:'NDR',       perms:['view_ndr','resolve_ndr'] },
  { group:'Reports',   perms:['view_reports','export_reports'] },
  { group:'Couriers',  perms:['view_couriers','manage_couriers','manage_rate_cards'] },
  { group:'Staff',     perms:['view_staff','manage_staff'] },
  { group:'System',    perms:['view_global_settings','edit_global_settings','view_audit_logs'] },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [newRole, setNewRole] = useState({ name:'', displayName:'', description:'' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/roles');
      setRoles(data.roles);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  function startEdit(role: any) {
    setSelected(role);
    setEditPerms(role.permissions || []);
    setEditing(true);
  }

  function togglePerm(perm: string) {
    setEditPerms(p => p.includes(perm) ? p.filter(x => x!==perm) : [...p, perm]);
  }

  async function savePerms() {
    if (!selected) return;
    try {
      await api.patch(`/super-admin/roles/${selected.id}`, { permissions: editPerms });
      setEditing(false); setSelected(null);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/super-admin/roles', { ...newRole, permissions: editPerms });
      setNewRole({ name:'', displayName:'', description:'' }); setEditPerms([]);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setCreating(false); }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">User Roles & Permissions <Badge color="bg-c2 text-white">SUPER ADMIN</Badge></h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="mb-3 font-bold">System Roles</h2>
          {loading ? <div className="text-sm">Loading...</div>
          : (roles||[]).map((r: any) => (
            <div key={r.id} className={`nb-card p-3 mb-2 ${r.is_system ? 'border-l-4 border-l-c4' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-sm">{r.display_name}</div>
                  <div className="font-mono-nb text-[9px] text-[#777]">{r.name}</div>
                  <div className="text-xs text-[#555] mt-1">{r.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(r.permissions||[]).slice(0,4).map((p: string) => (
                      <span key={p} className="font-mono-nb text-[8px] border border-[#000] px-1.5 py-0.5 bg-c5">{p.replace(/_/g,' ')}</span>
                    ))}
                    {(r.permissions||[]).length > 4 && (
                      <span className="font-mono-nb text-[8px] text-[#777]">+{(r.permissions||[]).length-4} more</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Btn variant="default" onClick={() => startEdit(r)}>✏ Edit</Btn>
                  {!r.is_system && <Btn variant="danger">🗑</Btn>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          {editing && selected ? (
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">Edit Permissions: {selected.display_name}</span></CardHead>
              <div className="p-4 max-h-96 overflow-y-auto">
                {ALL_PERMISSIONS.map(group => (
                  <div key={group.group} className="mb-3">
                    <div className="font-bold text-xs mb-1.5 text-[#555] uppercase">{group.group}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.perms.map(perm => (
                        <button key={perm} onClick={() => togglePerm(perm)}
                          className={`border-2 border-black px-2.5 py-1 text-[9px] font-bold font-mono-nb transition-all ${
                            editPerms.includes(perm) ? 'bg-c3 shadow-nb-sm' : 'bg-white text-[#777]'
                          }`}>
                          {perm.replace(/_/g,' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t-2 border-black p-3">
                <Btn variant="success" onClick={savePerms}>✓ Save Permissions</Btn>
                <Btn variant="default" onClick={() => setEditing(false)}>Cancel</Btn>
                <span className="font-mono-nb text-xs text-[#777] self-center">{editPerms.length} permissions</span>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">+ Create New Role</span></CardHead>
              <form onSubmit={createRole} className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Role name (slug)" required><Input value={newRole.name} onChange={e => setNewRole(p=>({...p,name:e.target.value}))} placeholder="e.g. billing_manager" required /></Field>
                  <Field label="Display name" required><Input value={newRole.displayName} onChange={e => setNewRole(p=>({...p,displayName:e.target.value}))} placeholder="e.g. Billing Manager" required /></Field>
                </div>
                <Field label="Description"><Input value={newRole.description} onChange={e => setNewRole(p=>({...p,description:e.target.value}))} /></Field>
                <div className="mb-3">
                  <label className="font-mono-nb mb-1.5 block text-[9px] font-bold uppercase">Select Permissions</label>
                  {ALL_PERMISSIONS.map(group => (
                    <div key={group.group} className="mb-2">
                      <div className="font-bold text-[10px] mb-1 text-[#555]">{group.group}</div>
                      <div className="flex flex-wrap gap-1">
                        {group.perms.map(perm => (
                          <button key={perm} type="button" onClick={() => togglePerm(perm)}
                            className={`border-2 border-black px-2 py-0.5 text-[8px] font-bold font-mono-nb ${editPerms.includes(perm)?'bg-c3':'bg-white text-[#999]'}`}>
                            {perm.replace(/_/g,' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Btn type="submit" variant="success" disabled={creating} className="w-full justify-center">
                  {creating ? 'Creating...' : '+ Create Role'}
                </Btn>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
