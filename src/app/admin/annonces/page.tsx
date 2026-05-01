'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, ImageIcon, X, Check, Eye, EyeOff, Video, MessageSquare } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type AnnType = 'image' | 'video' | 'message';

interface Announcement {
  _id: string;
  type: AnnType;
  title: string;
  imageUrl: string;
  videoUrl: string;
  eventName: string;
  eventTime: string;
  eventLocation: string;
  eventImage: string;
  eventColor: string;
  active: boolean;
  order: number;
}

const COLORS = ['#0fa3a3','#e11d48','#f59e0b','#8b5cf6','#10b981','#3b82f6','#f97316'];

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ocorner_token');
}

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const emptyForm = {
  type: 'image' as AnnType,
  title: '',
  videoUrl: '',
  eventName: '',
  eventTime: '',
  eventLocation: '',
  eventColor: '#0fa3a3',
};

export default function AnnoncesPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [eventPreview, setEventPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const eventFileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const res = await fetch(`${BASE}/api/announcements?all=1`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    setItems(await res.json());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setForm(emptyForm);
    setFile(null); setPreview(null);
    setEventFile(null); setEventPreview(null);
    setError('');
    setShowForm(true);
  };

  const uploadFile = async (f: File): Promise<string> => {
    const fd = new FormData();
    fd.append('image', f);
    const res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    if (!res.ok) throw new Error('Erreur upload');
    const { url } = await res.json();
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true); setError('');
    try {
      let imageUrl = '';
      let eventImage = '';

      if (form.type === 'image') {
        if (!file) { setError('Veuillez choisir une image'); setUploading(false); return; }
        imageUrl = await uploadFile(file);
      }
      if (form.type === 'message' && eventFile) {
        eventImage = await uploadFile(eventFile);
      }
      if (form.type === 'video' && !getYouTubeId(form.videoUrl)) {
        setError('URL YouTube invalide'); setUploading(false); return;
      }

      const payload: Record<string, unknown> = { ...form, imageUrl, eventImage, active: true };

      await fetch(`${BASE}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      await fetchAll();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (item: Announcement) => {
    await fetch(`${BASE}/api/announcements/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...item, active: !item.active }),
    });
    await fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await fetch(`${BASE}/api/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await fetchAll();
  };

  const typeLabel = (t: AnnType) => t === 'image' ? '🖼️ Image' : t === 'video' ? '▶️ Vidéo' : '📣 Message';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={28} className="text-teal" /> Annonces Physiques
          </h1>
          <p className="text-white/40 mt-1">Images, vidéos et messages affichés sur les écrans TV</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm hover:opacity-90">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Nouvelle annonce</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-white/40" /></button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {(['image','video','message'] as AnnType[]).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.type === t ? 'border-teal bg-teal/10 text-teal' : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}>
                  {t === 'image' ? <ImageIcon size={18} /> : t === 'video' ? <Video size={18} /> : <MessageSquare size={18} />}
                  {t === 'image' ? 'Image' : t === 'video' ? 'Vidéo YouTube' : 'Message'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Titre commun */}
              <div>
                <label className="text-sm text-white/60 block mb-1">Titre {form.type !== 'message' && '(optionnel)'}</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={form.type === 'message' ? 'Ex: PSG vs Arsenal' : 'Titre affiché à l\'écran'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
              </div>

              {/* IMAGE */}
              {form.type === 'image' && (
                <div>
                  <label className="text-sm text-white/60 block mb-1">Image <span className="text-teal">*</span></label>
                  <div onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/10 hover:border-teal/50 rounded-xl cursor-pointer transition-colors overflow-hidden">
                    {preview ? (
                      <img src={preview} alt="preview" className="w-full max-h-48 object-contain bg-black/30" />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-white/30">
                        <ImageIcon size={36} />
                        <p className="text-sm">Cliquer pour choisir</p>
                        <p className="text-xs">1920×1080 px recommandé · max 5 Mo</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }}} />
                </div>
              )}

              {/* VIDEO */}
              {form.type === 'video' && (
                <div>
                  <label className="text-sm text-white/60 block mb-1">URL YouTube <span className="text-teal">*</span></label>
                  <input value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
                  {form.videoUrl && getYouTubeId(form.videoUrl) && (
                    <div className="mt-2 rounded-xl overflow-hidden aspect-video">
                      <iframe src={`https://www.youtube.com/embed/${getYouTubeId(form.videoUrl)}?autoplay=0`}
                        className="w-full h-full" allowFullScreen />
                    </div>
                  )}
                </div>
              )}

              {/* MESSAGE */}
              {form.type === 'message' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-white/60 block mb-1">Compétition / Événement</label>
                      <input value={form.eventName} onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))}
                        placeholder="Ex: Ligue des Champions"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
                    </div>
                    <div>
                      <label className="text-sm text-white/60 block mb-1">Heure</label>
                      <input value={form.eventTime} onChange={e => setForm(f => ({ ...f, eventTime: e.target.value }))}
                        placeholder="Ex: 21h00"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Lieu</label>
                    <input value={form.eventLocation} onChange={e => setForm(f => ({ ...f, eventLocation: e.target.value }))}
                      placeholder="Ex: OCORNER"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal" />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 block mb-2">Couleur du thème</label>
                    <div className="flex gap-2">
                      {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setForm(f => ({ ...f, eventColor: c }))}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${form.eventColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Image (optionnel)</label>
                    <div onClick={() => eventFileRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/10 hover:border-teal/50 rounded-xl cursor-pointer transition-colors overflow-hidden">
                      {eventPreview ? (
                        <img src={eventPreview} alt="preview" className="w-full max-h-36 object-contain bg-black/30" />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 gap-1 text-white/30">
                          <ImageIcon size={28} />
                          <p className="text-xs">Logo ou affiche de l'événement</p>
                        </div>
                      )}
                    </div>
                    <input ref={eventFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setEventFile(f); setEventPreview(URL.createObjectURL(f)); }}} />
                  </div>

                  {/* Preview carte */}
                  {form.title && (
                    <div className="rounded-2xl overflow-hidden border mt-2" style={{ borderColor: form.eventColor + '40', background: form.eventColor + '10' }}>
                      <div className="px-6 py-5 flex items-center gap-5">
                        {eventPreview && <img src={eventPreview} className="w-20 h-20 object-contain rounded-xl" />}
                        <div>
                          <p className="text-white font-black text-2xl">{form.title}</p>
                          {form.eventName && <p className="font-bold mt-0.5" style={{ color: form.eventColor }}>{form.eventName}</p>}
                          <div className="flex gap-4 mt-2 text-white/60 text-sm">
                            {form.eventTime && <span>🕐 {form.eventTime}</span>}
                            {form.eventLocation && <span>📍 {form.eventLocation}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-white/20 rounded-xl text-white/60 text-sm">Annuler</button>
                <button type="submit" disabled={uploading} className="flex-1 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {uploading ? <div className="w-4 h-4 border-2 border-night border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                  {uploading ? 'Upload…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune annonce configurée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {items.map((item, idx) => (
            <div key={item._id} className={`group relative rounded-2xl border overflow-hidden transition-all ${item.active ? 'border-teal/30' : 'border-white/10 opacity-60'}`}>

              {/* Aperçu */}
              {item.type === 'image' && item.imageUrl && (
                <img src={`${BASE}${item.imageUrl}`} alt={item.title || `Annonce ${idx + 1}`}
                  className="w-full aspect-video object-cover bg-black" />
              )}
              {item.type === 'video' && item.videoUrl && (
                <div className="w-full aspect-video bg-black flex items-center justify-center">
                  <img src={`https://img.youtube.com/vi/${getYouTubeId(item.videoUrl)}/hqdefault.jpg`}
                    className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl ml-1">▶</span>
                    </div>
                  </div>
                </div>
              )}
              {item.type === 'message' && (
                <div className="aspect-video flex items-center justify-center p-6"
                  style={{ background: (item.eventColor || '#0fa3a3') + '15' }}>
                  <div className="text-center">
                    {item.eventImage && <img src={`${BASE}${item.eventImage}`} className="h-16 object-contain mx-auto mb-3" />}
                    <p className="text-white font-black text-2xl">{item.title}</p>
                    {item.eventName && <p className="font-bold text-lg mt-1" style={{ color: item.eventColor }}>{item.eventName}</p>}
                    <div className="flex justify-center gap-4 mt-2 text-white/60 text-sm">
                      {item.eventTime && <span>🕐 {item.eventTime}</span>}
                      {item.eventLocation && <span>📍 {item.eventLocation}</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 mr-2">{typeLabel(item.type)}</span>
                  {item.title && <span className="text-white text-sm font-semibold">{item.title}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(item)} className="p-2 rounded-lg bg-black/40 hover:bg-white/10">
                    {item.active ? <Eye size={15} className="text-teal" /> : <EyeOff size={15} className="text-white/40" />}
                  </button>
                  <button onClick={() => remove(item._id)} className="p-2 rounded-lg bg-black/40 hover:bg-red-500/20">
                    <Trash2 size={15} className="text-red-400/60" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
