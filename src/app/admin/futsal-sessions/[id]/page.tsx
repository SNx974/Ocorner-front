'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Circle, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const TOTAL_PRICE = 110;

interface Player { name: string; paid: boolean; }
interface Session {
  _id: string; terrain: number; responsible: string;
  players: Player[]; totalPrice: number; closed: boolean;
}

export default function SessionDetailPage() {
  const { id }   = useParams() as { id: string };
  const router   = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.get('/api/futsal-sessions');
      const found = data.find((s: Session) => s._id === id);
      setSession(found || null);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchSession();
    const socket = getSocket();
    socket.on('futsal:session:update', (s: Session) => { if (s._id === id) setSession(s); });
    return () => { socket.off('futsal:session:update'); };
  }, [fetchSession, id]);

  const togglePaid = async (idx: number) => {
    if (!session) return;
    const data = await api.patch(`/api/futsal-sessions/${session._id}/players/${idx}`, {});
    setSession(data);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0d1f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-[#0a0d1f] flex flex-col items-center justify-center gap-4 text-white/40">
      <Users size={48} className="opacity-30" />
      <p>Session introuvable</p>
      <button onClick={() => router.back()} className="text-green-400 text-sm">← Retour</button>
    </div>
  );

  const paidCount   = session.players.filter(p => p.paid).length;
  const priceEach   = (TOTAL_PRICE / session.players.length).toFixed(2);
  const totalPaidAmt = (paidCount * TOTAL_PRICE / session.players.length).toFixed(0);
  const allPaid     = paidCount === session.players.length;

  return (
    <div className="min-h-screen bg-[#0a0d1f] text-white">

      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-[#0a0d1f]/95 backdrop-blur-sm border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold text-sm">⚽ Terrain {session.terrain}</span>
            </div>
            <h1 className="text-xl font-black text-white">{session.responsible}</h1>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${allPaid ? 'text-green-400' : 'text-white'}`}>
              {paidCount}/{session.players.length}
            </p>
            <p className="text-white/40 text-xs">{totalPaidAmt}€ / {TOTAL_PRICE}€</p>
          </div>
        </div>

        {/* Barre progression */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(paidCount / session.players.length) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white/30 text-xs">{priceEach}€ / joueur</span>
            <span className="text-white/30 text-xs">{paidCount} payés · {session.players.length - paidCount} restants</span>
          </div>
        </div>
      </div>

      {/* Grille joueurs — grandes tuiles tactiles */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {allPaid && (
          <div className="mb-5 bg-green-500/15 border border-green-500/30 rounded-2xl px-5 py-4 text-center">
            <p className="text-green-400 font-black text-lg">✅ Tous les joueurs ont payé</p>
            <p className="text-green-400/60 text-sm">Total encaissé : {TOTAL_PRICE}€</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {session.players.map((player, idx) => (
            <button key={idx}
              onClick={() => togglePaid(idx)}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border py-6 px-4 transition-all active:scale-95 ${
                player.paid
                  ? 'bg-green-500/15 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                  : 'bg-white/3 border-white/10 hover:bg-white/8'
              }`}
              style={{ minHeight: '110px' }}>

              {/* Indicateur payé */}
              <div className={`absolute top-3 right-3 ${player.paid ? 'text-green-400' : 'text-white/15'}`}>
                {player.paid ? <CheckCircle size={20} /> : <Circle size={20} />}
              </div>

              <span className={`text-center font-bold text-base leading-tight ${player.paid ? 'text-green-300' : 'text-white'}`}>
                {player.name}
              </span>

              <span className={`text-sm font-black ${player.paid ? 'text-green-400' : 'text-white/30'}`}>
                {player.paid ? `${priceEach}€ ✓` : `${priceEach}€`}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-white/20 text-sm mt-6">
          Appuie sur un joueur pour marquer comme payé
        </p>
      </div>
    </div>
  );
}
