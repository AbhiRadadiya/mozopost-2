'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Input, Field, Badge } from '@/components/ui';
import { PageHeader, Toast, ErrorBar } from '../_shared';

function parsePerms(p: any): string[] {
  if (Array.isArray(p)) return p;
  if (!p) return [];
  try { return JSON.parse(p); } catch { return []; }
}

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/super-admin/roles'); setRoles(data.roles || []); setAllPerms(data.availablePermissions || []); }
    catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePerm = (p: string) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  function startEdit(r: any) { setEditing(r.id); setCreating(false); setPerms(parsePerms(r.permissions)); }
  async function saveEdit(id: string) {
    setBusy(true);
    try { await api.patch(`/super-admin/roles/${id}`, { permissions: perms }); flash('Role updated'); setEditing(null); load(); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function createRole() {
    if (!newName.trim() || !newDisplay.trim()) return;
    setBusy(true);
    try {
      await api.post('/super-admin/roles', { name: newName.trim().toLowerCase().replace(/\s+/g, '_'), displayName: newDisplay.trim(), permissions: perms });
      flash('Role created'); setCreating(false); setNewName(''); setNewDisplay(''); setPerms([]); load();
    } catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function del(r: any) {
    if (r.is_system) { setErr('Cannot delete a system role'); return; }
    if (!window.confirm(`Delete role "${r.display_name}"?`)) return;
    try { await api.delete(`/super-admin/roles/${r.id}`); flash('Role deleted'); load(); }
    catch (e) { setErr(apiErrorMessage(e)); }
  }

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Define what each staff role can access"
        action={<Btn variant="primary" onClick={() => { setCreating(!creating); setEditing(null); setPerms([]); }}>{creating ? 'Cancel' : '+ New Role'}</Btn>} />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      {creating && (
        <Card className="mb-4">
          <CardHead><span className="font-bold text-[#0F172A]">Create Custom Role</span></CardHead>
          <div className="p-5">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Role Key" required><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="finance_manager" /></Field>
              <Field label="Display Name" required><Input value={newDisplay} onChange={e => setNewDisplay(e.target.value)} placeholder="Finance Manager" /></Field>
            </div>
            <div className="mb-2 font-mono-nb text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Permissions ({perms.length})</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {allPerms.map((p: string) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E8EF] px-2.5 py-1.5 text-xs hover:bg-[#F8FAFC]">
                  <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="accent-[#7C3AED]" />
                  <span className="font-mono-nb text-[#475569]">{p}</span>
                </label>
              ))}
            </div>
            <div className="mt-4"><Btn variant="success" disabled={busy} onClick={createRole}>Create Role</Btn></div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-[#94A3B8]">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {roles.map((r: any) => {
            const rolePerms = parsePerms(r.permissions);
            return (
              <Card key={r.id}>
                <CardHead>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A]">{r.display_name}</span>
                    {r.is_system && <Badge className="bg-[#EDE9FE] text-[#5B21B6]">system</Badge>}
                  </div>
                  <div className="flex gap-2">
                    {editing === r.id
                      ? <>
                          <button onClick={() => saveEdit(r.id)} disabled={busy} className="rounded-md bg-[#D1FAE5] px-2.5 py-1 text-[11px] font-semibold text-[#065F46]">Save</button>
                          <button onClick={() => setEditing(null)} className="rounded-md border border-[#E5E8EF] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Cancel</button>
                        </>
                      : <>
                          <button onClick={() => startEdit(r)} className="rounded-md border border-[#E5E8EF] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Edit</button>
                          {!r.is_system && <button onClick={() => del(r)} className="rounded-md bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#991B1B]">Delete</button>}
                        </>}
                  </div>
                </CardHead>
                <div className="p-4">
                  {editing === r.id ? (
                    <div className="grid grid-cols-2 gap-2">
                      {allPerms.map((p: string) => (
                        <label key={p} className="flex cursor-pointer items-center gap-2 rounded border border-[#E5E8EF] px-2 py-1 text-[11px] hover:bg-[#F8FAFC]">
                          <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="accent-[#7C3AED]" />
                          <span className="font-mono-nb text-[#475569]">{p}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rolePerms.length === 0 && <span className="text-xs text-[#CBD5E1]">No permissions</span>}
                      {rolePerms.map((p: string, i: number) => (
                        <span key={i} className="rounded bg-[#F1F5F9] px-2 py-0.5 font-mono-nb text-[10px] text-[#475569]">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
