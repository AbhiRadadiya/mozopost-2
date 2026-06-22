'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { apiErrorMessage } from '@/lib/api';
import { Btn, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const [email, setEmail] = useState('seller@demo.com');
  const [password, setPassword] = useState('Demo@1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      
      const allowedRole = process.env.NEXT_PUBLIC_APP_ROLE;
      if (allowedRole) {
        // admin role covers both master_admin and super_admin for backward compatibility check
        // Or if allowedRole === 'superadmin', require exactly super_admin.
        // Let's normalize it.
        const isSellerPortal = allowedRole === 'seller';
        const isAdminPortal = allowedRole === 'admin';
        const isSuperadminPortal = allowedRole === 'superadmin';
        
        const isUserSeller = user.role === 'seller';
        const isUserAdmin = user.role === 'master_admin';
        const isUserSuperadmin = user.role === 'super_admin';

        let authorized = false;
        if (isSellerPortal && isUserSeller) authorized = true;
        if (isAdminPortal && (isUserAdmin || isUserSuperadmin)) authorized = true; // Admins and Superadmins can access admin portal
        if (isSuperadminPortal && isUserSuperadmin) authorized = true;

        if (!authorized) {
          logout();
          let roleName = allowedRole;
          if (allowedRole === 'admin') roleName = 'Admins';
          else if (allowedRole === 'superadmin') roleName = 'Super Admins';
          else if (allowedRole === 'seller') roleName = 'Sellers';
          throw new Error(`Unauthorized: This portal is restricted to ${roleName}.`);
        }
      }

      if (user.role === 'seller') router.push('/dashboard');
      else router.push('/dashboard/admin');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] p-4">
      <div className="nb-card w-full max-w-sm p-6">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-c3 font-bold shadow-nb-sm">
            M
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">Mozopost</div>
            <div className="font-mono-nb text-[9px] text-[#888]">SHIPPING AGGREGATOR</div>
          </div>
        </div>
        <h1 className="mb-4 mt-4 text-xl font-bold">Sign in</h1>

        <form onSubmit={handleSubmit}>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" required>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          {error && (
            <div className="mb-3 border-2 border-black bg-c2 px-3 py-2 text-xs font-bold text-white">
              ⚠ {error}
            </div>
          )}

          <Btn type="submit" variant="dark" disabled={loading} className="w-full justify-center py-2.5">
            {loading ? 'Signing in...' : 'Sign In'}
          </Btn>
        </form>

        <div className="mt-4 border-2 border-black bg-c5 p-3 text-[11px]">
          <strong>Demo accounts</strong> (password: <code className="font-mono-nb">Demo@1234</code>)
          <div className="font-mono-nb mt-1">seller@demo.com · admin@demo.com · superadmin@demo.com</div>
        </div>

        <div className="mt-4 text-center text-xs">
          New seller?{' '}
          <Link href="/register" className="font-bold underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
