'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  RiDashboardLine, RiGroupLine, RiMapPinLine, RiBarChartLine,
  RiDatabase2Line, RiSettings3Line, RiLogoutBoxLine, RiMenuLine,
  RiWalkLine, RiShoppingCartLine, RiTimeLine, RiArchiveLine, RiTruckLine, RiShieldLine,
} from 'react-icons/ri';
import { useState } from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: RiDashboardLine },
  { href: '/team', label: 'Equipo', icon: RiGroupLine },
  { href: '/live-map', label: 'Mapa en Vivo', icon: RiMapPinLine },
  { type: 'divider', label: 'Reportes' },
  { href: '/reports/visits', label: 'Visitas', icon: RiWalkLine },
  { href: '/reports/orders', label: 'Pedidos', icon: RiShoppingCartLine },
  { href: '/reports/attendance', label: 'Asistencia', icon: RiTimeLine },
  { href: '/reports/inventory', label: 'Inventario', icon: RiArchiveLine },
  { href: '/reports/courier', label: 'Courier', icon: RiTruckLine },
  { href: '/reports/guard', label: 'Guardia', icon: RiShieldLine },
  { type: 'divider', label: 'Configuración' },
  { href: '/metadata', label: 'Datos Maestros', icon: RiDatabase2Line },
  { href: '/configuration', label: 'Configuración', icon: RiSettings3Line },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`bg-gray-900 text-white min-h-screen transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && <h1 className="text-lg font-bold text-green-400">{user?.companyName || 'Portal Cliente'}</h1>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-700 rounded"><RiMenuLine size={20} /></button>
      </div>

      <nav className="flex-1 py-2 overflow-auto">
        {menuItems.map((item, i) => {
          if (item.type === 'divider') {
            return !collapsed ? <div key={i} className="px-4 py-2 text-xs text-gray-500 uppercase mt-2">{item.label}</div> : <div key={i} className="border-t border-gray-700 my-2" />;
          }
          const isActive = pathname.startsWith(item.href!);
          return (
            <Link key={item.href} href={item.href!} className={`flex items-center gap-3 px-4 py-2.5 transition-colors text-sm ${isActive ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
              {item.icon && <item.icon size={18} />}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-4">
        {!collapsed && <div className="mb-2 text-sm text-gray-400"><p className="font-medium text-white">{user?.firstName} {user?.lastName}</p><p>Admin de Empresa</p></div>}
        <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 w-full"><RiLogoutBoxLine size={20} />{!collapsed && <span>Cerrar Sesión</span>}</button>
      </div>
    </aside>
  );
}
