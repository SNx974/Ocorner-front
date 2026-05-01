'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Package, FolderOpen, Eye, EyeOff, QrCode, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import QRCode from 'qrcode';

export default function DashboardPage() {
  const [stats, setStats] = useState({ products: 0, visible: 0, hidden: 0, categories: 0 });
  const [qrUrl, setQrUrl] = useState('');

  const fetchStats = useCallback(async () => {
    const [products, categories] = await Promise.all([
      api.get('/api/products?all=1'),
      api.get('/api/categories?all=1'),
    ]);
    setStats({
      products: products.length,
      visible: products.filter((p: { visible: boolean }) => p.visible).length,
      hidden: products.filter((p: { visible: boolean }) => !p.visible).length,
      categories: categories.length,
    });
  }, []);

  useEffect(() => {
    fetchStats();
    const menuUrl = typeof window !== 'undefined' ? window.location.origin : '';
    QRCode.toDataURL(menuUrl, { width: 256, margin: 1, color: { dark: '#0B0F2A', light: '#ffffff' } })
      .then(setQrUrl);
  }, [fetchStats]);

  const statCards = [
    { label: 'Total produits', value: stats.products, icon: Package, color: 'text-teal' },
    { label: 'Disponibles', value: stats.visible, icon: Eye, color: 'text-green-400' },
    { label: 'Masqués', value: stats.hidden, icon: EyeOff, color: 'text-orange-400' },
    { label: 'Catégories', value: stats.categories, icon: FolderOpen, color: 'text-purple-400' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 mt-1">Vue d'ensemble de votre menu</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <Icon size={20} className={`${color} mb-3`} />
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-white/40 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <QrCode size={18} className="text-teal" /> QR Code Menu
          </h2>
          {qrUrl && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-xl">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-white/40 text-xs text-center">
                Scannez ce QR code pour accéder au menu digital
              </p>
              <a
                href={qrUrl}
                download="ocorner-qr.png"
                className="text-sm text-teal hover:text-green-400 transition-colors"
              >
                Télécharger le QR Code
              </a>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Accès rapide</h2>
          <div className="space-y-3">
            {[
              { href: '/', label: 'Menu public (clients)', icon: ExternalLink },
              { href: '/tv/menu', label: 'TV — Menu boissons & repas', icon: ExternalLink },
              { href: '/tv/annonces', label: 'TV — Anniversaires & Futsal', icon: ExternalLink },
              { href: '/admin/products', label: 'Gérer les produits', icon: Package },
              { href: '/admin/categories', label: 'Gérer les catégories', icon: FolderOpen },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                target={href.startsWith('/admin') ? '_self' : '_blank'}
                className="flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white text-sm transition-all"
              >
                {label}
                <Icon size={14} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
