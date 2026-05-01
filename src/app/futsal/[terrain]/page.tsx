'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, Send, Check, Users } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const MIN_PLAYERS = 10;
const TOTAL_PRICE = 110;

export default function FutsalJoinPage() {
  const params  = useParams();
  const terrain = params.terrain as string;

  const [responsible, setResponsible] = useState('');
  const [players, setPlayers]         = useState<string[]>(Array(MIN_PLAYERS).fill(''));
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState('');

  const addPlayer = () => setPlayers(p => [...p, '']);
  const removePlayer = (i: number) => {
    if (players.length <= MIN_PLAYERS) return;
    setPlayers(p => p.filter((_, j) => j !== i));
  };
  const updatePlayer = (i: number, val: string) =>
    setPlayers(p => p.map((v, j) => j === i ? val : v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validPlayers = players.map(p => p.trim()).filter(Boolean);
    if (!responsible.trim()) { setError('Le nom du responsable est requis'); return; }
    if (validPlayers.length < MIN_PLAYERS) { setError(`Minimum ${MIN_PLAYERS} joueurs requis`); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/futsal-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terrain: parseInt(terrain), responsible: responsible.trim(), players: validPlayers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-[#0a0d1f] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-24 h-24 bg-green-500/20 border-2 border-green-500/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Enregistré !</h1>
        <p className="text-white/50">Ton équipe est inscrite sur le terrain {terrain}.</p>
        <p className="text-white/30 text-sm mt-2">Tu peux fermer cette page.</p>
      </div>
    </div>
  );

  const validCount = players.map(p => p.trim()).filter(Boolean).length;
  const pricePerPlayer = validCount >= MIN_PLAYERS ? (TOTAL_PRICE / validCount).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-[#0a0d1f] text-white">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-black text-white">Terrain {terrain}</h1>
          <p className="text-white/40 text-sm mt-1">Inscris ton équipe pour la session</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Responsable */}
          <div>
            <label className="text-sm font-semibold text-white/60 block mb-2 uppercase tracking-wider">Responsable</label>
            <input
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
              placeholder="Ton prénom ou pseudo"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg placeholder:text-white/20 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Joueurs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} /> Joueurs
              </label>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${validCount >= MIN_PLAYERS ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                {validCount} / min {MIN_PLAYERS}
              </span>
            </div>

            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="w-7 text-white/20 text-sm text-right shrink-0">{i + 1}.</span>
                  <input
                    value={p}
                    onChange={e => updatePlayer(i, e.target.value)}
                    placeholder={`Joueur ${i + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-base"
                  />
                  {players.length > MIN_PLAYERS && (
                    <button type="button" onClick={() => removePlayer(i)}
                      className="p-2 text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={addPlayer}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/15 rounded-xl text-white/30 hover:text-white/60 hover:border-white/30 transition-colors text-sm">
              <Plus size={16} /> Ajouter un joueur
            </button>
          </div>

          {/* Prix indicatif */}
          {pricePerPlayer && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-4 flex items-center justify-between">
              <span className="text-white/60 text-sm">Prix par joueur</span>
              <span className="text-green-400 font-black text-2xl">{pricePerPlayer}€</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50">
            {loading
              ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <Send size={20} />}
            {loading ? 'Envoi…' : "Envoyer l'équipe"}
          </button>
        </form>
      </div>
    </div>
  );
}
