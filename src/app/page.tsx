'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CategoryNav, { Category } from '@/components/CategoryNav';
import MenuCard from '@/components/MenuCard';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface Product {
  _id: string; name: string; description: string; price: number;
  happyPrice?: number; isHappyHour?: boolean;
  tags?: string[]; allergens?: string[];
  category: { _id: string; name: string; };
  visible: boolean;
  image?: string;
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [activeRoot, setActiveRoot] = useState<string>('all');
  const [activeSub, setActiveSub]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/products'),
      ]);
      setCategories(cats);
      setProducts(prods);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('menu:update', fetchData);
    socket.on('happyhour:tick', fetchData);
    return () => { socket.off('menu:update', fetchData); socket.off('happyhour:tick', fetchData); };
  }, [fetchData]);

  // Toutes les IDs enfants d'une catégorie racine (inclut elle-même)
  const branchIds = useCallback((rootId: string): string[] => {
    const direct = categories.filter(c => c.parent?._id === rootId).map(c => c._id);
    return [rootId, ...direct];
  }, [categories]);

  // Produits visibles selon sélection
  const visibleProducts = useMemo(() => {
    if (activeRoot === 'all') return products;
    if (activeSub) return products.filter(p => p.category?._id === activeSub);
    return products.filter(p => branchIds(activeRoot).includes(p.category?._id));
  }, [products, activeRoot, activeSub, branchIds]);

  // Catégories racines (sans parent)
  const roots = useMemo(() => categories.filter(c => !c.parent), [categories]);

  // Sous-catégories de la racine sélectionnée
  const subCats = useMemo(() =>
    activeRoot === 'all' ? [] : categories.filter(c => c.parent?._id === activeRoot),
    [categories, activeRoot]
  );

  // Groupement pour la vue "Tout voir" : root → subs → produits
  const groupedView = useMemo(() => {
    return roots.map(root => {
      const subs = categories.filter(c => c.parent?._id === root._id);
      if (subs.length === 0) {
        const items = products.filter(p => p.category?._id === root._id);
        return { root, subs: [], directItems: items };
      }
      return {
        root,
        subs: subs.map(sub => ({
          sub,
          items: products.filter(p => p.category?._id === sub._id),
        })),
        directItems: products.filter(p => p.category?._id === root._id),
      };
    }).filter(g => g.directItems.length > 0 || g.subs.some(s => s.items.length > 0));
  }, [roots, categories, products]);

  const hasHappyHour = products.some(p => p.isHappyHour);

  const handleRootChange = (id: string) => { setActiveRoot(id); setActiveSub(null); };

  return (
    <div className="min-h-screen bg-hero-gradient">

      {/* Header */}
      <header className="relative px-4 pt-8 pb-5 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-teal rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center gap-2">
          <Image src="/OCORNER.png" alt="OCORNER" width={180} height={60} className="object-contain" priority />
          <p className="text-white/40 text-xs font-medium tracking-widest uppercase">Menu Digital</p>
          {hasHappyHour && (
            <div className="inline-flex items-center gap-2 mt-1 px-4 py-1.5 bg-brand-gradient rounded-full text-night font-bold text-sm animate-pulse-slow">
              🎉 Happy Hour en cours !
            </div>
          )}
        </div>
      </header>

      {/* Navigation hiérarchique */}
      <CategoryNav
        categories={categories}
        activeRoot={activeRoot}
        activeSub={activeSub}
        onRootChange={handleRootChange}
        onSubChange={setActiveSub}
      />

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40">Chargement du menu…</p>
          </div>

        ) : activeRoot === 'all' ? (
          /* ── Vue TOUT VOIR : hiérarchique ── */
          groupedView.length === 0 ? (
            <div className="text-center py-24 text-white/30">
              <p className="text-4xl mb-3">🍽️</p><p>Aucun article disponible</p>
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in">
              {groupedView.map(({ root, subs, directItems }) => (
                <section key={root._id}>
                  {/* En-tête racine cliquable */}
                  <button
                    onClick={() => handleRootChange(root._id)}
                    className="flex items-center gap-2 mb-4 w-full group"
                  >
                    <span className="text-2xl">{root.icon}</span>
                    <h2 className="text-xl font-bold text-white group-hover:text-teal transition-colors">{root.name}</h2>
                    <div className="flex-1 h-px bg-white/10 ml-2" />
                    {subs.length > 0 && (
                      <span className="text-white/30 text-xs mr-1">{subs.length} sous-cat →</span>
                    )}
                  </button>

                  {/* Produits directs de la racine */}
                  {directItems.length > 0 && (
                    <div className="flex flex-col gap-3 mb-4">
                      {directItems.map(p => <MenuCard key={p._id} product={p} />)}
                    </div>
                  )}

                  {/* Sous-catégories */}
                  {subs.map(({ sub, items }) => items.length === 0 ? null : (
                    <div key={sub._id} className="mb-5">
                      <button
                        onClick={() => { setActiveRoot(root._id); setActiveSub(sub._id); }}
                        className="flex items-center gap-1.5 mb-3 group"
                      >
                        <span className="text-lg">{sub.icon}</span>
                        <h3 className="text-base font-semibold text-white/70 group-hover:text-white transition-colors">{sub.name}</h3>
                        <span className="text-white/20 text-xs ml-1">{items.length}</span>
                      </button>
                      <div className="flex flex-col gap-3 pl-2 border-l border-white/8">
                        {items.map(p => <MenuCard key={p._id} product={p} />)}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )

        ) : activeSub || subCats.length === 0 ? (
          /* ── Vue CATÉGORIE FEUILLE (L2 sélectionné ou racine sans enfants) ── */
          visibleProducts.length === 0 ? (
            <div className="text-center py-24 text-white/30">
              <p className="text-4xl mb-3">🍽️</p><p>Aucun article dans cette catégorie</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-fade-in">
              {visibleProducts.map(p => <MenuCard key={p._id} product={p} />)}
            </div>
          )

        ) : (
          /* ── Vue RACINE sélectionnée avec sous-catégories → montrer les sous-cats ── */
          <div className="space-y-8 animate-fade-in">
            {subCats.map(sub => {
              const items = products.filter(p => p.category?._id === sub._id);
              if (!items.length) return null;
              return (
                <section key={sub._id}>
                  <button
                    onClick={() => setActiveSub(sub._id)}
                    className="flex items-center gap-2 mb-4 w-full group"
                  >
                    <span className="text-xl">{sub.icon}</span>
                    <h2 className="text-lg font-bold text-white group-hover:text-teal transition-colors">{sub.name}</h2>
                    <div className="flex-1 h-px bg-white/10 ml-2" />
                    <span className="text-white/30 text-xs">{items.length}</span>
                  </button>
                  <div className="flex flex-col gap-3 pl-2 border-l border-white/8">
                    {items.slice(0, 3).map(p => <MenuCard key={p._id} product={p} />)}
                    {items.length > 3 && (
                      <button
                        onClick={() => setActiveSub(sub._id)}
                        className="text-sm text-teal/70 hover:text-teal transition-colors py-2 text-center"
                      >
                        Voir les {items.length - 3} autres →
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
            {/* Produits directs de la racine s'il y en a */}
            {products.filter(p => p.category?._id === activeRoot).map(p => (
              <MenuCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-white/20 text-xs border-t border-white/5">
        Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        {' · '}
        <Link href="/admin/login" className="hover:text-white/50 transition-colors">Admin</Link>
      </footer>
    </div>
  );
}
