'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Eye, EyeOff, ChefHat } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Category { _id: string; name: string; icon: string; }
interface Product {
  _id: string; name: string; description: string; price: number;
  visible: boolean; image?: string; category: Category;
}

export default function CuisinePage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState<Set<string>>(new Set());
  const [filterCat, setFilterCat] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchAll = useCallback(async () => {
    const [prods, cats] = await Promise.all([
      api.get('/api/products?all=1'),
      api.get('/api/categories'),
    ]);
    setProducts(prods);
    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const socket = getSocket();
    socket.on('menu:update', fetchAll);
    return () => { socket.off('menu:update', fetchAll); };
  }, [fetchAll]);

  const toggleVisible = async (product: Product) => {
    setToggling(prev => new Set(prev).add(product._id));
    try {
      await api.put(`/api/products/${product._id}`, { ...product, visible: !product.visible, category: product.category._id });
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, visible: !p.visible } : p));
    } finally {
      setToggling(prev => { const next = new Set(prev); next.delete(product._id); return next; });
    }
  };

  const filtered = filterCat === 'all' ? products : products.filter(p => p.category?._id === filterCat);
  const visibleCount = products.filter(p => p.visible).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <ChefHat size={24} className="text-orange-400" /> Cuisine
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          {visibleCount} produits visibles · {products.length - visibleCount} masqués
        </p>
      </div>

      {/* Filtre catégories — scroll horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        <button onClick={() => setFilterCat('all')}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterCat === 'all' ? 'bg-brand-gradient text-night' : 'bg-white/10 text-white/60'}`}>
          Tout ({products.length})
        </button>
        {categories.map(cat => {
          const count = products.filter(p => p.category?._id === cat._id).length;
          return (
            <button key={cat._id} onClick={() => setFilterCat(cat._id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterCat === cat._id ? 'bg-brand-gradient text-night' : 'bg-white/10 text-white/60'}`}>
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Grille produits — grandes tuiles tactiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(product => {
          const isToggling = toggling.has(product._id);
          return (
            <button key={product._id}
              onClick={() => toggleVisible(product)}
              disabled={isToggling}
              className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all active:scale-95 text-left ${
                product.visible
                  ? 'border-teal/30 bg-teal/5'
                  : 'border-white/10 bg-white/3 opacity-60'
              }`}
              style={{ minHeight: '160px' }}>

              {/* Image */}
              {product.image ? (
                <div className="relative w-full" style={{ paddingBottom: '56%' }}>
                  <img src={`${BASE}${product.image}`} alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              ) : (
                <div className="w-full bg-white/5 flex items-center justify-center" style={{ paddingBottom: '40%' }}>
                  <span className="absolute text-4xl opacity-20">{product.category?.icon || '🍽️'}</span>
                </div>
              )}

              {/* Contenu */}
              <div className="flex-1 p-3 flex flex-col justify-between gap-2">
                <div>
                  <p className="font-bold text-white text-sm leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{product.price.toFixed(2)}€</p>
                </div>

                {/* Toggle badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl self-start text-xs font-bold transition-all ${
                  product.visible ? 'bg-teal/20 text-teal' : 'bg-white/10 text-white/40'
                }`}>
                  {isToggling
                    ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    : product.visible ? <Eye size={12} /> : <EyeOff size={12} />
                  }
                  {product.visible ? 'Visible' : 'Masqué'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-white/20">
          <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun produit dans cette catégorie</p>
        </div>
      )}
    </div>
  );
}
