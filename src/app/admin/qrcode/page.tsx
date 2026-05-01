'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Save, Download } from 'lucide-react';
import { api } from '@/lib/api';

export default function QRCodePage() {
  const [menuUrl, setMenuUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/settings/menu_url').then(r => {
      setMenuUrl(r.value || (typeof window !== 'undefined' ? window.location.origin + '/' : ''));
      setLoading(false);
    });
  }, []);

  const save = async () => {
    await api.put('/api/settings/menu_url', { value: menuUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const download = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qrcode-menu.svg';
    a.click();
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <QrCode size={28} className="text-teal" /> QR Code Menu
        </h1>
        <p className="text-white/40 mt-1">URL affichée sur l'écran TV et scannable par les clients</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
        <div>
          <label className="text-sm text-white/60 block mb-2">URL du menu</label>
          <input
            value={menuUrl}
            onChange={e => setMenuUrl(e.target.value)}
            placeholder="https://ton-domaine.com/"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal"
          />
          <p className="text-white/30 text-xs mt-1">Cette URL sera encodée dans le QR code affiché sur la TV</p>
        </div>

        {!loading && menuUrl && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG
                id="qr-svg"
                value={menuUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#0a0d1f"
                level="M"
              />
            </div>
            <p className="text-white/40 text-sm text-center break-all">{menuUrl}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={save}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm"
          >
            <Save size={14} /> {saved ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
          <button
            onClick={download}
            className="px-4 py-2.5 border border-white/20 rounded-xl text-white/60 hover:text-white text-sm flex items-center gap-2"
          >
            <Download size={14} /> SVG
          </button>
        </div>
      </div>
    </div>
  );
}
