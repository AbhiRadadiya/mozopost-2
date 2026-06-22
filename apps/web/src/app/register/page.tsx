'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { apiErrorMessage } from '@/lib/api';
import { Btn, Field, Input } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    gstin: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] p-4">
      <div className="nb-card w-full max-w-md p-6">
        <h1 className="mb-4 text-xl font-bold">Create your seller account</h1>
        <form onSubmit={handleSubmit}>
          <Field label="Business name" required>
            <Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </Field>
          </div>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" required>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} required maxLength={10} />
            </Field>
            <Field label="GSTIN">
              <Input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} />
            </Field>
          </div>
          <Field label="Password" required>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={8}
            />
          </Field>

          {error && (
            <div className="mb-3 border-2 border-black bg-c2 px-3 py-2 text-xs font-bold text-white">
              ⚠ {error}
            </div>
          )}

          <Btn type="submit" variant="success" disabled={loading} className="w-full justify-center py-2.5">
            {loading ? 'Creating account...' : 'Create Account'}
          </Btn>
        </form>
        <div className="mt-4 text-center text-xs">
          Already have an account?{' '}
          <Link href="/login" className="font-bold underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
