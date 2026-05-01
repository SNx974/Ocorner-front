'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Users, QrCode, Trash2, CheckCircle, Circle, X, ChevronDown, ChevronUp, Lock, Unlock, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const TOTAL_PRICE = 110;
const TERRAINS    = [1, 2, 3, 4, 5, 6];

interface Player { name: string; paid: boolean; }
interface Session {
  _id: string; terrain: number; responsible: string;
  players: Player[]; totalPrice: number; closed: boolean;
  createdAt: string;
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function FutsalSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [qrTerrain, setQrTerrain]   = useState<number | null>(null);
  const [menuUrl, setMenuUrl]       = useState('');

  const fetchSessions = useCallback(async () => {
    const data = await api.get('/api/futsal-sessions');
    setSessions(data);
  }, []);

  useEffect(() => {
    fetchSessions();
    // Get base URL for QR codes
    api.get('/api/settings/menu_url').then(r => {
      const base = r.value ? r.value.replace(/\/$/, '') : (typeof window !== 'undefined' ? window.location.origin : '');
      setMenuUrl(base);
    });

    const socket = getSocket();
    socket.on('futsal:session:new',    (s: Session) => setSessions(p => [s, ...p]));
    socket.on('futsal:session:update', (s: Session) => setSessions(p => p.map(x => x._id === s._id ? s : x)));
    socket.on('futsal:session:delete', ({ id }: { id: string }) => setSessions(p => p.filter(x => x._id !== id)));
    return () => {
      socket.off('futsal:session:new');
      socket.off('futsal:session:update');
      socket.off('futsal:session:delete');
    };
  }, [fetchSessions]);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const togglePaid = async (sessionId: string, playerIdx: number) => {
    const data = await api.patch(`/api/futsal-sessions/${sessionId}/players/${playerIdx}`, {});
    setSessions(p => p.map(s => s._id === sessionId ? data : s));
  };

  const toggleClose = async (sessionId: string) => {
    const data = await api.patch(`/api/futsal-sessions/${sessionId}/close`, {});
    setSessions(p => p.map(s => s._id === sessionId ? data : s));
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Supprimer cette session ?')) return;
    await api.delete(`/api/futsal-sessions/${id}`);
    setSessions(p => p.filter(s => s._id !== id));
  };

  // Stats globales
  const totalPaid   = sessions.reduce((acc, s) => acc + s.players.filter(p => p.paid).length, 0);
  const totalPlayers = sessions.reduce((acc, s) => acc + s.players.length, 0);
  const totalRevenue = sessions.reduce((acc, s) => {
    const price = TOTAL_PRICE / s.players.length;
    return acc + s.players.filter(p => p.paid).length * price;
  }, 0);

  // Group by terrain
  const byTerrain = sessions.reduce<Record<number, Session[]>>((acc, s) => {
    if (!acc[s.terrain]) acc[s.terrain] = [];
    acc[s.terrain].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users size={28} className="text-green-400" /> Sessions Futsal
          </h1>
          <p className="text-white/40 mt-1">Inscription par QR code · Gestion des paiements</p>
        </div>
        <button onClick={() => setQrTerrain(qrTerrain ? null : 1)}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500/20 border border-green-500/30 text-green-400 font-bold rounded-xl text-sm hover:bg-green-500/30 transition-colors">
          <QrCode size={16} /> QR Codes
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Sessions', value: sessions.length, color: 'text-white' },
          { label: 'Joueurs payés', value: `${totalPaid} / ${totalPlayers}`, color: 'text-green-400' },
          { label: 'Revenus', value: `${totalRevenue.toFixed(0)}€`, color: 'text-teal' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
            <p className="text-white/40 text-sm">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* QR Codes panel */}
      {qrTerrain !== null && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">QR Codes par terrain</h2>
            <button onClick={() => setQrTerrain(null)}><X size={18} className="text-white/40" /></button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {TERRAINS.map(t => (
              <div key={t} className="flex flex-col items-center gap-3 bg-white/5 rounded-xl p-4">
                <p className="font-bold text-white">Terrain {t}</p>
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={`${menuUrl}/futsal/${t}`} size={120} bgColor="#fff" fgColor="#0a0d1f" level="M" />
                </div>
                <p className="text-white/30 text-xs text-center break-all">/futsal/{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune session en cours</p>
          <p className="text-sm mt-1">Les inscriptions via QR code apparaîtront ici en temps réel</p>
        </div>
      ) : (
        Object.entries(byTerrain).sort(([a], [b]) => Number(a) - Number(b)).map(([terrain, terrainSessions]) => (
          <div key={terrain} className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
              <span className="text-green-400">⚽</span> Terrain {terrain}
            </h2>
            <div className="space-y-3">
              {terrainSessions.map(session => {
                const paidCount  = session.players.filter(p => p.paid).length;
                const priceEach  = (TOTAL_PRICE / session.players.length).toFixed(2);
                const totalPaidAmt = (paidCount * TOTAL_PRICE / session.players.length).toFixed(0);
                const isExpanded = expanded.has(session._id);

                return (
                  <div key={session._id}
                    className={`border rounded-2xl overflow-hidden transition-all ${session.closed ? 'border-white/5 opacity-60' : 'border-white/10'} bg-white/3`}>

                    {/* Header session */}
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                      onClick={() => toggleExpand(session._id)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold text-lg">{session.responsible}</span>
                          {session.closed && <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">Fermée</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-white/40 text-sm">{session.players.length} joueurs · {priceEach}€/j</span>
                          <span className={`text-sm font-bold ${paidCount === session.players.length ? 'text-green-400' : 'text-white/60'}`}>
                            {paidCount}/{session.players.length} payés · {totalPaidAmt}€
                          </span>
                          <span className="text-white/20 text-xs">{timeAgo(session.createdAt)}</span>
                        </div>
                      </div>

                      {/* Progress bar paiement */}
                      <div className="w-24">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${(paidCount / session.players.length) * 100}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); router.push(`/admin/futsal-sessions/${session._id}`); }}
                          className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title="Vue tablette">
                          <Smartphone size={15} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); toggleClose(session._id); }}
                          className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title={session.closed ? 'Rouvrir' : 'Fermer'}>
                          {session.closed ? <Unlock size={15} /> : <Lock size={15} />}
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteSession(session._id); }}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                        {isExpanded ? <ChevronUp size={18} className="text-white/30" /> : <ChevronDown size={18} className="text-white/30" />}
                      </div>
                    </div>

                    {/* Liste joueurs */}
                    {isExpanded && (
                      <div className="border-t border-white/10 px-5 py-4">
                        <div className="grid grid-cols-2 gap-2">
                          {session.players.map((player, idx) => (
                            <button key={idx}
                              onClick={() => togglePaid(session._id, idx)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                                player.paid
                                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                  : 'bg-white/3 border-white/10 text-white/70 hover:bg-white/8'
                              }`}>
                              {player.paid
                                ? <CheckCircle size={18} className="text-green-400 shrink-0" />
                                : <Circle size={18} className="text-white/20 shrink-0" />}
                              <span className="font-medium text-sm flex-1">{player.name}</span>
                              <span className={`text-xs font-bold shrink-0 ${player.paid ? 'text-green-400' : 'text-white/30'}`}>
                                {player.paid ? `${priceEach}€ ✓` : `${priceEach}€`}
                              </span>
                            </button>
                          ))}
                        </div>
                        {paidCount === session.players.length && (
                          <div className="mt-3 text-center text-green-400 text-sm font-bold">
                            ✅ Tous les joueurs ont payé · Total {TOTAL_PRICE}€
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
