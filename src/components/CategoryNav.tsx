'use client';

import { useMemo } from 'react';

export interface Category {
  _id: string;
  name: string;
  icon: string;
  parent: { _id: string; name: string; icon: string } | null;
}

interface Props {
  categories: Category[];
  activeRoot: string;        // 'all' | root-id
  activeSub:  string | null; // null | child-id
  onRootChange: (id: string) => void;
  onSubChange:  (id: string | null) => void;
}

export default function CategoryNav({ categories, activeRoot, activeSub, onRootChange, onSubChange }: Props) {
  const roots = useMemo(() => categories.filter(c => !c.parent), [categories]);

  const subCats = useMemo(() =>
    activeRoot === 'all' ? [] : categories.filter(c => c.parent?._id === activeRoot),
    [categories, activeRoot]
  );

  const hasSubLevel = subCats.length > 0;

  return (
    <nav className="sticky top-0 z-30 bg-night/95 backdrop-blur-md border-b border-white/8">

      {/* ── Niveau 1 : catégories racines ── */}
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          <button
            onClick={() => { onRootChange('all'); onSubChange(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
              activeRoot === 'all'
                ? 'bg-brand-gradient text-night shadow-lg shadow-teal/20'
                : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white'
            }`}
          >
            🍽️ <span>Tout voir</span>
          </button>

          {roots.map(cat => {
            const hasKids = categories.some(c => c.parent?._id === cat._id);
            const isActive = activeRoot === cat._id;
            return (
              <button
                key={cat._id}
                onClick={() => { onRootChange(cat._id); onSubChange(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-gradient text-night shadow-lg shadow-teal/20'
                    : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{cat.icon}</span>
                <span>{cat.name}</span>
                {hasKids && (
                  <span className={`text-[10px] leading-none ${isActive ? 'text-night/60' : 'text-white/30'}`}>▾</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Niveau 2 : sous-catégories ── */}
      {hasSubLevel && (
        <div
          className="overflow-x-auto scrollbar-none border-t border-white/6"
          style={{ animation: 'subNavIn 0.2s ease both' }}
        >
          <div className="flex gap-2 px-4 py-2.5 min-w-max">
            {/* "Tout" de la catégorie parente */}
            <button
              onClick={() => onSubChange(null)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                !activeSub
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              Tout
            </button>

            {subCats.map(cat => (
              <button
                key={cat._id}
                onClick={() => onSubChange(cat._id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeSub === cat._id
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes subNavIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}
