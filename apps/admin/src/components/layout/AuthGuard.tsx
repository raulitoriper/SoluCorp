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
    if (ready && user && user.role !== 'SUPER_ADMIN') {
      const target =
        user.role === 'COMPANY_ADMIN'
          ? 'el portal de empresa'
          : 'la app móvil';
      alert(
        `Este portal es solo para administradores de SoluCorp (SUPER_ADMIN). Tu rol "${user.role}" debe acceder desde ${target}.`,
      );
      localStorage.clear();
      router.push('/login');
    }
  }, [ready, user, router]);

  if (!ready || !user) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>;
  return <>{children}</>;
}
