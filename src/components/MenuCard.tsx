'use client';

import { useState } from 'react';
import { X, Tag, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  happyPrice?: number;
  isHappyHour?: boolean;
  tags?: string[];
  allergens?: string[];
}

interface Props {
  product: Product;
  tvMode?: boolean;
}

function ProductPopup({ product, onClose }: { product: Product; onClose: () => void }) {
  const { name, description, price, image, happyPrice, isHappyHour, tags, allergens } = product;
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'popupIn 0.2s ease both' }}
      >
        {/* Image */}
        {image && (
          <div className="relative w-full h-52 overflow-hidden">
            <img src={`${API}${image}`} alt={name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111530]/80 to-transparent" />
            {isHappyHour && (
              <span className="absolute top-3 right-3 bg-brand-gradient text-night text-xs font-bold px-3 py-1 rounded-full">
                HAPPY HOUR
              </span>
            )}
          </div>
        )}

        <div className="p-6">
          {/* Titre + prix */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-2xl font-black text-white leading-tight">{name}</h2>
            <div className="shrink-0 text-right">
              {isHappyHour && happyPrice !== undefined ? (
                <>
                  <p className="text-2xl font-black gradient-text">{happyPrice.toFixed(2)}€</p>
                  <p className="text-sm text-white/40 line-through">{price.toFixed(2)}€</p>
                </>
              ) : (
                <p className="text-2xl font-black text-white">{price.toFixed(2)}€</p>
              )}
            </div>
          </div>

          {/* Description complète */}
          {description && (
            <p className="text-white/60 text-sm leading-relaxed mb-4">{description}</p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-teal/10 text-teal/80 border border-teal/20 px-2.5 py-1 rounded-full">
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* Allergènes */}
          {allergens && allergens.length > 0 && (
            <div className="flex items-start gap-2 bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2.5 mb-4">
              <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-300/80">Allergènes : {allergens.join(', ')}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 border border-white/15 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <X size={14} /> Fermer
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes popupIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function MenuCard({ product, tvMode }: Props) {
  const [open, setOpen] = useState(false);
  const { name, description, price, image, happyPrice, isHappyHour, tags, allergens } = product;

  return (
    <>
      <div
        onClick={() => !tvMode && setOpen(true)}
        className={`
          relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden
          ${isHappyHour ? 'border-teal/40 shadow-[0_0_20px_rgba(15,163,163,0.15)]' : ''}
          ${!tvMode ? 'cursor-pointer hover:bg-white/8 hover:border-white/20 transition-all duration-200 active:scale-[0.99]' : ''}
        `}
      >
        {/* TV mode : image en fond avec overlay */}
        {image && tvMode && (
          <>
            <img src={`${API}${image}`} alt={name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-night/75" />
          </>
        )}

        {/* Normal mode : image en bannière */}
        {image && !tvMode && (
          <div className="w-full h-36 overflow-hidden">
            <img src={`${API}${image}`} alt={name} className="w-full h-full object-cover" />
          </div>
        )}

        {isHappyHour && (
          <div className="absolute top-3 right-3 bg-brand-gradient text-night text-xs font-bold px-2 py-1 rounded-full">
            HAPPY HOUR
          </div>
        )}

        <div className={`relative flex justify-between items-start gap-4 ${tvMode ? 'p-8' : 'p-5'}`}>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-white leading-tight ${tvMode ? 'text-3xl' : 'text-lg'}`}>{name}</h3>
            {description && (
              <p className={`text-white/50 mt-1 leading-relaxed ${tvMode ? 'text-xl' : 'text-sm line-clamp-2'}`}>
                {description}
              </p>
            )}
            {tags && tags.length > 0 && !tvMode && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
            {allergens && allergens.length > 0 && !tvMode && (
              <p className="text-xs text-white/30 mt-2">Allergènes : {allergens.join(', ')}</p>
            )}
          </div>

          <div className="flex flex-col items-end shrink-0">
            {isHappyHour && happyPrice !== undefined ? (
              <>
                <span className={`font-black gradient-text ${tvMode ? 'text-4xl' : 'text-2xl'}`}>{happyPrice.toFixed(2)}€</span>
                <span className={`text-white/40 line-through ${tvMode ? 'text-xl' : 'text-sm'}`}>{price.toFixed(2)}€</span>
              </>
            ) : (
              <span className={`font-black text-white ${tvMode ? 'text-4xl' : 'text-2xl'}`}>{price.toFixed(2)}€</span>
            )}
            {!tvMode && (
              <span className="text-white/20 text-xs mt-1">Voir détails →</span>
            )}
          </div>
        </div>
      </div>

      {open && <ProductPopup product={product} onClose={() => setOpen(false)} />}
    </>
  );
}
