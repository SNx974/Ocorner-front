'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X, Check, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface Reservation { terrain: number; name: string; }
interface FutsalSlot { _id: string; hour: number; date: string; reservations: Reservation[]; active: boolean; }

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const formatDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const MAX_TERRAINS = 4;

export default function FutsalPage() {
  const [slots, setSlots] = useState<FutsalSlot[]>([]);
  const [date, setDate] = useState(toDateStr(new Date()));
  const [editSlot, setEditSlot] = useState<{ hour: number; id?: string; reservations: Reservation[]; active: boolean } | null>(null);
  const [error, setError] = useState('');

  const fetchSlots = useCallback(() => api.get(`/api/futsal/admin?date=${date}`).then(setSlots), [date]);

  useEffect(() => {
    fetchSlots();
    const socket = getSocket();
    socket.on('menu:update', fetchSlots);
    return () => { socket.off('menu:update', fetchSlots); };
  }, [fetchSlots]);

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(toDateStr(d));
  };

  const openSlot = (hour: number) => {
    const existing = slots.find(s => s.hour === hour);
    setEditSlot({
      hour,
      id: existing?._id,
      reservations: existing?.reservations ?? [],
      active: existing?.active ?? true,
    });
    setError('');
  };

  const addReservation = () => {
    if (!editSlot) return;
    const nextTerrain = (editSlot.reservations.length > 0
      ? Math.max(...editSlot.reservations.map(r => r.terrain)) + 1
      : 1);
    if (nextTerrain > MAX_TERRAINS) return;
    setEditSlot(s => s ? ({ ...s, reservations: [...s.reservations, { terrain: nextTerrain, name: '' }] }) : s);
  };

  const updateReservation = (i: number, field: keyof Reservation, val: string | number) => {
    setEditSlot(s => s ? ({ ...s, reservations: s.reservations.map((r, j) => j === i ? { ...r, [field]: val } : r) }) : s);
  };

  const removeReservation = (i: number) => {
    setEditSlot(s => s ? ({ ...s, reservations: s.reservations.filter((_, j) => j !== i) }) : s);
  };

  const handleSave = async () => {
    if (!editSlot) return;
    setError('');
    const payload = { date, hour: editSlot.hour, reservations: editSlot.reservations.filter(r => r.name.trim()), active: editSlot.active };
    try {
      if (editSlot.id) await api.put(`/api/futsal/${editSlot.id}`, payload);
      else await api.post('/api/futsal', payload);
      getSocket().emit('admin:update', { type: 'futsal' });
      await fetchSlots();
      setEditSlot(null);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); }
  };

  const deleteSlot = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    await api.delete(`/api/futsal/${id}`);
    getSocket().emit('admin:update', { type: 'futsal' });
    await fetchSlots();
  };

  const slotMap = Object.fromEntries(slots.map(s => [s.hour, s]));

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users size={28} className="text-green-400" /> Futsal — Réservations
          </h1>
          <p className="text-white/40 mt-1">Gérez les créneaux affichés sur le mode TV</p>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-4 mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><ChevronLeft size={20} /></button>
        <div className="flex-1 text-center">
          <p className="text-white font-bold text-lg capitalize">{formatDate(date)}</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 bg-transparent text-white/40 text-sm text-center focus:outline-none cursor-pointer" />
        </div>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><ChevronRight size={20} /></button>
        <button onClick={() => setDate(toDateStr(new Date()))} className="px-3 py-1.5 text-xs bg-teal/20 text-teal rounded-lg hover:bg-teal/30">Aujourd'hui</button>
      </div>

      {/* Slot modal */}
      {editSlot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Créneau {editSlot.hour}h00</h2>
              <button onClick={() => setEditSlot(null)}><X size={20} className="text-white/40" /></button>
            </div>
            <div className="space-y-3 mb-4">
              {editSlot.reservations.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 shrink-0">
                    <span className="text-white/40 text-xs">Terrain</span>
                    <input type="number" min="1" max={MAX_TERRAINS} value={r.terrain} onChange={e => updateReservation(i, 'terrain', parseInt(e.target.value))}
                      className="w-8 bg-transparent text-white text-sm font-bold text-center focus:outline-none" />
                  </div>
                  <input value={r.name} onChange={e => updateReservation(i, 'name', e.target.value)} placeholder="Nom du réservant…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-teal" />
                  <button onClick={() => removeReservation(i)} className="p-2 rounded-lg hover:bg-red-500/10">
                    <X size={14} className="text-red-400/60 hover:text-red-400" />
                  </button>
                </div>
              ))}
              {editSlot.reservations.length < MAX_TERRAINS && (
                <button onClick={addReservation} className="w-full py-2.5 border border-dashed border-white/20 rounded-xl text-white/40 text-sm hover:border-teal/40 hover:text-teal transition-all flex items-center justify-center gap-2">
                  <Plus size={14} /> Ajouter un terrain
                </button>
              )}
              {editSlot.reservations.length === 0 && (
                <p className="text-center text-white/30 text-sm py-4">Aucune réservation — cliquez sur "+ Ajouter un terrain"</p>
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <div onClick={() => setEditSlot(s => s ? ({ ...s, active: !s.active }) : s)} className={`w-10 h-6 rounded-full transition-colors ${editSlot.active ? 'bg-teal' : 'bg-white/20'}`}>
                <div className={`w-4 h-4 bg-white rounded-full m-1 transition-transform ${editSlot.active ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm text-white/60">Afficher sur le TV</span>
            </label>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setEditSlot(null)} className="flex-1 py-2.5 border border-white/20 rounded-xl text-white/60 text-sm">Annuler</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                <Check size={14} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline des créneaux */}
      <div className="grid grid-cols-1 gap-2">
        {HOURS.map(hour => {
          const slot = slotMap[hour];
          const hasReservations = slot && slot.reservations.length > 0;
          return (
            <div key={hour} className={`flex items-center gap-4 rounded-xl px-5 py-3 border transition-all cursor-pointer group
              ${hasReservations && slot.active ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40' : 'bg-white/3 border-white/5 hover:border-white/15'}`}
              onClick={() => openSlot(hour)}
            >
              <div className="w-14 shrink-0 text-center">
                <span className={`text-xl font-black tabular-nums ${hasReservations && slot.active ? 'text-green-400' : 'text-white/20 group-hover:text-white/40'}`}>
                  {hour}h
                </span>
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                {hasReservations ? (
                  slot.reservations.map((r, i) => (
                    <span key={i} className="px-3 py-1 bg-green-500/15 text-green-300 rounded-lg text-sm font-medium">
                      T{r.terrain} · {r.name}
                    </span>
                  ))
                ) : (
                  <span className="text-white/20 text-sm group-hover:text-white/40">Cliquez pour ajouter des réservations…</span>
                )}
                {slot && !slot.active && <span className="text-xs bg-white/10 text-white/30 px-2 py-0.5 rounded-full self-center">Masqué</span>}
              </div>
              {slot && (
                <button onClick={e => { e.stopPropagation(); deleteSlot(slot._id); }} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 transition-all">
                  <Trash2 size={14} className="text-red-400/60" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
