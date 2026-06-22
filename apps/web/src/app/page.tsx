'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf0]">
      <div className="font-mono-nb text-sm font-bold">Loading Mozopost...</div>
    </div>
  );
}
