'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check, Package, ImagePlus, Loader2, FileSpreadsheet } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import ImportModal from './ImportModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Category { _id: string; name: string; icon: string; }
interface Product { _id: string; name: string; description: string; price: number; image: string; category: { _id: string; name: string }; tags: string[]; allergens: string[]; visible: boolean; }

const emptyForm = { name: '', description: '', price: '', category: '', tags: '', allergens: '', visible: true, image: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const [p, c] = await Promise.all([api.get('/api/products?all=1'), api.get('/api/categories?all=1')]);
    setProducts(p);
    setCategories(c);
  }, []);

  useEffect(() => {
    fetchAll();
    const socket = getSocket();
    socket.on('menu:update', fetchAll);
    return () => { socket.off('menu:update', fetchAll); };
  }, [fetchAll]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setError(''); };
  const openEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description, price: String(p.price), category: p.category?._id || '', tags: p.tags?.join(', ') || '', allergens: p.allergens?.join(', ') || '', visible: p.visible, image: p.image || '' });
    setEditId(p._id); setShowForm(true); setError('');
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('ocorner_token');
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload échoué');
      const data = await res.json();
      setForm(f => ({ ...f, image: data.url }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleImageUpload(file);
  };

  const removeImage = () => setForm(f => ({ ...f, image: '' }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = { ...form, price: parseFloat(form.price), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), allergens: form.allergens.split(',').map(a => a.trim()).filter(Boolean) };
    try {
      if (editId) await api.put(`/api/products/${editId}`, payload);
      else await api.post('/api/products', payload);
      getSocket().emit('admin:update', { type: 'product' });
      await fetchAll();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string) => {
    await api.patch(`/api/products/${id}/toggle`);
    getSocket().emit('admin:update', { type: 'toggle' });
    await fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await api.delete(`/api/products/${id}`);
    getSocket().emit('admin:update', { type: 'delete' });
    await fetchAll();
  };

  const filtered = products.filter(p => filter === 'all' ? true : filter === 'visible' ? p.visible : !p.visible);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Produits</h1>
          <p className="text-white/40 mt-1">{products.length} produits au total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2.5 border border-teal/40 text-teal rounded-xl text-sm hover:bg-teal/10 transition-colors">
            <FileSpreadsheet size={16} /> Importer Excel
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[['all', 'Tous'], ['visible', 'Disponibles'], ['hidden', 'Masqués']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === val ? 'bg-brand-gradient text-night' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}>
            {label}
          </button>
        ))}
      </div>

      {showImport && (
        <ImportModal
          categories={categories}
          onClose={() => setShowImport(false)}
          onDone={() => { fetchAll(); setShowImport(false); }}
        />
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editId ? 'Modifier' : 'Ajouter'} un produit</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Image upload */}
              <div>
                <label className="text-sm text-white/60 block mb-2">Image</label>
                {form.image ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden group">
                    <img src={`${API}${form.image}`} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg text-white text-xs font-medium hover:bg-white/30">
                        Changer
                      </button>
                      <button type="button" onClick={removeImage} className="px-3 py-1.5 bg-red-500/60 backdrop-blur rounded-lg text-white text-xs font-medium hover:bg-red-500/80">
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-teal/50 hover:bg-teal/5 transition-all"
                  >
                    {uploading ? (
                      <Loader2 size={24} className="text-teal animate-spin" />
                    ) : (
                      <>
                        <ImagePlus size={24} className="text-white/30" />
                        <p className="text-white/40 text-sm">Cliquez ou glissez une image</p>
                        <p className="text-white/20 text-xs">JPG, PNG, WebP · max 5 Mo</p>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
              </div>

              {[['name', 'Nom', 'text'], ['description', 'Description', 'text'], ['price', 'Prix (€)', 'number'], ['tags', 'Tags (séparés par virgule)', 'text'], ['allergens', 'Allergènes (séparés par virgule)', 'text']].map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-sm text-white/60 block mb-1">{label}</label>
                  <input type={type} step={field === 'price' ? '0.01' : undefined} value={(form as Record<string, string | boolean>)[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} required={field === 'name' || field === 'price'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-sm text-white/60 block mb-1">Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required style={{ colorScheme: 'dark' }} className="w-full bg-[#111530] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal">
                  <option value="">Choisir…</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, visible: !f.visible }))} className={`w-10 h-6 rounded-full transition-colors ${form.visible ? 'bg-teal' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full m-1 transition-transform ${form.visible ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-white/60">Visible sur le menu</span>
              </label>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-white/20 rounded-xl text-white/60 text-sm hover:bg-white/5">Annuler</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  <Check size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p._id} className={`flex items-center gap-4 bg-white/5 border rounded-xl px-4 py-3 ${p.visible ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
              {p.image ? (
                <img src={`${API}${p.image}`} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={20} className="text-white/20" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{p.name}</span>
                {!p.visible && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">Masqué</span>}
              </div>
              <p className="text-white/40 text-sm mt-0.5 truncate">{p.description}</p>
              <p className="text-white/30 text-xs mt-0.5">{p.category?.name}</p>
            </div>
            <span className="text-white font-bold text-lg shrink-0">{p.price.toFixed(2)}€</span>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(p._id)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title={p.visible ? 'Masquer' : 'Afficher'}>
                {p.visible ? <Eye size={16} className="text-teal" /> : <EyeOff size={16} className="text-white/30" />}
              </button>
              <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Pencil size={16} className="text-white/60" />
              </button>
              <button onClick={() => remove(p._id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                <Trash2 size={16} className="text-red-400/60 hover:text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-white/20">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            Aucun produit
          </div>
        )}
      </div>
    </div>
  );
}
