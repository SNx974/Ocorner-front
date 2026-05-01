'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Package, FolderOpen, Clock, LogOut, ChevronRight, Cake, Users, ImageIcon } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token = localStorage.getItem('ocorner_token');
    const u = localStorage.getItem('ocorner_user');
    if (!token || !u) {
      router.push('/admin/login');
      return;
    }
    setUser(JSON.parse(u));
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem('ocorner_token');
    localStorage.removeItem('ocorner_user');
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') return <>{children}</>;
  if (!user) return null;

  const nav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Produits', icon: Package },
    { href: '/admin/categories', label: 'Catégories', icon: FolderOpen },
    ...(user.role === 'ADMIN' ? [{ href: '/admin/happyhour', label: 'Happy Hour', icon: Clock }] : []),
    { href: '/admin/birthdays', label: 'Anniversaires', icon: Cake },
    { href: '/admin/futsal', label: 'Futsal — Réservations', icon: Users },
    ...(user.role === 'ADMIN' ? [{ href: '/admin/annonces', label: 'Annonces Physiques', icon: ImageIcon }] : []),
  ];

  return (
    <div className="min-h-screen bg-night flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white/3 border-r border-white/10 flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <Image src="/OCORNER.png" alt="OCORNER" width={130} height={44} className="object-contain" />
          <p className="text-white/30 text-xs mt-1">Admin</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group
                ${pathname === href
                  ? 'bg-brand-gradient text-night'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
            >
              <Icon size={16} />
              {label}
              {pathname === href && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-3 mb-2">
            <p className="text-white/80 text-sm font-medium">{user.username}</p>
            <span className="text-xs px-2 py-0.5 bg-teal/20 text-teal rounded-full">{user.role}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-colors"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
