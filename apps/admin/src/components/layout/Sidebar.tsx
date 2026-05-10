'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { RiDashboardLine, RiBuildingLine, RiGroupLine, RiGlobalLine, RiSettings3Line, RiLogoutBoxLine, RiMenuLine } from 'react-icons/ri';
import { useState } from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: RiDashboardLine },
  { href: '/clients', label: 'Empresas', icon: RiBuildingLine },
  { href: '/users', label: 'Admins SoluCorp', icon: RiGroupLine },
  { href: '/monitoring', label: 'Monitoreo', icon: RiGlobalLine },
  { href: '/settings', label: 'Configuración', icon: RiSettings3Line },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`bg-gray-900 text-white min-h-screen transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && <h1 className="text-lg font-bold text-blue-400">SoluCorp Admin</h1>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-700 rounded"><RiMenuLine size={20} /></button>
      </div>

      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-4">
        {!collapsed && <div className="mb-2 text-sm text-gray-400"><p className="font-medium text-white">{user?.firstName} {user?.lastName}</p><p>Super Administrador</p></div>}
        <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 w-full"><RiLogoutBoxLine size={20} />{!collapsed && <span>Cerrar Sesión</span>}</button>
      </div>
    </aside>
  );
}
