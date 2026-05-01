'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, X, Check, Cake, Clock, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { SLOTS, MAX_PER_SLOT, getCurrentSlotIndex } from '@/lib/birthdaySlots';

interface Birthday { _id: string; name: string; category: string; date: string; active: boolean; slot: number; }

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { name: '', category: '', date: today(), active: true, slot: -1 };
const CATEGORIES = ['VIP', 'Famille', 'Groupe', 'Équipe', 'Ami(e)', 'Collaborateur', 'Autre'];

export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [form, setForm]           = useState(emptyForm);
  const [editId, setEditId]       = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [error, setError]         = useState('');

  const fetchAll = useCallback(() => api.get('/api/birthdays/all').then(setBirthdays), []);

  useEffect(() => {
    fetchAll();
    const socket = getSocket();
    socket.on('menu:update', fetchAll);
    return () => { socket.off('menu:update', fetchAll); };
  }, [fetchAll]);

  const todayStr    = today();
  const currentSlot = getCurrentSlotIndex();

  const todayBirths = birthdays.filter(b => b.active && (!b.date || b.date === todayStr));
  const slotMap: Record<number, Birthday[]> = {};
  SLOTS.forEach((_, si) => { slotMap[si] = []; });
  todayBirths.forEach(b => {
    if (b.slot >= 0 && b.slot < SLOTS.length) slotMap[b.slot].push(b);
  });

  const countInSlot = (si: number) => slotMap[si]?.length ?? 0;

  const openAdd = () => {
    setForm({ ...emptyForm, date: today() });
    setEditId(null); setShowForm(true); setError('');
  };

  const openEdit = (b: Birthday) => {
    setForm({ name: b.name, category: b.category, date: b.date || today(), active: b.active, slot: b.slot ?? -1 });
    setEditId(b._id); setShowForm(true); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (form.slot < 0) { setError('Veuillez choisir un créneau horaire.'); return; }
    const currentCount = slotMap[form.slot]?.filter(b => b._id !== editId).length ?? 0;
    if (currentCount >= MAX_PER_SLOT) {
      setError(`Ce créneau est complet (max ${MAX_PER_SLOT} personnes).`); return;
    }
    try {
      if (editId) await api.put(`/api/birthdays/${editId}`, form);
      else        await api.post('/api/birthdays', form);
      getSocket().emit('admin:update', { type: 'birthday' });
      await fetchAll(); setShowForm(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cet anniversaire ?')) return;
    await api.delete(`/api/birthdays/${id}`);
    getSocket().emit('admin:update', { type: 'birthday' });
    await fetchAll();
  };

  const toggleActive = async (b: Birthday) => {
    await api.put(`/api/birthdays/${b._id}`, { ...b, active: !b.active });
    await fetchAll();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Cake size={24} className="text-pink-400" /> Anniversaires
          </h1>
          <p className="text-white/40 mt-1 text-sm">Max {MAX_PER_SLOT} par créneau</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-3 bg-brand-gradient text-night font-bold rounded-xl text-sm hover:opacity-90 active:scale-95 transition-all">
          <Plus size={18} /> Ajouter
        </button>
      </div>

      {/* Planning du jour */}
      {todayBirths.length > 0 && (
        <div className="mb-6 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-4 space-y-2">
          <p className="text-pink-300 text-sm font-semibold flex items-center gap-2 mb-3">
            <Clock size={14} /> Planning TV aujourd'hui
          </p>
          {SLOTS.map((slot, si) => {
            const people = slotMap[si] ?? [];
            const isNow  = si === currentSlot;
            return (
              <div key={si} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                isNow && people.length ? 'bg-pink-500/25 border border-pink-400/40' :
                people.length         ? 'bg-pink-500/10 border border-pink-500/15' :
                                        'bg-white/3 border border-white/5 opacity-35'
              }`}>
                <div className="shrink-0 w-28">
                  <p className="text-white/50 font-mono text-xs">{slot.label}</p>
                  {isNow && <p className="text-pink-400 text-xs font-bold mt-0.5">● EN COURS</p>}
                </div>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {people.map(p => (
                    <span key={p._id} className="px-2.5 py-1 bg-pink-500/25 text-pink-200 rounded-full text-xs font-medium">
                      🎉 {p.name}{p.category ? ` · ${p.category}` : ''}
                    </span>
                  ))}
                  {!people.length && <span className="text-white/20 text-xs italic">Aucun</span>}
                </div>
                <span className={`shrink-0 text-xs font-mono px-2 py-1 rounded-lg ${
                  people.length >= MAX_PER_SLOT ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/30'
                }`}>
                  {people.length}/{MAX_PER_SLOT}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-[#111530] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 sm:pb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editId ? 'Modifier' : 'Ajouter'} un anniversaire</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-white/10">
                <X size={20} className="text-white/40" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="text-sm text-white/60 block mb-2">Prénom / Nom</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="Ex: Anthony"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-teal" />
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">Catégorie</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button"
                      onClick={() => setForm(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                      className={`px-4 py-2 rounded-xl text-sm transition-all active:scale-95 ${form.category === cat ? 'bg-brand-gradient text-night font-bold' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Ou saisissez librement…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal" />
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">
                  Date <span className="text-white/30">(vide = affiché tous les jours)</span>
                </label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-teal" />
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2 flex items-center gap-1">
                  <Clock size={13} /> Créneau <span className="text-pink-400">*</span>
                </label>
                <div className="space-y-2">
                  {SLOTS.map((s, si) => {
                    const count  = countInSlot(si) - (editId && slotMap[si]?.find(b => b._id === editId) ? 1 : 0);
                    const full   = count >= MAX_PER_SLOT;
                    const active = form.slot === si;
                    return (
                      <button key={si} type="button"
                        disabled={full && !active}
                        onClick={() => setForm(f => ({ ...f, slot: si }))}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all border active:scale-95 ${
                          active ? 'bg-pink-500/25 border-pink-400/60 text-pink-200' :
                          full   ? 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed' :
                                   'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}>
                        <span>{s.label}</span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          full ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/40'
                        }`}>
                          <Users size={10} /> {count}/{MAX_PER_SLOT} {full ? '· Complet' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                  form.active ? 'bg-teal/10 border-teal/30 text-teal' : 'bg-white/5 border-white/10 text-white/40'
                }`}>
                <span className="text-sm font-medium">Actif (affiché sur le TV)</span>
                <div className={`w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-teal' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full m-1 transition-transform ${form.active ? 'translate-x-4' : ''}`} />
                </div>
              </button>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3.5 border border-white/20 rounded-xl text-white/60 text-sm font-medium active:scale-95 transition-all">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 py-3.5 bg-brand-gradient text-night font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Check size={16} /> Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste — cartes tactiles */}
      <div className="space-y-3">
        {birthdays.map(b => {
          const isToday  = !b.date || b.date === todayStr;
          const slotInfo = b.slot >= 0 ? SLOTS[b.slot] : null;
          return (
            <div key={b._id}
              className={`bg-white/5 border rounded-2xl px-4 py-4 transition-all ${b.active ? 'border-pink-500/20' : 'border-white/5 opacity-50'}`}>
              <div className="flex items-start gap-3">
                <span className="text-3xl mt-0.5">🎂</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-lg">{b.name}</span>
                    {b.category && <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full">{b.category}</span>}
                    {isToday && b.active && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Affiché aujourd'hui</span>}
                    {!b.active && <span className="text-xs bg-white/10 text-white/30 px-2 py-0.5 rounded-full">Inactif</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {b.date && <p className="text-white/30 text-xs">{new Date(b.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                    {slotInfo && (
                      <span className="flex items-center gap-1 text-xs text-pink-400/60">
                        <Clock size={10} /> {slotInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions — grandes cibles tactiles */}
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleActive(b)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    b.active ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-white/8 text-white/40 border border-white/10'
                  }`}>
                  {b.active ? '✓ Actif' : 'Inactif'}
                </button>
                <button onClick={() => openEdit(b)}
                  className="flex-1 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white/60 text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/12">
                  <Pencil size={15} /> Modifier
                </button>
                <button onClick={() => remove(b._id)}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400/70 hover:text-red-400 active:scale-95 transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {birthdays.length === 0 && (
          <div className="text-center py-16 text-white/20">
            <Cake size={40} className="mx-auto mb-3 opacity-40" />
            Aucun anniversaire enregistré
          </div>
        )}
      </div>
    </div>
  );
}
