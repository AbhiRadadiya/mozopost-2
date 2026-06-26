'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

const ROLE_STYLE: Record<string, string> = {
  super_admin:  'bg-[#FEE2E2] text-[#991B1B]',
  master_admin: 'bg-[#EEF2FF] text-[#4F46E5]',
  staff:        'bg-[#F1F5F9] text-[#475569]',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', phone: '', password: '', role: 'master_admin' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
      setSuccess(`Staff member ${form.email} added successfully`);
      setForm({ email: '', firstName: '', lastName: '', phone: '', password: '', role: 'master_admin' });
      setShowForm(false);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    try {
      await api.patch(`/admin/staff/${id}/status`, { status: currentStatus === 'active' ? 'inactive' : 'active' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Staff Management</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage admin and staff access to the platform.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm">
          + Add Staff Member
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">✓ {success}</div>}

      {/* Add Staff Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">Add New Staff Member</h2>
          </div>
          <form onSubmit={addStaff} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">First Name *</label>
                <input required value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Last Name</label>
                <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Email *</label>
              <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Phone</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Role *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10">
                  <option value="master_admin">Master Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Temporary Password * (min 8 chars)</label>
              <input type="password" required minLength={8} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" />
            </div>
            <div className="flex gap-3 pt-2 border-t border-[#F1F5F9]">
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50">
                {submitting ? 'Adding...' : '+ Add Staff Member'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
          <h2 className="text-sm font-bold text-[#0F172A]">All Staff Members</h2>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">👤</div>
            <div className="text-sm font-semibold text-[#0F172A]">No staff members yet</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Name</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Role</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Last Login</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-[#F8F9FB] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(s.first_name || s.email || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#0F172A]">{s.first_name} {s.last_name}</div>
                        <div className="text-xs text-[#94A3B8]">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_STYLE[s.role] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                      {s.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.status === 'active' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#F1F5F9] text-[#475569]'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B]">
                    {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleStatus(s.id, s.status)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${s.status === 'active' ? 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]' : 'bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]'}`}
                    >
                      {s.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
