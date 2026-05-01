'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard, Package, FolderOpen, Clock, LogOut, ChevronRight,
  Cake, Users, ImageIcon, QrCode, Shield, Menu, X, ChefHat
} from 'lucide-react';

type Role = 'ADMIN' | 'CUISINE' | 'BAR';

interface NavItem { href: string; label: string; icon: React.ElementType; roles: Role[]; }

const ALL_NAV: NavItem[] = [
  { href: '/admin',                 label: 'Dashboard',            icon: LayoutDashboard, roles: ['ADMIN'] },
  { href: '/admin/cuisine',         label: 'Cuisine',              icon: ChefHat,         roles: ['CUISINE'] },
  { href: '/admin/products',        label: 'Produits',             icon: Package,         roles: ['ADMIN'] },
  { href: '/admin/cuisine',         label: 'Produits',             icon: Package,         roles: ['BAR'] },
  { href: '/admin/categories',      label: 'Catégories',           icon: FolderOpen,      roles: ['ADMIN'] },
  { href: '/admin/happyhour',       label: 'Happy Hour',           icon: Clock,           roles: ['ADMIN'] },
  { href: '/admin/birthdays',       label: 'Anniversaires',        icon: Cake,            roles: ['ADMIN', 'BAR'] },
  { href: '/admin/futsal',          label: 'Futsal — Réservations',icon: Users,           roles: ['ADMIN', 'BAR'] },
  { href: '/admin/futsal-sessions', label: 'Sessions Futsal',      icon: Shield,          roles: ['ADMIN', 'BAR'] },
  { href: '/admin/annonces',        label: 'Annonces Physiques',   icon: ImageIcon,       roles: ['ADMIN'] },
  { href: '/admin/qrcode',          label: 'QR Code Menu',         icon: QrCode,          roles: ['ADMIN'] },
];

// Page d'accueil par rôle après login
export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN:   '/admin',
  CUISINE: '/admin/cuisine',
  BAR:     '/admin/birthdays',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]           = useState<{ username: string; role: Role } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token = localStorage.getItem('ocorner_token');
    const u     = localStorage.getItem('ocorner_user');
    if (!token || !u) { router.push('/admin/login'); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
  }, [pathname, router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const logout = () => {
    localStorage.removeItem('ocorner_token');
    localStorage.removeItem('ocorner_user');
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') return <>{children}</>;
  if (!user) return null;

  const nav = ALL_NAV.filter(item => item.roles.includes(user.role));

  // Rôle couleur
  const roleColor: Record<Role, string> = {
    ADMIN:   'bg-teal/20 text-teal',
    CUISINE: 'bg-orange-500/20 text-orange-400',
    BAR:     'bg-purple-500/20 text-purple-400',
  };

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <Image src="/OCORNER.png" alt="OCORNER" width={110} height={38} className="object-contain" />
          <p className="text-white/30 text-xs mt-1">Admin</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              pathname === href || (href !== '/admin' && pathname.startsWith(href))
                ? 'bg-brand-gradient text-night'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}>
            <Icon size={16} />
            {label}
            {(pathname === href || (href !== '/admin' && pathname.startsWith(href))) && <ChevronRight size={14} className="ml-auto" />}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="px-4 py-3 mb-2">
          <p className="text-white/80 text-sm font-medium">{user.username}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[user.role]}`}>{user.role}</span>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-colors">
          <LogOut size={14} /> Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-night flex">

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 bg-white/3 border-r border-white/10 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar mobile drawer */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0d1024] border-r border-white/10 flex flex-col z-50 transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1024] border-b border-white/10 shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10">
            <Menu size={22} />
          </button>
          <Image src="/OCORNER.png" alt="OCORNER" width={90} height={30} className="object-contain" />
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[user.role]}`}>{user.role}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
