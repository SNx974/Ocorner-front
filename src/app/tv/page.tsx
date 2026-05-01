'use client';

import Link from 'next/link';
import { UtensilsCrossed, Megaphone } from 'lucide-react';

export default function TVIndexPage() {
  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col items-center justify-center gap-12 px-8">
      <div className="text-center">
        <img src="/OCORNER.png" alt="OCORNER" className="h-16 object-contain" />
        <p className="text-white/40 text-xl mt-2 tracking-widest uppercase">Sélectionner l'affichage TV</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-3xl">
        <Link
          href="/tv/menu"
          className="group flex flex-col items-center gap-6 bg-white/5 border border-white/10 rounded-3xl p-12 hover:border-teal/40 hover:bg-teal/5 transition-all duration-300"
        >
          <div className="w-24 h-24 bg-brand-gradient rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <UtensilsCrossed size={44} className="text-night" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-white">Menu</p>
            <p className="text-white/40 mt-2">Boissons · Repas · Desserts</p>
            <p className="text-white/25 text-sm mt-1 font-mono">/tv/menu</p>
          </div>
        </Link>

        <Link
          href="/tv/annonces"
          className="group flex flex-col items-center gap-6 bg-white/5 border border-white/10 rounded-3xl p-12 hover:border-pink-500/40 hover:bg-pink-500/5 transition-all duration-300"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-orange-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Megaphone size={44} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-white">Annonces</p>
            <p className="text-white/40 mt-2">Anniversaires · Futsal</p>
            <p className="text-white/25 text-sm mt-1 font-mono">/tv/annonces</p>
          </div>
        </Link>
      </div>

      <p className="text-white/20 text-sm">Ces pages sont conçues pour être affichées en plein écran</p>
    </div>
  );
}
