'use client';

import { useRef, useState } from 'react';
import { X, Upload, Download, Check, AlertCircle, Loader2, FileSpreadsheet, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Category { _id: string; name: string; icon: string; }

interface ParsedRow {
  nom: string;
  description: string;
  prix: number | null;
  categorie: string;
  tags: string;
  allergenes: string;
  visible: boolean;
  _error?: string;
  _catId?: string;
}

interface ImportResult {
  nom: string;
  ok: boolean;
  error?: string;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ocorner_token');
}

// Génère et télécharge un fichier Excel template
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nom', 'Description', 'Prix', 'Catégorie', 'Tags', 'Allergènes', 'Visible'],
    ['Coca-Cola 33cl', 'Boisson gazeuse', 3.50, 'Boissons', 'frais, sucré', '', 'oui'],
    ['Burger Classic', 'Steak haché, salade, tomate', 12.00, 'Burgers', 'maison', 'gluten, lait', 'oui'],
    ['Tiramisu', 'Dessert italien', 6.50, 'Desserts', '', 'gluten, oeufs, lait', 'non'],
  ]);
  ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produits');
  XLSX.writeFile(wb, 'template_produits.xlsx');
}

export default function ImportModal({ categories, onClose, onDone }: { categories: Category[]; onClose: () => void; onDone: () => void; }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]       = useState<ParsedRow[]>([]);
  const [step, setStep]       = useState<'upload' | 'preview' | 'result'>('upload');
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  const catByName = (name: string) =>
    categories.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      const parsed: ParsedRow[] = raw.map((r) => {
        const nom        = String(r['Nom'] || r['nom'] || '').trim();
        const description= String(r['Description'] || r['description'] || '').trim();
        const prixRaw    = r['Prix'] || r['prix'] || r['Price'] || '';
        const prix       = prixRaw !== '' ? parseFloat(String(prixRaw).replace(',', '.')) : null;
        const categorie  = String(r['Catégorie'] || r['Categorie'] || r['categorie'] || r['category'] || '').trim();
        const tags       = String(r['Tags'] || r['tags'] || '').trim();
        const allergenes = String(r['Allergènes'] || r['Allergenes'] || r['allergenes'] || '').trim();
        const visibleRaw = String(r['Visible'] || r['visible'] || 'oui').trim().toLowerCase();
        const visible    = !['non', 'no', 'false', '0'].includes(visibleRaw);

        let error = '';
        if (!nom)              error += 'Nom manquant. ';
        if (prix === null || isNaN(prix)) error += 'Prix invalide. ';
        if (!categorie)        error += 'Catégorie manquante. ';

        const cat = catByName(categorie);
        if (categorie && !cat) error += `Catégorie "${categorie}" introuvable. `;

        return { nom, description, prix, categorie, tags, allergenes, visible, _error: error || undefined, _catId: cat?._id };
      });

      setRows(parsed);
      setStep('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  const onFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) return;
    parseFile(file);
  };

  const validRows  = rows.filter(r => !r._error);
  const errorRows  = rows.filter(r => r._error);

  const runImport = async () => {
    setImporting(true);
    const res: ImportResult[] = [];
    for (const row of validRows) {
      try {
        const resp = await fetch(`${API}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            name: row.nom,
            description: row.description,
            price: row.prix,
            category: row._catId,
            tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            allergens: row.allergenes ? row.allergenes.split(',').map(a => a.trim()).filter(Boolean) : [],
            visible: row.visible,
          }),
        });
        if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Erreur'); }
        res.push({ nom: row.nom, ok: true });
      } catch (e: unknown) {
        res.push({ nom: row.nom, ok: false, error: e instanceof Error ? e.message : 'Erreur' });
      }
    }
    setResults(res);
    setStep('result');
    setImporting(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111530] border border-white/10 rounded-2xl w-full max-w-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={22} className="text-teal" />
            <h2 className="text-xl font-bold">Importer depuis Excel</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-white/40 hover:text-white" /></button>
        </div>

        {/* Étapes */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 text-xs text-white/30">
          {['Fichier', 'Aperçu', 'Résultat'].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`font-semibold ${['upload','preview','result'].indexOf(step) >= i ? 'text-teal' : ''}`}>{i + 1}. {s}</span>
              {i < 2 && <ChevronRight size={12} />}
            </div>
          ))}
        </div>

        <div className="p-6">

          {/* ── ÉTAPE 1 : Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Zone drop */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 py-14 cursor-pointer transition-all ${
                  dragOver ? 'border-teal bg-teal/10' : 'border-white/15 hover:border-teal/50 hover:bg-white/3'
                }`}
              >
                <Upload size={36} className="text-white/30" />
                <p className="text-white/60 font-medium">Glisser un fichier Excel ou cliquer</p>
                <p className="text-white/25 text-sm">.xlsx · .xls · .csv</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
              </div>

              {/* Format attendu */}
              <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-sm text-white/50 space-y-2">
                <p className="font-semibold text-white/70 mb-2">Colonnes attendues dans le fichier :</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['Nom', 'obligatoire'],
                    ['Prix', 'obligatoire (ex: 3.50)'],
                    ['Catégorie', 'obligatoire (nom exact)'],
                    ['Description', 'optionnel'],
                    ['Tags', 'optionnel (virgule)'],
                    ['Allergènes', 'optionnel (virgule)'],
                    ['Visible', 'optionnel (oui/non)'],
                  ].map(([col, note]) => (
                    <div key={col} className="flex items-center gap-2">
                      <span className="font-mono text-teal text-xs">{col}</span>
                      <span className="text-white/30 text-xs">— {note}</span>
                    </div>
                  ))}
                </div>
                <p className="text-white/30 text-xs mt-1">
                  Catégories disponibles : {categories.map(c => `${c.icon} ${c.name}`).join(', ')}
                </p>
              </div>

              {/* Télécharger template */}
              <button onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-teal/30 text-teal rounded-xl text-sm hover:bg-teal/10 transition-colors">
                <Download size={15} /> Télécharger le fichier template
              </button>
            </div>
          )}

          {/* ── ÉTAPE 2 : Aperçu ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-sm">
                  <span className="flex items-center gap-1 text-green-400"><Check size={14} /> {validRows.length} prêts</span>
                  {errorRows.length > 0 && <span className="flex items-center gap-1 text-red-400"><AlertCircle size={14} /> {errorRows.length} erreurs</span>}
                </div>
                <button onClick={() => { setRows([]); setStep('upload'); }} className="text-xs text-white/40 hover:text-white">← Changer de fichier</button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                {rows.map((r, i) => (
                  <div key={i} className={`px-4 py-3 flex items-start gap-3 ${r._error ? 'bg-red-500/5' : 'bg-white/2'}`}>
                    <div className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${r._error ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                      {r._error ? <AlertCircle size={12} className="text-red-400" /> : <Check size={12} className="text-green-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{r.nom || <span className="italic text-white/30">Sans nom</span>}</span>
                        {r.prix !== null && !isNaN(r.prix) && <span className="text-teal text-sm font-bold">{r.prix.toFixed(2)}€</span>}
                        {r.categorie && <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">{r.categorie}</span>}
                        {r.visible === false && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">Masqué</span>}
                      </div>
                      {r.description && <p className="text-white/35 text-xs mt-0.5 truncate">{r.description}</p>}
                      {r._error && <p className="text-red-400 text-xs mt-1">{r._error}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {errorRows.length > 0 && (
                <p className="text-xs text-white/30 italic">Les lignes avec erreurs seront ignorées lors de l'import.</p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-2.5 border border-white/20 rounded-xl text-white/60 text-sm">Annuler</button>
                <button onClick={runImport} disabled={validRows.length === 0 || importing}
                  className="flex-1 py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {importing
                    ? <><Loader2 size={14} className="animate-spin" /> Import en cours…</>
                    : <><Upload size={14} /> Importer {validRows.length} produit{validRows.length > 1 ? 's' : ''}</>}
                </button>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 : Résultat ── */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm mb-2">
                <span className="flex items-center gap-1 text-green-400 font-semibold">
                  <Check size={14} /> {results.filter(r => r.ok).length} créés
                </span>
                {results.filter(r => !r.ok).length > 0 && (
                  <span className="flex items-center gap-1 text-red-400 font-semibold">
                    <AlertCircle size={14} /> {results.filter(r => !r.ok).length} échoués
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                {results.map((r, i) => (
                  <div key={i} className={`px-4 py-3 flex items-center gap-3 ${r.ok ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${r.ok ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {r.ok ? <Check size={12} className="text-green-400" /> : <AlertCircle size={12} className="text-red-400" />}
                    </div>
                    <span className="text-sm text-white/80 flex-1">{r.nom}</span>
                    {r.error && <span className="text-xs text-red-400">{r.error}</span>}
                  </div>
                ))}
              </div>

              <button onClick={onClose}
                className="w-full py-2.5 bg-brand-gradient text-night font-bold rounded-xl text-sm">
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
