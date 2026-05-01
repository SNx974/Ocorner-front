'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getCurrentSlotIndex, SLOTS } from '@/lib/birthdaySlots';

// Extend window for YouTube IFrame API
declare global {
  interface Window {
    YT: { Player: new (el: string | HTMLElement, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady: () => void;
  }
}
interface YTPlayer { destroy(): void; }
interface YTEvent { data: number; }

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Birthday { _id: string; name: string; category: string; date: string; active: boolean; slot: number; }
interface Reservation { terrain: number; name: string; }
interface FutsalSlot { _id: string; hour: number; reservations: Reservation[]; active: boolean; }
interface Announcement {
  _id: string; type: 'image' | 'video' | 'message';
  title: string; imageUrl: string; videoUrl: string;
  eventName: string; eventTime: string; eventLocation: string;
  eventImage: string; eventColor: string; active: boolean;
}

type SlideKind = 'announcement' | 'birthdays' | 'futsal';
interface Slide { kind: SlideKind; announcement?: Announcement; }

const SLIDE_DELAY   = 13000;
const FADE_DURATION = 1200;
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, '0');

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function TVAnnoncesPage() {
  const [birthdays, setBirthdays]         = useState<Birthday[]>([]);
  const [futsalSlots, setFutsalSlots]     = useState<FutsalSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [slideIdx, setSlideIdx]           = useState(0);
  const [visible, setVisible]             = useState(true);
  const [progress, setProgress]           = useState(0);
  const [time, setTime]                   = useState('');
  const [birthdayEmoji, setBirthdayEmoji] = useState(true);
  const [slotIndex, setSlotIndex]         = useState(getCurrentSlotIndex());

  const timerRef    = useRef<ReturnType<typeof setInterval>>();
  const progressRef = useRef<ReturnType<typeof setInterval>>();
  const slidesRef   = useRef<Slide[]>([]);
  const slideIdxRef = useRef(0);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytApiReady  = useRef(false);

  const fetchData = useCallback(async () => {
    const today = toDateStr(new Date());
    const [births, futsal, ann] = await Promise.all([
      api.get('/api/birthdays'),
      api.get(`/api/futsal?date=${today}`),
      fetch(`${BASE}/api/announcements`).then(r => r.json()),
    ]);
    setBirthdays(births);
    setFutsalSlots(futsal);
    setAnnouncements(ann);
  }, []);

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('menu:update', fetchData);
    const clock = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setSlotIndex(getCurrentSlotIndex());
    }, 10000);
    setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    const emoji = setInterval(() => setBirthdayEmoji(v => !v), 800);
    return () => { socket.off('menu:update', fetchData); clearInterval(clock); clearInterval(emoji); };
  }, [fetchData]);

  const currentHour   = new Date().getHours();
  const todayStr      = toDateStr(new Date());
  const relevantSlots = futsalSlots.filter(s => s.active && s.reservations.length > 0 && s.hour >= currentHour).slice(0, 4);
  const slotBirthdays = birthdays.filter(b => b.active && (!b.date || b.date === todayStr) && b.slot === slotIndex).slice(0, 5);

  const slides: Slide[] = [
    ...announcements.map(a => ({ kind: 'announcement' as SlideKind, announcement: a })),
    ...(slotBirthdays.length ? [{ kind: 'birthdays' as SlideKind }] : []),
    ...(relevantSlots.length ? [{ kind: 'futsal' as SlideKind }] : []),
  ];

  // Keep refs in sync for use in event listeners
  slidesRef.current  = slides;
  slideIdxRef.current = slideIdx;

  const goNext = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(progressRef.current);
    // Destroy YT player before React re-renders to avoid removeChild conflict
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch { /**/ }
      ytPlayerRef.current = null;
    }
    setVisible(false);
    setTimeout(() => {
      setSlideIdx(i => {
        const next = (i + 1) % (slidesRef.current.length || 1);
        slideIdxRef.current = next;
        return next;
      });
      setVisible(true);
      setProgress(0);
    }, FADE_DURATION);
  }, []);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (document.getElementById('yt-api-script')) { ytApiReady.current = !!window.YT; return; }
    const script = document.createElement('script');
    script.id  = 'yt-api-script';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
    window.onYouTubeIframeAPIReady = () => { ytApiReady.current = true; };
  }, []);

  // Start timer for non-video slides / init YT player for video slides
  useEffect(() => {
    if (!slides.length) return;
    const current = slides[slideIdx % slides.length];
    const isVid   = current?.kind === 'announcement' && current.announcement?.type === 'video';
    const vidId   = isVid ? getYouTubeId(current.announcement!.videoUrl) : null;

    clearInterval(timerRef.current);
    clearInterval(progressRef.current);
    setProgress(0);

    // Destroy previous YT player
    if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch { /**/ } ytPlayerRef.current = null; }

    if (isVid && vidId) {
      // Fallback: advance after 10 minutes max if API doesn't fire
      const fallback = setTimeout(goNext, 10 * 60 * 1000);

      const init = () => {
        if (!document.getElementById('yt-player-div')) { clearTimeout(fallback); return; }
        try {
          ytPlayerRef.current = new window.YT.Player('yt-player-div', {
            videoId: vidId,
            playerVars: {
              autoplay: 1, mute: 1, controls: 0, disablekb: 1,
              rel: 0, iv_load_policy: 3, modestbranding: 1,
              playsinline: 1, fs: 0, vq: 'hd1080',
            },
            events: {
              onStateChange: (e: YTEvent) => {
                if (e.data === 0) { clearTimeout(fallback); goNext(); }
              },
              onError: () => { clearTimeout(fallback); goNext(); },
            },
          });
        } catch { clearTimeout(fallback); goNext(); }
      };

      if (window.YT?.Player) { init(); }
      else { window.onYouTubeIframeAPIReady = () => { ytApiReady.current = true; init(); }; }
      return () => clearTimeout(fallback);
    }

    if (slides.length <= 1) return;
    timerRef.current    = setInterval(goNext, SLIDE_DELAY);
    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 100 / (SLIDE_DELAY / 100), 100));
    }, 100);
    return () => { clearInterval(timerRef.current); clearInterval(progressRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIdx, slides.length]);

  const safeIdx = slides.length ? slideIdx % slides.length : 0;
  const current = slides[safeIdx];
  const isEmpty = !slides.length;
  const isFullscreen = current?.kind === 'announcement';
  const isVideo = current?.kind === 'announcement' && current.announcement?.type === 'video';
  const count   = slotBirthdays.length;

  const nameSize = count === 1 ? 'text-[8vw]' : count === 2 ? 'text-[5.5vw]' : count === 3 ? 'text-[4.5vw]' : 'text-[3.8vw]';
  const catSize  = count === 1 ? 'text-[2.8vw]' : count === 2 ? 'text-[2.2vw]' : 'text-[1.8vw]';
  const padY     = count === 1 ? 'py-12' : count === 2 ? 'py-8' : 'py-5';
  const gridCls  = count <= 2 ? `grid grid-cols-${Math.max(count,1)}` : count === 3 ? 'grid grid-cols-3' : count === 4 ? 'grid grid-cols-2' : 'grid grid-cols-3';

  return (
    <div className="min-h-screen bg-night flex flex-col overflow-hidden cursor-none" style={{ height: '100vh' }}>

      {!isFullscreen && (
        <div className="flex items-center justify-between px-12 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <img src="/OCORNER.png" alt="OCORNER" className="h-10 object-contain" />
            <span className="text-white/20 text-2xl">·</span>
            <span className="text-white/40 text-xl font-medium uppercase tracking-widest">Annonces</span>
          </div>
          <div>
            {current?.kind === 'birthdays' && <span className="text-3xl font-bold text-pink-300">🎂 Anniversaires {birthdayEmoji ? '🎉' : '  '}</span>}
            {current?.kind === 'futsal'    && <span className="text-3xl font-bold text-green-400">⚽ Futsal — Réservations</span>}
          </div>
          <div className="text-4xl font-bold text-white tabular-nums">{time}</div>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease` }}>

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-white/20">
            <span className="text-8xl">📋</span>
            <p className="text-3xl">Aucune annonce pour le moment</p>
          </div>
        )}

        {/* ANNOUNCEMENT */}
        {current?.kind === 'announcement' && current.announcement && (() => {
          const ann = current.announcement;
          const color = ann.eventColor || '#0fa3a3';

          if (ann.type === 'image') return (
            <div className="absolute inset-0 bg-black">
              <img src={`${BASE}${ann.imageUrl}`} alt={ann.title} className="w-full h-full object-contain" />
              {ann.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-16 py-10">
                  <p className="text-white text-4xl font-bold">{ann.title}</p>
                </div>
              )}
              <div className="absolute top-6 right-8 text-white/70 text-3xl font-bold tabular-nums bg-black/50 px-5 py-2.5 rounded-2xl backdrop-blur-sm">
                {time}
              </div>
            </div>
          );

          if (ann.type === 'video') {
            return (
              <div key={`video-${ann._id}`} className="absolute inset-0 bg-black" style={{ pointerEvents: 'none', overflow: 'hidden' }}>
                <div id="yt-player-div"
                  style={{ position: 'absolute', top: '-10%', left: '-5%', width: '110%', height: '120%', pointerEvents: 'none' }} />
              </div>
            );
          }

          if (ann.type === 'message') return (
            <div className="absolute inset-0" style={{ background: '#0a0d1f' }}>
              {ann.eventImage && (
                <>
                  <img src={`${BASE}${ann.eventImage}`} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.15 }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a0d1fE0 0%, #0a0d1f90 50%, #0a0d1fE0 100%)' }} />
                </>
              )}
              <div className="absolute inset-0" style={{
                background: `radial-gradient(ellipse at 20% 50%, ${color}30 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, ${color}20 0%, transparent 55%)`
              }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-24 text-center">
                {ann.eventImage && (
                  <img src={`${BASE}${ann.eventImage}`} alt="" className="h-40 object-contain mb-8 rounded-2xl"
                    style={{ filter: `drop-shadow(0 0 50px ${color}90)` }} />
                )}
                <p className="text-[2.2vw] font-bold uppercase tracking-[0.3em] mb-4" style={{ color }}>{ann.eventName}</p>
                <p className="text-[8vw] font-black text-white leading-none tracking-tight">{ann.title}</p>
                <div className="flex items-center gap-12 mt-10">
                  {ann.eventTime && (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                        style={{ background: color + '25', border: `2px solid ${color}50` }}>🕐</div>
                      <div className="text-left">
                        <p className="text-white/40 text-sm uppercase tracking-widest">Heure</p>
                        <p className="text-white text-4xl font-bold">{ann.eventTime}</p>
                      </div>
                    </div>
                  )}
                  {ann.eventLocation && (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                        style={{ background: color + '25', border: `2px solid ${color}50` }}>📍</div>
                      <div className="text-left">
                        <p className="text-white/40 text-sm uppercase tracking-widest">Lieu</p>
                        <p className="text-white text-4xl font-bold">{ann.eventLocation}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-10 h-1.5 w-64 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              </div>
              <div className="absolute top-6 right-8 text-white/70 text-3xl font-bold tabular-nums bg-black/40 px-5 py-2.5 rounded-2xl backdrop-blur-sm">
                {time}
              </div>
            </div>
          );
          return null;
        })()}

        {/* ANNIVERSAIRES */}
        {current?.kind === 'birthdays' && slotBirthdays.length > 0 && (
          <div className="flex flex-col items-center justify-center gap-5 w-full h-full px-12 py-8">
            <p className="text-[2vw] text-white/40 font-medium tracking-widest uppercase text-center shrink-0"
               style={{ animation: 'fadeSlideUp 0.8s ease both' }}>
              {count === 1 ? "Nous fêtons l'anniversaire de" : "Nous fêtons les anniversaires de"}
            </p>
            <div className={`${gridCls} gap-4 w-full max-w-7xl`} style={{ flex: '1 1 auto', minHeight: 0 }}>
              {slotBirthdays.map((b, i) => (
                <div key={b._id}
                  className={`relative overflow-hidden rounded-3xl border border-pink-500/30 bg-pink-500/10 text-center flex flex-col items-center justify-center ${count === 5 && i === 3 ? 'col-start-1' : ''} ${count === 5 && i === 4 ? 'col-start-2' : ''}`}
                  style={{ animation: `fadeSlideUp 0.9s ease ${i * 160}ms both`, minHeight: 0 }}>
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_#ec4899_0%,_transparent_70%)]" />
                  <div className={`relative ${padY} px-6`}>
                    <p className={`${nameSize} font-black text-white tracking-tight leading-none`}>{b.name}</p>
                    {b.category && <p className={`${catSize} text-pink-300 font-semibold mt-2`}>{b.category}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 shrink-0" style={{ animation: 'fadeSlideUp 1s ease 400ms both' }}>
              {['🎂','🎉','🥳','🎈','🎊','🎁','✨'].map((e, i) => (
                <span key={i} className="text-4xl" style={{ animation: `floatBounce 2.2s ease-in-out ${i * 0.22}s infinite alternate` }}>{e}</span>
              ))}
            </div>
            {slotIndex >= 0 && <p className="text-[1.3vw] text-white/20 tracking-wider shrink-0">Créneau {SLOTS[slotIndex].label}</p>}
          </div>
        )}

        {/* FUTSAL */}
        {current?.kind === 'futsal' && (
          <div className="flex flex-col gap-5 justify-center h-full px-12 py-8">
            {relevantSlots.map((slot, si) => (
              <div key={slot._id} className="bg-green-500/5 border border-green-500/25 rounded-3xl px-10 py-7 flex items-center gap-10"
                   style={{ animation: `fadeSlideUp 0.8s ease ${si * 150}ms both` }}>
                <div className="shrink-0 w-32 text-center">
                  <span className="text-7xl font-black text-green-400 tabular-nums">{pad(slot.hour)}h</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-5">
                  {slot.reservations.slice().sort((a, b) => a.terrain - b.terrain).map((r, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-8 py-5"
                         style={{ animation: `fadeSlideUp 0.8s ease ${si * 150 + i * 100}ms both` }}>
                      <div className="w-14 h-14 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-green-400 font-black text-2xl">{r.terrain}</span>
                      </div>
                      <div>
                        <p className="text-white/40 text-base font-medium">Terrain {r.terrain}</p>
                        <p className="text-white text-3xl font-bold">{r.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dots + progress — cachés pendant vidéo */}
      {!isVideo && slides.length > 1 && (
        <>
          {!isFullscreen && (
            <div className="shrink-0">
              <div className="flex justify-center gap-2 py-2">
                {slides.map((_, i) => (
                  <div key={i} className="rounded-full transition-all duration-500"
                    style={{ width: i === safeIdx ? 24 : 8, height: 8, background: i === safeIdx ? 'white' : 'rgba(255,255,255,0.2)' }} />
                ))}
              </div>
              <div className="h-1 bg-white/5">
                <div className="h-full bg-brand-gradient" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
              </div>
            </div>
          )}
          {isFullscreen && (
            <>
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                {slides.map((_, i) => (
                  <div key={i} className="rounded-full transition-all duration-500"
                    style={{ width: i === safeIdx ? 24 : 8, height: 8, background: i === safeIdx ? 'white' : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
                <div className="h-full bg-white/60" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
              </div>
            </>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatBounce {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-22px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
