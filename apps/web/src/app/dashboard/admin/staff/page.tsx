'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ email:'', firstName:'', lastName:'', phone:'', password:'', role:'master_admin' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/staff');
      setStaff(data.staff);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/admin/staff', form);
      setSuccess(`Staff member ${form.email} added`);
      setForm({ email:'', firstName:'', lastName:'', phone:'', password:'', role:'master_admin' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    try {
      await api.patch(`/admin/staff/${id}/status`, { status: currentStatus==='active' ? 'inactive' : 'active' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  const ROLE_COLOR: Record<string,string> = { super_admin:'bg-c2 text-white', master_admin:'bg-c4', staff:'bg-c5' };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Staff Management</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">All Staff</span></CardHead>
          {loading ? <div className="p-4 text-sm">Loading...</div>
          : staff.length === 0 ? <div className="p-4 text-sm text-[#777]">No staff yet.</div>
          : (
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Name</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Role</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Last Login</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
              </tr></thead><tbody>
                {staff.map((s:any) => (
                  <tr key={s.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2"><div className="font-bold">{s.first_name} {s.last_name}</div><div className="text-[10px] text-[#777]">{s.email}</div></td>
                    <td className="px-3 py-2"><Badge color={ROLE_COLOR[s.role]||'bg-c5'}>{s.role.replace('_',' ')}</Badge></td>
                    <td className="px-3 py-2"><Badge color={s.status==='active'?'bg-c3':'bg-[#999] text-white'}>{s.status}</Badge></td>
                    <td className="px-3 py-2 text-[#777]">{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-3 py-2">
                      <Btn variant={s.status==='active'?'danger':'success'} onClick={() => toggleStatus(s.id, s.status)}>
                        {s.status==='active'?'Deactivate':'Activate'}
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </Card>

        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">Add Staff Member</span></CardHead>
          <form onSubmit={addStaff} className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required><Input value={form.firstName} onChange={e => setForm(p=>({...p,firstName:e.target.value}))} required /></Field>
              <Field label="Last name"><Input value={form.lastName} onChange={e => setForm(p=>({...p,lastName:e.target.value}))} /></Field>
            </div>
            <Field label="Email" required><Input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><Input value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} /></Field>
              <Field label="Role" required>
                <select className="nb-input w-full" value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
                  <option value="master_admin">Master Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </Field>
            </div>
            <Field label="Temporary password" required><Input type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} minLength={8} required placeholder="Min 8 characters" /></Field>
            {error && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">⚠ {error}</div>}
            {success && <div className="mb-3 border-2 border-black bg-c3 p-2 text-xs font-bold">✓ {success}</div>}
            <Btn type="submit" variant="success" disabled={submitting} className="w-full justify-center">
              {submitting ? 'Adding...' : '+ Add Staff Member'}
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}
