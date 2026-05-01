'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Check, Tv2, Megaphone, FolderOpen, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface Category {
  _id: string; name: string; icon: string; type: string; order: number;
  visible: boolean; showOnTV: boolean; showOnAnnonce: boolean;
  parent: { _id: string; name: string; icon: string } | null;
}

const emptyForm = { name: '', icon: '🍽️', type: 'FOOD', order: '0', visible: true, showOnTV: true, showOnAnnonce: false, parent: '' };

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={onChange} className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${on ? 'bg-teal' : 'bg-white/20'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${on ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-sm text-white/60">{label}</span>
    </label>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm]   = useState(emptyForm);
  const [editId, setEditId]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]     = useState('');

  const fetchAll = useCallback(() => api.get('/api/categories?all=1').then(setCategories), []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setError(''); };
  const openEdit = (c: Category) => {
    setForm({
      name: c.name, icon: c.icon, type: c.type, order: String(c.order),
      visible: c.visible, showOnTV: c.showOnTV ?? true, showOnAnnonce: c.showOnAnnonce ?? false,
      parent: c.parent?._id || '',
    });
    setEditId(c._id); setShowForm(true); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const payload = {
      ...form,
      order: parseInt(form.order),
      parent: form.parent || null,
    };
    try {
      if (editId) await api.put(`/api/categories/${editId}`, payload);
      else        await api.post('/api/categories', payload);
      await fetchAll(); setShowForm(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    await api.delete(`/api/categories/${id}`);
    await fetchAll();
  };

  const quickToggle = async (c: Category, field: 'showOnTV' | 'showOnAnnonce' | 'visible') => {
    await api.put(`/api/categories/${c._id}`, { ...c, parent: c.parent?._id || null, [field]: !c[field] });
    await fetchAll();
  };

  // Groupement parent / enfant pour l'affichage
  const parents  = categories.filter(c => !c.parent);
  const children = categories.filter(c => c.parent);
  const getChildren = (id: string) => children.filter(c => c.parent?._id === id);

  // Catégories parentes disponibles pour le sélecteur (excluant soi-même à l'édition)
  const parentOptions = categories.filter(c => !c.parent && c._id !== editId);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Catégories</h1>
          <p className="text-white/40 mt-1">{categories.length} catégories · parent + sous-catégories</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm hover:opacity-90">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {/* Légende affichages */}
      <div className="mb-5 flex gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1"><Tv2 size={12} className="text-teal" /> TV Menu</span>
        <span className="flex items-center gap-1"><Megaphone size={12} className="text-pink-400" /> TV Annonce</span>
        <span className="flex items-center gap-1"><FolderOpen size={12} className="text-yellow-400" /> Sous-catégorie</span>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-md p-6 my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editId ? 'Modifier' : 'Ajouter'} une catégorie</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Icône</label>
                  <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center text-2xl focus:outline-none focus:border-teal" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-white/60 block mb-1">Nom</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[#111530] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal">
                    <option value="FOOD">🍽️ Nourriture</option>
                    <option value="DRINK">🍹 Boissons</option>
                    <option value="OTHER">📦 Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-1">Ordre</label>
                  <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
                </div>
              </div>

              {/* Catégorie parente */}
              <div>
                <label className="text-sm text-white/60 block mb-1">Catégorie parente <span className="text-white/30">(optionnel)</span></label>
                <select value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-[#111530] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal">
                  <option value="">— Aucune (catégorie principale)</option>
                  {parentOptions.map(c => (
                    <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-white/8 pt-4 space-y-3">
                <p className="text-xs text-white/40 uppercase tracking-wider">Affichage</p>
                <Toggle on={form.visible}       onChange={() => setForm(f => ({ ...f, visible: !f.visible }))}       label="Visible sur le menu QR" />
                <Toggle on={form.showOnTV}      onChange={() => setForm(f => ({ ...f, showOnTV: !f.showOnTV }))}      label="Afficher sur TV Menu" />
                <Toggle on={form.showOnAnnonce} onChange={() => setForm(f => ({ ...f, showOnAnnonce: !f.showOnAnnonce }))} label="Afficher sur TV Annonce" />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-white/20 rounded-xl text-white/60 text-sm">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                  <Check size={14} /> Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste groupée parent → enfants */}
      <div className="space-y-2">
        {parents.map(parent => {
          const subs = getChildren(parent._id);
          return (
            <div key={parent._id}>
              {/* Catégorie parente */}
              <CategoryRow c={parent} onEdit={openEdit} onRemove={remove} onToggle={quickToggle} isParent />
              {/* Sous-catégories */}
              {subs.map(sub => (
                <div key={sub._id} className="ml-6 mt-1.5 flex items-center gap-2">
                  <ChevronRight size={14} className="text-white/20 shrink-0" />
                  <div className="flex-1">
                    <CategoryRow c={sub} onEdit={openEdit} onRemove={remove} onToggle={quickToggle} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {/* Catégories orphelines (parent supprimé) */}
        {children.filter(c => !parents.find(p => p._id === c.parent?._id)).map(c => (
          <CategoryRow key={c._id} c={c} onEdit={openEdit} onRemove={remove} onToggle={quickToggle} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ c, onEdit, onRemove, onToggle, isParent = false }: {
  c: Category;
  onEdit: (c: Category) => void;
  onRemove: (id: string) => void;
  onToggle: (c: Category, field: 'showOnTV' | 'showOnAnnonce' | 'visible') => void;
  isParent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-all ${
      c.visible ? (isParent ? 'bg-white/8 border-white/15' : 'bg-white/4 border-white/8') : 'bg-white/2 border-white/5 opacity-50'
    }`}>
      <span className="text-2xl shrink-0">{c.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-white ${isParent ? 'text-base' : 'text-sm'}`}>{c.name}</span>
          <span className="text-xs bg-white/8 text-white/30 px-2 py-0.5 rounded-full">{c.type}</span>
          {!c.visible && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">Masqué QR</span>}
        </div>
      </div>

      {/* Toggles rapides TV */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggle(c, 'showOnTV')}
          title="TV Menu"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${c.showOnTV ? 'bg-teal/20 text-teal' : 'bg-white/5 text-white/20 hover:bg-white/10'}`}>
          <Tv2 size={12} /> TV Menu
        </button>
        <button
          onClick={() => onToggle(c, 'showOnAnnonce')}
          title="TV Annonce"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${c.showOnAnnonce ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/20 hover:bg-white/10'}`}>
          <Megaphone size={12} /> Annonce
        </button>
      </div>

      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(c)} className="p-2 rounded-lg hover:bg-white/10"><Pencil size={14} className="text-white/50" /></button>
        <button onClick={() => onRemove(c._id)} className="p-2 rounded-lg hover:bg-red-500/10"><Trash2 size={14} className="text-red-400/50 hover:text-red-400" /></button>
      </div>
    </div>
  );
}
