'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, ImageIcon, X, Check, GripVertical, Eye, EyeOff } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Announcement {
  _id: string;
  title: string;
  imageUrl: string;
  active: boolean;
  order: number;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ocorner_token');
}

export default function AnnoncesPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const res = await fetch(`${BASE}/api/announcements?all=1`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    setItems(await res.json());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setTitle(''); setFile(null); setPreview(null); setError('');
    setShowForm(true);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Veuillez choisir une image'); return; }
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const uploadRes = await fetch(`${BASE}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      if (!uploadRes.ok) throw new Error('Erreur upload');
      const { url } = await uploadRes.json();

      await fetch(`${BASE}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title, imageUrl: url, active: true }),
      });
      await fetchAll();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (item: Announcement) => {
    await fetch(`${BASE}/api/announcements/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...item, active: !item.active }),
    });
    await fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await fetch(`${BASE}/api/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await fetchAll();
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={28} className="text-teal" /> Annonces Physiques
          </h1>
          <p className="text-white/40 mt-1">Images affichées en diaporama sur les écrans TV</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm hover:opacity-90">
          <Plus size={16} /> Ajouter une image
        </button>
      </div>

      {/* Format info banner */}
      <div className="mb-6 p-4 bg-white/5 border border-teal/20 rounded-2xl flex items-start gap-3">
        <span className="text-2xl">📐</span>
        <div className="text-sm text-white/60 leading-relaxed">
          <span className="text-white font-semibold">Format recommandé pour plein écran :</span>
          {' '}1920 × 1080 px (Full HD, ratio 16:9) — max 5 Mo.<br />
          Pour un écran 4K : 3840 × 2160 px. Formats acceptés : JPG, PNG, WebP, GIF.
        </div>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Nouvelle annonce image</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1">Titre (optionnel)</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Promo de la semaine"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-1">Image <span className="text-teal">*</span></label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/10 hover:border-teal/50 rounded-xl cursor-pointer transition-colors overflow-hidden"
                >
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full max-h-56 object-contain bg-black/30" />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30">
                      <ImageIcon size={40} />
                      <p className="text-sm">Cliquer pour choisir une image</p>
                      <p className="text-xs">JPG · PNG · WebP · GIF · max 5 Mo</p>
                      <p className="text-xs text-teal/60">Idéal : 1920 × 1080 px</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-white/20 rounded-xl text-white/60 text-sm">Annuler</button>
                <button type="submit" disabled={uploading} className="flex-1 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {uploading ? <div className="w-4 h-4 border-2 border-night border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                  {uploading ? 'Upload…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune annonce image configurée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {items.map((item, idx) => (
            <div key={item._id} className={`group relative rounded-2xl border overflow-hidden transition-all ${item.active ? 'border-teal/30' : 'border-white/10 opacity-60'}`}>
              <img
                src={`${BASE}${item.imageUrl}`}
                alt={item.title || `Annonce ${idx + 1}`}
                className="w-full aspect-video object-cover bg-black"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                <div>
                  {item.title && <p className="text-white font-semibold text-sm">{item.title}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.active ? 'bg-teal/20 text-teal' : 'bg-white/10 text-white/40'}`}>
                    {item.active ? 'Visible' : 'Masqué'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(item)}
                    className="p-2 rounded-lg bg-black/40 hover:bg-white/10 transition-colors"
                    title={item.active ? 'Masquer' : 'Afficher'}
                  >
                    {item.active ? <Eye size={16} className="text-teal" /> : <EyeOff size={16} className="text-white/40" />}
                  </button>
                  <button
                    onClick={() => remove(item._id)}
                    className="p-2 rounded-lg bg-black/40 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={16} className="text-red-400/60 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
