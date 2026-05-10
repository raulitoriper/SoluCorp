'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => { loadFromStorage(); setReady(true); }, [loadFromStorage]);

  useEffect(() => {
    if (ready && !user) router.push('/login');
    if (ready && user && user.role !== 'COMPANY_ADMIN') {
      alert('Acceso denegado. Solo administradores de empresa.');
      localStorage.clear();
      router.push('/login');
    }
  }, [ready, user, router]);

  if (!ready || !user) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  return <>{children}</>;
}
