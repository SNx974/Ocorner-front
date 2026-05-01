'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Clock, X, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface Product { _id: string; name: string; price: number; }
interface Discount { product: string | Product; happyPrice: number; }
interface HappyHour { _id: string; name: string; startHour: number; startMinute: number; endHour: number; endMinute: number; active: boolean; days: number[]; discounts: Discount[]; }

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const emptyForm = { name: '', startHour: '17', startMinute: '0', endHour: '20', endMinute: '0', active: true, days: [] as number[], discounts: [] as { productId: string; happyPrice: string }[] };

export default function HappyHourPage() {
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    const [hhs, prods] = await Promise.all([api.get('/api/happyhour'), api.get('/api/products?all=1')]);
    setHappyHours(hhs);
    setProducts(prods);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setError(''); };

  const addDiscount = () => setForm(f => ({ ...f, discounts: [...f.discounts, { productId: '', happyPrice: '' }] }));
  const removeDiscount = (i: number) => setForm(f => ({ ...f, discounts: f.discounts.filter((_, j) => j !== i) }));
  const updateDiscount = (i: number, field: 'productId' | 'happyPrice', val: string) =>
    setForm(f => ({ ...f, discounts: f.discounts.map((d, j) => j === i ? { ...d, [field]: val } : d) }));

  const toggleDay = (day: number) => setForm(f => ({
    ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day]
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const payload = {
      name: form.name,
      startHour: parseInt(form.startHour),
      startMinute: parseInt(form.startMinute),
      endHour: parseInt(form.endHour),
      endMinute: parseInt(form.endMinute),
      active: form.active,
      days: form.days,
      discounts: form.discounts.filter(d => d.productId && d.happyPrice).map(d => ({ product: d.productId, happyPrice: parseFloat(d.happyPrice) })),
    };
    try {
      if (editId) await api.put(`/api/happyhour/${editId}`, payload);
      else await api.post('/api/happyhour', payload);
      await fetchAll(); setShowForm(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce Happy Hour ?')) return;
    await api.delete(`/api/happyhour/${id}`);
    await fetchAll();
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Clock size={28} className="text-teal" /> Happy Hour</h1>
          <p className="text-white/40 mt-1">Prix temporaires automatiques selon l'heure</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm hover:opacity-90">
          <Plus size={16} /> Créer
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Nouveau Happy Hour</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-white/40" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm text-white/60 block mb-1">Nom</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Happy Hour du soir" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Début</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" max="23" value={form.startHour} onChange={e => setForm(f => ({ ...f, startHour: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal text-center" />
                    <span className="text-white/40 self-center">h</span>
                    <input type="number" min="0" max="59" value={form.startMinute} onChange={e => setForm(f => ({ ...f, startMinute: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal text-center" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-1">Fin</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" max="23" value={form.endHour} onChange={e => setForm(f => ({ ...f, endHour: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal text-center" />
                    <span className="text-white/40 self-center">h</span>
                    <input type="number" min="0" max="59" value={form.endMinute} onChange={e => setForm(f => ({ ...f, endMinute: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal text-center" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">Jours (vide = tous les jours)</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.days.includes(i) ? 'bg-brand-gradient text-night' : 'bg-white/10 text-white/60'}`}>{d}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/60">Prix réduits</label>
                  <button type="button" onClick={addDiscount} className="text-xs text-teal hover:text-green-400 transition-colors">+ Ajouter produit</button>
                </div>
                <div className="space-y-2">
                  {form.discounts.map((d, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={d.productId} onChange={e => updateDiscount(i, 'productId', e.target.value)} style={{ colorScheme: 'dark' }} className="flex-1 bg-[#111530] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal">
                        <option value="">Choisir un produit…</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.price.toFixed(2)}€)</option>)}
                      </select>
                      <input type="number" step="0.01" placeholder="Prix HH" value={d.happyPrice} onChange={e => updateDiscount(i, 'happyPrice', e.target.value)} className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal" />
                      <button type="button" onClick={() => removeDiscount(i)} className="text-red-400/60 hover:text-red-400"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))} className={`w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-teal' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full m-1 transition-transform ${form.active ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-white/60">Actif</span>
              </label>

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

      <div className="space-y-4">
        {happyHours.map(hh => (
          <div key={hh._id} className={`bg-white/5 border rounded-2xl p-5 ${hh.active ? 'border-teal/30' : 'border-white/10 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg">{hh.name}</h3>
                  {hh.active ? <span className="text-xs bg-teal/20 text-teal px-2 py-0.5 rounded-full">Actif</span> : <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">Inactif</span>}
                </div>
                <p className="text-white/60 text-sm mt-1">
                  <Clock size={12} className="inline mr-1" />
                  {pad(hh.startHour)}h{pad(hh.startMinute)} → {pad(hh.endHour)}h{pad(hh.endMinute)}
                  {hh.days.length > 0 && ` · ${hh.days.map(d => DAYS[d]).join(', ')}`}
                </p>
                {hh.discounts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {hh.discounts.map((d, i) => {
                      const p = typeof d.product === 'object' ? d.product : null;
                      return p ? (
                        <span key={i} className="text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full">
                          {p.name}: <span className="text-white/30 line-through">{p.price.toFixed(2)}€</span> → <span className="gradient-text font-bold">{d.happyPrice.toFixed(2)}€</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => remove(hh._id)} className="p-2 rounded-lg hover:bg-red-500/10">
                <Trash2 size={16} className="text-red-400/60 hover:text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {happyHours.length === 0 && (
          <div className="text-center py-16 text-white/20">
            <Clock size={40} className="mx-auto mb-3 opacity-40" />
            Aucun Happy Hour configuré
          </div>
        )}
      </div>
    </div>
  );
}
