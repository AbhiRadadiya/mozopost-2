'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminIndex() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/superadmin/risk-dashboard'); }, [router]);
  return (
    <div className="flex items-center justify-center py-20 text-sm text-[#94A3B8]">
      Redirecting to Risk Dashboard…
    </div>
  );
}
