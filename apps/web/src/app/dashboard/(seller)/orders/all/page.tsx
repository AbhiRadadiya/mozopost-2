'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /dashboard/orders/all now redirects to the unified /dashboard/orders module
export default function AllOrdersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/orders'); }, [router]);
  return (
    <div className="flex items-center justify-center py-20 text-sm text-[#94A3B8]">
      Redirecting to Orders...
    </div>
  );
}
