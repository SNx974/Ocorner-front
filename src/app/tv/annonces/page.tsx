'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getCurrentSlotIndex, SLOTS } from '@/lib/birthdaySlots';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Birthday { _id: string; name: string; category: string; date: string; active: boolean; slot: number; }
interface Reservation { terrain: number; name: string; }
interface FutsalSlot { _id: string; hour: number; reservations: Reservation[]; active: boolean; }
interface Announcement { _id: string; title: string; imageUrl: string; active: boolean; }

type Section = 'birthdays' | 'futsal' | 'images';

const ROTATION_DELAY = 13000;
const IMAGE_DELAY     = 13000;
const FADE_DURATION   = 1500;
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, '0');

export default function TVAnnoncesPage() {
  const [birthdays, setBirthdays]       = useState<Birthday[]>([]);
  const [futsalSlots, setFutsalSlots]   = useState<FutsalSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [section, setSection]           = useState<Section>('birthdays');
  const [sectionVisible, setSectionVisible] = useState(true);

  // Image slideshow
  const [imgCurrent, setImgCurrent] = useState(0);
  const [imgNext, setImgNext]       = useState<number | null>(null);
  const [imgFading, setImgFading]   = useState(false);

  const [time, setTime]             = useState('');
  const [progress, setProgress]     = useState(0);
  const [birthdayEmoji, setBirthdayEmoji] = useState(true);
  const [slotIndex, setSlotIndex]   = useState(getCurrentSlotIndex());

  const timerRef    = useRef<ReturnType<typeof setInterval>>();
  const progressRef = useRef<ReturnType<typeof setInterval>>();
  const imgTimerRef = useRef<ReturnType<typeof setInterval>>();

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

    const clockInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setSlotIndex(getCurrentSlotIndex());
    }, 10000); // refresh slot every 10s

    setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

    const emojiInterval = setInterval(() => setBirthdayEmoji(v => !v), 800);
    return () => {
      socket.off('menu:update', fetchData);
      clearInterval(clockInterval);
      clearInterval(emojiInterval);
    };
  }, [fetchData]);

  const currentHour  = new Date().getHours();
  const todayStr     = toDateStr(new Date());
  const relevantSlots = futsalSlots
    .filter(s => s.active && s.reservations.length > 0 && s.hour >= currentHour)
    .slice(0, 4);

  // Birthdays du créneau actif (slot assigné = slotIndex courant)
  const slotBirthdays = birthdays.filter(
    b => b.active && (!b.date || b.date === todayStr) && b.slot === slotIndex
  ).slice(0, 5);

  const sections: Section[] = [
    ...(slotBirthdays.length ? ['birthdays' as Section] : []),
    ...(relevantSlots.length ? ['futsal' as Section]    : []),
    ...(announcements.length ? ['images' as Section]    : []),
  ];

  // Section rotation
  useEffect(() => {
    if (sections.length <= 1) return;
    setProgress(0);

    timerRef.current = setInterval(() => {
      setSection(prev => {
        const idx  = sections.indexOf(prev);
        const next = sections[(idx + 1) % sections.length];
        setSectionVisible(false);
        setTimeout(() => { setSection(next); setSectionVisible(true); }, 600);
        return prev;
      });
      setProgress(0);
    }, ROTATION_DELAY);

    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 100 / (ROTATION_DELAY / 100), 100));
    }, 100);

    return () => { clearInterval(timerRef.current); clearInterval(progressRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length, slotBirthdays.length, relevantSlots.length, announcements.length]);

  useEffect(() => {
    if (sections.length && !sections.includes(section)) setSection(sections[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  // Image crossfade loop
  useEffect(() => {
    if (section !== 'images' || announcements.length < 2) return;
    setImgCurrent(0); setImgNext(null); setImgFading(false);

    imgTimerRef.current = setInterval(() => {
      setImgCurrent(cur => {
        const next = (cur + 1) % announcements.length;
        setImgNext(next);
        setImgFading(true);
        setTimeout(() => { setImgCurrent(next); setImgNext(null); setImgFading(false); }, FADE_DURATION);
        return cur;
      });
    }, IMAGE_DELAY);

    return () => clearInterval(imgTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, announcements.length]);

  const isEmpty = !slotBirthdays.length && !relevantSlots.length && !announcements.length;
  const count   = slotBirthdays.length;

  // Layout adaptatif selon le nombre de personnes (max 5)
  const nameSize = count === 1 ? 'text-[8vw]'  : count === 2 ? 'text-[5.5vw]' : count === 3 ? 'text-[4.5vw]' : 'text-[3.8vw]';
  const catSize  = count === 1 ? 'text-[2.8vw]': count === 2 ? 'text-[2.2vw]' : 'text-[1.8vw]';
  const padY     = count === 1 ? 'py-12' : count === 2 ? 'py-8' : 'py-5';

  // Disposition : 1→1col, 2→2col, 3→3col, 4→2x2, 5→3+2
  const getGridClass = () => {
    if (count === 1) return 'flex justify-center';
    if (count === 2) return 'grid grid-cols-2';
    if (count === 3) return 'grid grid-cols-3';
    if (count === 4) return 'grid grid-cols-2';
    return 'grid grid-cols-3'; // 5 personnes: 3 en haut + 2 centrés en bas via CSS
  };

  return (
    <div className="min-h-screen bg-night flex flex-col overflow-hidden cursor-none" style={{ height: '100vh' }}>

      {/* Header — masqué pendant image fullscreen */}
      {section !== 'images' && (
        <div className="flex items-center justify-between px-12 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <img src="/OCORNER.png" alt="OCORNER" className="h-10 object-contain" />
            <span className="text-white/20 text-2xl">·</span>
            <span className="text-white/40 text-xl font-medium uppercase tracking-widest">Annonces</span>
          </div>
          <div className="flex items-center gap-3">
            {section === 'birthdays' && slotBirthdays.length > 0 && (
              <span className="text-3xl font-bold text-pink-300">
                🎂 Anniversaires {birthdayEmoji ? '🎉' : '  '}
              </span>
            )}
            {section === 'futsal' && (
              <span className="text-3xl font-bold text-green-400">⚽ Futsal — Réservations</span>
            )}
          </div>
          <div className="text-4xl font-bold text-white tabular-nums">{time}</div>
        </div>
      )}

      {/* Content */}
      <div
        className={`flex-1 flex flex-col overflow-hidden ${section === 'images' ? '' : 'justify-center px-12 py-8'}`}
        style={{
          opacity: section === 'images' ? 1 : sectionVisible ? 1 : 0,
          transition: section === 'images' ? 'none' : 'opacity 0.6s ease',
        }}
      >
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-white/20">
            <span className="text-8xl">📋</span>
            <p className="text-3xl">Aucune annonce pour le moment</p>
          </div>
        )}

        {/* ── ANNIVERSAIRES ── */}
        {!isEmpty && section === 'birthdays' && slotBirthdays.length > 0 && (
          <div className="flex flex-col items-center justify-center gap-5 w-full h-full px-2">

            {/* Titre */}
            <p className="text-[2vw] text-white/40 font-medium tracking-widest uppercase text-center shrink-0"
               style={{ animation: 'fadeSlideUp 0.8s ease both' }}>
              {count === 1 ? "Nous fêtons l'anniversaire de" : "Nous fêtons les anniversaires de"}
            </p>

            {/* Cartes — layout adaptatif */}
            <div className={`${getGridClass()} gap-4 w-full max-w-7xl`}
                 style={{ flex: '1 1 auto', minHeight: 0 }}>
              {slotBirthdays.map((b, i) => (
                <div
                  key={b._id}
                  className={`relative overflow-hidden rounded-3xl border border-pink-500/30 bg-pink-500/10 text-center flex flex-col items-center justify-center ${
                    count === 5 && i === 3 ? 'col-start-1' : ''
                  } ${count === 5 && i === 4 ? 'col-start-2' : ''}`}
                  style={{ animation: `fadeSlideUp 0.9s ease ${i * 160}ms both`, minHeight: 0 }}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_#ec4899_0%,_transparent_70%)]" />
                  <div className={`relative ${padY} px-6`}>
                    <p className={`${nameSize} font-black text-white tracking-tight leading-none`}>{b.name}</p>
                    {b.category && (
                      <p className={`${catSize} text-pink-300 font-semibold mt-2`}>{b.category}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Emojis flottants */}
            <div className="flex gap-6 shrink-0" style={{ animation: 'fadeSlideUp 1s ease 400ms both' }}>
              {['🎂', '🎉', '🥳', '🎈', '🎊', '🎁', '✨'].map((e, i) => (
                <span key={i} className="text-4xl"
                      style={{ animation: `floatBounce 2.2s ease-in-out ${i * 0.22}s infinite alternate` }}>
                  {e}
                </span>
              ))}
            </div>

            {/* Créneau */}
            {slotIndex >= 0 && (
              <p className="text-[1.3vw] text-white/20 tracking-wider shrink-0">
                Créneau {SLOTS[slotIndex].label}
              </p>
            )}
          </div>
        )}

        {/* ── FUTSAL ── */}
        {!isEmpty && section === 'futsal' && (
          <div className="flex flex-col gap-5">
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

        {/* ── IMAGES fullscreen ── */}
        {!isEmpty && section === 'images' && announcements.length > 0 && (
          <div className="relative w-full bg-black" style={{ flex: 1 }}>
            <img
              key={`cur-${imgCurrent}`}
              src={`${BASE}${announcements[imgCurrent]?.imageUrl}`}
              alt={announcements[imgCurrent]?.title || 'Annonce'}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: imgFading ? 0 : 1, transition: `opacity ${FADE_DURATION}ms ease-in-out` }}
            />
            {imgNext !== null && (
              <img
                key={`next-${imgNext}`}
                src={`${BASE}${announcements[imgNext]?.imageUrl}`}
                alt={announcements[imgNext]?.title || 'Annonce'}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: imgFading ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease-in-out` }}
              />
            )}
            {announcements[imgCurrent]?.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-16 py-10">
                <p className="text-white text-4xl font-bold">{announcements[imgCurrent].title}</p>
              </div>
            )}
            <div className="absolute top-6 right-8 text-white/70 text-3xl font-bold tabular-nums bg-black/50 px-5 py-2.5 rounded-2xl backdrop-blur-sm">
              {time}
            </div>
            {announcements.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3">
                {announcements.map((_, i) => (
                  <div key={i} className="rounded-full transition-all duration-700"
                       style={{ width: i === imgCurrent ? 28 : 10, height: 10, background: i === imgCurrent ? 'white' : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs + barre de progression */}
      {section !== 'images' && (
        <div className="shrink-0">
          {sections.length > 1 && (
            <div className="flex justify-center gap-6 py-3 px-12">
              {sections.map(s => (
                <button key={s}
                  onClick={() => { setSectionVisible(false); setTimeout(() => { setSection(s); setSectionVisible(true); }, 300); }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all duration-500 ${
                    s === section ? 'bg-brand-gradient text-night scale-105' : 'bg-white/10 text-white/40'
                  }`}>
                  {s === 'birthdays' ? '🎂 Anniversaires' : s === 'futsal' ? '⚽ Futsal' : '🖼️ Annonces'}
                </button>
              ))}
            </div>
          )}
          <div className="h-1 bg-white/5">
            <div className="h-full bg-brand-gradient" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
          </div>
        </div>
      )}

      {section === 'images' && sections.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10">
          <div className="h-full bg-white/50" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
        </div>
      )}

      <style jsx>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatBounce {
          from { transform: translateY(0)   scale(1);   }
          to   { transform: translateY(-22px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
