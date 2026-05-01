'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import MenuCard from '@/components/MenuCard';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface Category { _id: string; name: string; icon: string; showOnTV: boolean; }
interface Product { _id: string; name: string; description: string; price: number; image?: string; happyPrice?: number; isHappyHour?: boolean; tags?: string[]; category: { _id: string }; }

const ROTATION_DELAY = 8000;

export default function TVMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const [time, setTime] = useState('');
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const progressRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    const [cats, prods] = await Promise.all([
      api.get('/api/categories'),
      api.get('/api/products'),
    ]);
    setCategories(cats.filter((c: Category) => c.showOnTV !== false));
    setProducts(prods);
  }, []);

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('menu:update', fetchData);
    socket.on('happyhour:tick', fetchData);
    const clockInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => {
      socket.off('menu:update', fetchData);
      socket.off('happyhour:tick', fetchData);
      clearInterval(clockInterval);
    };
  }, [fetchData]);

  // Category rotation with progress bar
  useEffect(() => {
    if (!categories.length) return;
    setProgress(0);

    timerRef.current = setInterval(() => {
      setActiveCatIndex(i => (i + 1) % categories.length);
      setProgress(0);
    }, ROTATION_DELAY);

    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 100 / (ROTATION_DELAY / 100), 100));
    }, 100);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [categories.length]);

  const activeCategory = categories[activeCatIndex];
  const displayProducts = activeCategory
    ? products.filter(p => p.category?._id === activeCategory._id)
    : [];
  const hasHappyHour = products.some(p => p.isHappyHour);

  return (
    <div className="min-h-screen bg-night flex flex-col overflow-hidden cursor-none" style={{ height: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-12 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <img src="/OCORNER.png" alt="OCORNER" className="h-10 object-contain" />
          <span className="text-white/20 text-2xl">·</span>
          <span className="text-white/40 text-xl font-medium uppercase tracking-widest">Menu</span>
        </div>

        {activeCategory && (
          <div className="flex items-center gap-3">
            <span className="text-5xl">{activeCategory.icon}</span>
            <span className="text-4xl font-bold text-white">{activeCategory.name}</span>
          </div>
        )}

        <div className="text-right">
          <div className="text-4xl font-bold text-white tabular-nums">{time}</div>
          {hasHappyHour && (
            <div className="text-xl font-bold gradient-text animate-pulse-slow">🎉 Happy Hour</div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="flex-1 px-12 py-8 overflow-hidden">
        <div className="grid grid-cols-2 gap-6 h-full content-start">
          {displayProducts.slice(0, 6).map(p => (
            <MenuCard key={p._id} product={p} tvMode />
          ))}
          {displayProducts.length === 0 && (
            <div className="col-span-2 flex items-center justify-center h-full text-white/20 text-3xl">
              Aucun article dans cette catégorie
            </div>
          )}
        </div>
      </div>

      {/* QR Code overlay */}
      <div className="fixed bottom-16 right-8 flex flex-col items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
        <QRCodeSVG
          value={typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
          size={100}
          bgColor="transparent"
          fgColor="#ffffff"
          level="M"
        />
        <span className="text-white/50 text-xs tracking-widest uppercase">Scanner le menu</span>
      </div>

      {/* Category dots + progress */}
      <div className="shrink-0 pb-4">
        <div className="flex justify-center gap-2 py-3">
          {categories.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveCatIndex(i); setProgress(0); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === activeCatIndex ? 'w-8 bg-teal' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-brand-gradient transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
