import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './lib/api';
import { useToast } from './hooks/useToast';
import Modal from './components/ui/Modal';
import { PageSpinner } from './components/ui/Spinner';
import EmptyState from './components/ui/EmptyState';
import {
  Printer, Download, Camera, Upload, Plus,
  Search, Barcode, Shuffle, X, CheckCircle,
  ScanLine, Package, RefreshCw, ZoomIn, ZoomOut,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
interface ProductItem {
  id: string;
  barcode: string;
  brand?: string;
  model?: string;
  name?: string;
  type: 'frame' | 'lens' | 'accessory';
  sellPrice: number;
  color?: string;
  coating?: string;
  category?: string;
}

interface LabelItem {
  product: ProductItem;
  qty: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Barcode renderer (Code 128 — pure canvas, no lib needed)
// ─────────────────────────────────────────────────────────────────────────────
const CODE128_B: Record<string, number> = {};
' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'.split('').forEach((c, i) => { CODE128_B[c] = i + 32; });

const CODE128_PATTERNS: string[] = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100','1100011101011',
];

function drawCode128(canvas: HTMLCanvasElement, text: string, opts: { barW?: number; height?: number; showText?: boolean; fontSize?: number } = {}) {
  const { barW = 1.5, height = 40, showText = true, fontSize = 9 } = opts;
  const safe = text.replace(/[^\x20-\x7E]/g, '');
  if (!safe) return;
  const codes: number[] = [];
  for (const ch of safe) codes.push(CODE128_B[ch] ?? 0);
  const check = (104 + codes.reduce((s, c, i) => s + c * (i + 1), 0)) % 103;
  const bars = [CODE128_PATTERNS[104], ...codes.map(c => CODE128_PATTERNS[c]), CODE128_PATTERNS[check], CODE128_PATTERNS[106]].join('');
  const totalBars = bars.split('').reduce((s, b) => s + parseInt(b), 0);
  const w = totalBars * barW + 20;
  const h = height + (showText ? fontSize + 6 : 4);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  let x = 10; let black = true;
  for (const bit of bars) {
    const bw = parseInt(bit) * barW;
    if (black) { ctx.fillStyle = '#000'; ctx.fillRect(x, 2, bw, height - 2); }
    x += bw; black = !black;
  }
  if (showText) {
    ctx.fillStyle = '#000';
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(safe, w / 2, h - 2);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BarcodeCanvas component
// ─────────────────────────────────────────────────────────────────────────────
function BarcodeCanvas({ code, barW = 1.5, height = 40, showText = true, fontSize = 9, className = '' }: { code: string; barW?: number; height?: number; showText?: boolean; fontSize?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current && code) drawCode128(ref.current, code, { barW, height, showText, fontSize }); }, [code, barW, height, showText, fontSize]);
  return <canvas ref={ref} className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Label renderer — 15mm H × 100mm W @ 96dpi ≈ 57px × 378px
//  We use 3× scale for quality: 171px × 1134px then CSS-scale down
// ─────────────────────────────────────────────────────────────────────────────
const LABEL_W_PX = 378;   // 100mm @ 96dpi
const LABEL_H_PX = 57;    // 15mm @ 96dpi
const SCALE = 3;

function LabelPreview({ item, zoom = 1 }: { item: LabelItem; zoom?: number }) {
  const p = item.product;
  const name = p.brand ? `${p.brand} ${p.model || p.name || ''}` : (p.name || '');
  const sub  = p.color || p.coating || p.category || p.type;
  const price = `₹${Number(p.sellPrice).toLocaleString('en-IN')}`;

  return (
    <div
      className="bg-white border-2 border-dashed border-gray-300 overflow-hidden flex items-center gap-2 px-2 shrink-0"
      style={{ width: LABEL_W_PX * zoom, height: LABEL_H_PX * zoom, borderRadius: 3 * zoom, padding: `${4 * zoom}px ${6 * zoom}px` }}
    >
      {/* Left: text */}
      <div className="flex flex-col justify-center flex-1 min-w-0" style={{ gap: 1 * zoom }}>
        <div className="font-bold truncate" style={{ fontSize: 9 * zoom, lineHeight: 1.2 }}>{name}</div>
        <div className="text-gray-500 truncate" style={{ fontSize: 7 * zoom, lineHeight: 1.1 }}>{sub}</div>
        <div className="font-bold text-teal-700" style={{ fontSize: 9 * zoom, lineHeight: 1.2 }}>{price}</div>
      </div>
      {/* Right: barcode */}
      <div className="shrink-0 flex flex-col items-center">
        <BarcodeCanvas code={p.barcode} barW={0.7 * zoom} height={28 * zoom} showText={true} fontSize={6 * zoom} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Print sheet renderer
// ─────────────────────────────────────────────────────────────────────────────
function buildPrintHtml(items: LabelItem[]): string {
  const labels: string[] = [];
  items.forEach(item => {
    const p = item.product;
    const name = p.brand ? `${p.brand} ${p.model || p.name || ''}`.trim() : (p.name || '');
    const sub   = p.color || p.coating || p.category || '';
    const price = `Rs. ${Number(p.sellPrice).toLocaleString('en-IN')}`;
    for (let i = 0; i < item.qty; i++) {
      // Build barcode SVG inline
      const safe = p.barcode.replace(/[^\x20-\x7E]/g, '');
      const codes: number[] = [];
      for (const ch of safe) codes.push(CODE128_B[ch] ?? 0);
      const check = (104 + codes.reduce((s, c, idx) => s + c * (idx + 1), 0)) % 103;
      const barsStr = [CODE128_PATTERNS[104], ...codes.map(c => CODE128_PATTERNS[c]), CODE128_PATTERNS[check], CODE128_PATTERNS[106]].join('');
      let svgBars = ''; let x = 0; let black = true;
      for (const bit of barsStr) {
        const bw = parseInt(bit) * 0.5;
        if (black) svgBars += `<rect x="${x}" y="0" width="${bw}" height="100%" fill="#000"/>`;
        x += bw; black = !black;
      }
      const svgW = x;
      labels.push(`
        <div class="label">
          <div class="label-left">
            <div class="label-name">${name}</div>
            ${sub ? `<div class="label-sub">${sub}</div>` : ''}
            <div class="label-price">${price}</div>
          </div>
          <div class="label-right">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} 28" width="${svgW * 0.9}" height="28">${svgBars}</svg>
            <div class="barcode-text">${p.barcode}</div>
          </div>
        </div>
      `);
    }
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Barcode Labels — LensFlow</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { margin: 8mm; }
  body { font-family: Arial, sans-serif; background: white; }
  .grid { display: flex; flex-wrap: wrap; gap: 2mm; }
  .label {
    width: 100mm; height: 15mm;
    border: 0.3mm solid #ccc;
    border-radius: 1mm;
    display: flex; align-items: center;
    padding: 1mm 2mm; gap: 2mm;
    page-break-inside: avoid;
    overflow: hidden;
  }
  .label-left { flex: 1; min-width: 0; }
  .label-name { font-size: 7pt; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label-sub  { font-size: 5.5pt; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.5mm; }
  .label-price { font-size: 7pt; font-weight: bold; color: #007f76; margin-top: 0.5mm; }
  .label-right { display: flex; flex-direction: column; align-items: center; gap: 0.5mm; flex-shrink: 0; }
  .barcode-text { font-size: 5pt; font-family: monospace; letter-spacing: 0.5px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="grid">${labels.join('')}</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Auto-generate barcode
// ─────────────────────────────────────────────────────────────────────────────
function genBarcode(): string {
  return 'LF' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────────────────────────────────────
type PageTab = 'print' | 'scan' | 'bulk';

export default function Barcodes() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<PageTab>('print');

  // ── Print tab state ────────────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<'all'|'frame'|'lens'|'accessory'>('all');
  const [queue, setQueue]           = useState<LabelItem[]>([]);
  const [zoom, setZoom]             = useState(1);

  // ── Scan tab state ─────────────────────────────────────────────────────────
  const [scanResult, setScanResult] = useState<ProductItem | null>(null);
  const [scanCode, setScanCode]     = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning]     = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // ── Bulk tab state ─────────────────────────────────────────────────────────
  const [bulkRows, setBulkRows]     = useState<any[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Edit barcode modal ─────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState<{ product: ProductItem; code: string } | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: framesData }  = useQuery({ queryKey:['frames-bc'],  queryFn:()=>api.get('/frames?limit=500').then(r=>r.data.data)      });
  const { data: lensesData }  = useQuery({ queryKey:['lenses-bc'],  queryFn:()=>api.get('/lenses?limit=500').then(r=>r.data.data)      });
  const { data: accsData }    = useQuery({ queryKey:['accs-bc'],    queryFn:()=>api.get('/accessories').then(r=>r.data.data)           });

  const allProducts: ProductItem[] = [
    ...(framesData  ?? []).map((f:any) => ({ id:f.id, barcode:f.barcode||'', brand:f.brand, model:f.model, type:'frame'     as const, sellPrice:f.sellPrice, color:f.color     })),
    ...(lensesData  ?? []).map((l:any) => ({ id:l.id, barcode:l.barcode||'', brand:l.brand, name:l.type,   type:'lens'      as const, sellPrice:l.sellPrice, coating:l.coating })),
    ...(accsData    ?? []).map((a:any) => ({ id:a.id, barcode:a.barcode||'', name:a.name,                   type:'accessory' as const, sellPrice:a.sellPrice, category:a.category })),
  ];

  const filtered = allProducts.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (!search) return true;
    const hay = `${p.brand||''} ${p.model||p.name||''} ${p.barcode}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  // ─── Update barcode mutation ─────────────────────────────────────────────
  const updateBarcode = useMutation({
    mutationFn: ({ product, code }: { product: ProductItem; code: string }) => {
      const endpoint = product.type === 'frame' ? `/frames/${product.id}` : product.type === 'lens' ? `/lenses/${product.id}` : `/accessories/${product.id}`;
      return api.put(endpoint, { barcode: code });
    },
    onSuccess: (_, vars) => {
      toast(`Barcode updated for ${vars.product.brand || vars.product.name}`, 'success');
      qc.invalidateQueries({ queryKey:['frames-bc'] });
      qc.invalidateQueries({ queryKey:['lenses-bc'] });
      qc.invalidateQueries({ queryKey:['accs-bc'] });
      setEditModal(null);
      // also update queue
      setQueue(q => q.map(qi => qi.product.id === vars.product.id ? { ...qi, product: { ...qi.product, barcode: vars.code } } : qi));
    },
    onError: (e:any) => toast(e?.response?.data?.error ?? 'Update failed', 'error'),
  });

  // ─── Add to print queue ──────────────────────────────────────────────────
  const addToQueue = (p: ProductItem) => {
    if (!p.barcode) { toast('No barcode — assign one first', 'error'); return; }
    setQueue(q => {
      const ex = q.find(i => i.product.id === p.id);
      if (ex) return q.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...q, { product: p, qty: 1 }];
    });
    toast(`Added to print queue`, 'success');
  };

  const removeFromQueue = (id: string) => setQueue(q => q.filter(i => i.product.id !== id));
  const updateQty = (id: string, qty: number) => setQueue(q => q.map(i => i.product.id === id ? { ...i, qty: Math.max(1, qty) } : i));

  // ─── Print ───────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!queue.length) { toast('Add items to print queue first', 'error'); return; }
    const html = buildPrintHtml(queue);
    const win = window.open('', '_blank');
    if (!win) { toast('Pop-up blocked — allow pop-ups and try again', 'error'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const handleDownload = () => {
    if (!queue.length) { toast('Add items to print queue first', 'error'); return; }
    const html = buildPrintHtml(queue);
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `lensflow-labels-${Date.now()}.html`;
    a.click(); URL.revokeObjectURL(url);
    toast('Labels downloaded as HTML — open in browser to print', 'success');
  };

  // ─── Camera scan (ZXing via CDN) ─────────────────────────────────────────
  const startCamera = async () => {
    setScanning(true); setScanResult(null); setScanCode('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 1280, height: 720 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      // Load ZXing dynamically
      if (!(window as any).ZXing) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/zxing-js/0.20.0/zxing.min.js';
          s.onload = () => res(); s.onerror = () => rej();
          document.head.appendChild(s);
        });
      }
      const codeReader = new (window as any).ZXing.BrowserMultiFormatReader();
      codeReader.decodeFromVideoDevice(null, videoRef.current, (result: any, err: any) => {
        if (result) {
          const code = result.getText();
          setScanCode(code);
          stopCamera(stream);
          lookupBarcode(code);
        }
      });
      (window as any)._lensflowScanner = codeReader;
    } catch (e: any) {
      toast('Camera access denied or not available', 'error');
      setScanning(false);
    }
  };

  const stopCamera = (stream?: MediaStream) => {
    const s = stream || (videoRef.current?.srcObject as MediaStream);
    s?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    if ((window as any)._lensflowScanner) {
      try { (window as any)._lensflowScanner.reset(); } catch {}
    }
    setScanning(false);
  };

  useEffect(() => () => { stopCamera(); }, []);

  const lookupBarcode = async (code: string) => {
    setScanCode(code);
    try {
      const res = await Promise.allSettled([
        api.get(`/frames/barcode/${code}`),
        api.get(`/lenses/barcode/${code}`),
        api.get(`/accessories/barcode/${code}`),
      ]);
      const found = res.find(r => r.status === 'fulfilled' && (r as any).value?.data?.data);
      if (found && (found as any).value?.data?.data) {
        const d = (found as any).value.data.data;
        const type: ProductItem['type'] = d.model ? 'frame' : d.category ? 'accessory' : 'lens';
        setScanResult({ id:d.id, barcode:d.barcode||code, brand:d.brand, model:d.model, name:d.name, type, sellPrice:d.sellPrice, color:d.color, coating:d.coating, category:d.category });
        toast(`Found: ${d.brand||d.name} ${d.model||''}`, 'success');
      } else {
        setScanResult(null);
        toast(`Barcode "${code}" not found in inventory`, 'error');
      }
    } catch {
      toast('Lookup failed', 'error');
    }
  };

  const handleManualLookup = () => {
    if (!manualCode.trim()) { toast('Enter a barcode', 'error'); return; }
    lookupBarcode(manualCode.trim());
  };

  // ─── Keyboard scanner hook (physical scanner) ───────────────────────────
  const kbBuf = useRef(''); const kbLast = useRef(0);
  useEffect(() => {
    if (tab !== 'scan') return;
    const h = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - kbLast.current > 120) kbBuf.current = '';
      kbLast.current = now;
      if (e.key === 'Enter') { if (kbBuf.current.length >= 3) { setManualCode(kbBuf.current); lookupBarcode(kbBuf.current); } kbBuf.current = ''; return; }
      if (e.key.length === 1) kbBuf.current += e.key;
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [tab]);

  // ─── Bulk import ─────────────────────────────────────────────────────────
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Load SheetJS dynamically
    if (!(window as any).XLSX) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = () => res(); s.onerror = () => rej();
        document.head.appendChild(s);
      });
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb   = (window as any).XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = (window as any).XLSX.utils.sheet_to_json(ws, { defval: '' });
        // Normalize columns
        const norm = rows.map(r => ({
          type:     (r.type || r.Type || r.TYPE || '').toString().toLowerCase().trim(),
          id:       (r.id   || r.ID   || r.Id   || '').toString().trim(),
          barcode:  (r.barcode || r.Barcode || r.BARCODE || r['Barcode / SKU'] || '').toString().trim(),
          name:     (r.name || r.Name || r.brand || r.Brand || '').toString().trim(),
          status:   'pending' as 'pending' | 'saved' | 'error',
          error:    '',
        }));
        setBulkRows(norm);
        toast(`Loaded ${norm.length} rows from Excel`, 'success');
      } catch {
        toast('Could not read Excel file — use .xlsx or .xls', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    if (!(window as any).XLSX) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => downloadTemplate();
      document.head.appendChild(s);
      return;
    }
    const ws = (window as any).XLSX.utils.aoa_to_sheet([
      ['type', 'id', 'barcode', 'name'],
      ['frame',     'frm-001', '8056597137737', 'Ray-Ban RB3025'],
      ['lens',      'len-001', '8901234567890', 'Essilor SV'],
      ['accessory', 'acc-001', '7890123456789', 'Cleaning Cloth'],
    ]);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, 'Barcodes');
    (window as any).XLSX.writeFile(wb, 'lensflow-barcode-template.xlsx');
    toast('Template downloaded', 'success');
  };

  const autoGenBulk = () => {
    setBulkRows(prev => prev.map(r => ({ ...r, barcode: r.barcode || genBarcode() })));
    toast('Auto-generated barcodes for empty rows', 'success');
  };

  const saveBulk = async () => {
    if (!bulkRows.length) return;
    setBulkSaving(true);
    const updated = [...bulkRows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (!row.id || !row.barcode || row.status === 'saved') continue;
      try {
        const ep = row.type === 'frame' ? `/frames/${row.id}` : row.type === 'lens' ? `/lenses/${row.id}` : `/accessories/${row.id}`;
        await api.put(ep, { barcode: row.barcode });
        updated[i] = { ...row, status: 'saved' };
      } catch (e: any) {
        updated[i] = { ...row, status: 'error', error: e?.response?.data?.error || 'Failed' };
      }
      setBulkRows([...updated]);
    }
    setBulkSaving(false);
    qc.invalidateQueries({ queryKey:['frames-bc'] });
    qc.invalidateQueries({ queryKey:['lenses-bc'] });
    qc.invalidateQueries({ queryKey:['accs-bc'] });
    const saved = updated.filter(r => r.status === 'saved').length;
    toast(`${saved} barcodes saved successfully`, 'success');
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-[22px] text-ink">Barcode Manager</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">{allProducts.length} products · {allProducts.filter(p => p.barcode).length} have barcodes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab==='print'?'tab-active':''}`} onClick={()=>setTab('print')}><Printer size={13} className="inline mr-1"/>Print Labels</button>
        <button className={`tab-btn ${tab==='scan' ?'tab-active':''}`} onClick={()=>setTab('scan')} ><ScanLine size={13} className="inline mr-1"/>Scan & Lookup</button>
        <button className={`tab-btn ${tab==='bulk' ?'tab-active':''}`} onClick={()=>setTab('bulk')} ><Upload size={13} className="inline mr-1"/>Bulk Import</button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           TAB: PRINT LABELS
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'print' && (
        <div className="mt-5 flex flex-col lg:flex-row gap-4">
          {/* Left: product picker */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 flex-1 min-w-[160px]">
                <Search size={13} className="text-ink-3 shrink-0"/>
                <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              {(['all','frame','lens','accessory'] as const).map(t=>(
                <button key={t} className={`btn btn-sm capitalize ${typeFilter===t?'btn-teal':'btn-ghost'}`} onClick={()=>setTypeFilter(t)}>{t}</button>
              ))}
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Product</th><th>Type</th><th>Barcode</th><th>Price</th><th></th></tr></thead>
                  <tbody>
                    {filtered.slice(0, 60).map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="font-semibold text-[13px]">{p.brand || ''} {p.model || p.name || ''}</div>
                          <div className="text-[11.5px] text-ink-3">{p.color || p.coating || p.category || ''}</div>
                        </td>
                        <td><span className="badge badge-navy capitalize">{p.type}</span></td>
                        <td>
                          {p.barcode
                            ? <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11.5px] text-teal-dark">{p.barcode}</span>
                                <button className="text-ink-4 hover:text-teal" title="Edit barcode" onClick={()=>setEditModal({product:p, code:p.barcode})}><Barcode size={11}/></button>
                              </div>
                            : <button className="btn btn-xs btn-ghost text-coral border-coral/30 hover:bg-coral-soft" onClick={()=>setEditModal({product:p, code:genBarcode()})}>
                                <Plus size={10}/> Assign
                              </button>
                          }
                        </td>
                        <td className="font-semibold text-[13px]">₹{Number(p.sellPrice).toLocaleString('en-IN')}</td>
                        <td>
                          <button className="btn btn-xs btn-teal" onClick={()=>addToQueue(p)} disabled={!p.barcode}>
                            <Plus size={11}/> Queue
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && <tr><td colSpan={5}><EmptyState icon="🏷️" title="No products found"/></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: print queue */}
          <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-3">
            {/* Queue header */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-serif text-[16px]">Print Queue <span className="badge badge-teal ml-1">{queue.length}</span></div>
                <div className="flex items-center gap-1.5">
                  <button className="btn btn-icon" title="Zoom out" onClick={()=>setZoom(z=>Math.max(0.5,z-0.1))}><ZoomOut size={13}/></button>
                  <span className="text-[11px] text-ink-3 w-8 text-center">{Math.round(zoom*100)}%</span>
                  <button className="btn btn-icon" title="Zoom in"  onClick={()=>setZoom(z=>Math.min(2,z+0.1))}><ZoomIn  size={13}/></button>
                </div>
              </div>

              {/* Label previews */}
              <div className="overflow-x-auto pb-2 space-y-2 max-h-[420px] overflow-y-auto">
                {queue.length === 0 && (
                  <div className="text-center py-8 text-ink-3 text-[13px]">
                    <Printer size={28} className="mx-auto mb-2 opacity-25"/>
                    Add products to see label preview
                  </div>
                )}
                {queue.map(item => (
                  <div key={item.product.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-semibold flex-1 truncate">{item.product.brand || item.product.name} {item.product.model||''}</span>
                      <div className="flex items-center gap-1">
                        <button className="w-6 h-6 rounded border border-border flex items-center justify-center text-ink hover:text-teal text-[13px]" onClick={()=>updateQty(item.product.id, item.qty-1)}>−</button>
                        <input className="w-8 text-center text-[12px] border border-border rounded" type="number" value={item.qty} min={1} onChange={e=>updateQty(item.product.id, parseInt(e.target.value)||1)}/>
                        <button className="w-6 h-6 rounded border border-border flex items-center justify-center text-ink hover:text-teal text-[13px]" onClick={()=>updateQty(item.product.id, item.qty+1)}>+</button>
                        <button className="w-6 h-6 rounded flex items-center justify-center text-ink-4 hover:text-coral ml-0.5" onClick={()=>removeFromQueue(item.product.id)}><X size={12}/></button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <LabelPreview item={item} zoom={zoom} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Label spec info */}
              <div className="mt-3 px-3 py-2 bg-bg rounded-lg text-[11.5px] text-ink-3 border border-border">
                📐 Label size: <strong>100mm × 15mm</strong> · Code 128 barcode · Optimized for thermal/laser
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button className="btn btn-teal flex-1 justify-center" onClick={handlePrint} disabled={!queue.length}>
                  <Printer size={14}/> Print
                </button>
                <button className="btn btn-outline flex-1 justify-center" onClick={handleDownload} disabled={!queue.length}>
                  <Download size={14}/> Download HTML
                </button>
              </div>
              {queue.length > 0 && (
                <button className="btn btn-ghost btn-sm w-full justify-center mt-2 text-coral" onClick={()=>setQueue([])}>
                  <X size={12}/> Clear Queue
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB: SCAN & LOOKUP
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'scan' && (
        <div className="mt-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Camera scan */}
            <div className="card">
              <div className="font-serif text-[16px] mb-3">📷 Camera Scan</div>
              <div className={`relative bg-black rounded-xl overflow-hidden mb-3 ${scanning ? 'block' : 'hidden'}`} style={{height:200}}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-16 border-2 border-teal rounded-lg relative">
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-teal/60 animate-pulse"/>
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-teal -translate-x-px -translate-y-px"/>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-teal translate-x-px -translate-y-px"/>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-teal -translate-x-px translate-y-px"/>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-teal translate-x-px translate-y-px"/>
                  </div>
                </div>
              </div>
              {!scanning ? (
                <button className="btn btn-teal w-full justify-center" onClick={startCamera}>
                  <Camera size={14}/> Start Camera Scan
                </button>
              ) : (
                <button className="btn btn-coral w-full justify-center" onClick={()=>stopCamera()}>
                  <X size={14}/> Stop Camera
                </button>
              )}
              <p className="text-[11.5px] text-ink-3 mt-2 text-center">Point camera at any product barcode</p>
            </div>

            {/* Manual / USB scanner entry */}
            <div className="card">
              <div className="font-serif text-[16px] mb-3">⌨️ Manual / USB Scanner</div>
              <p className="text-[12px] text-ink-3 mb-3">
                Type a barcode manually, or connect a USB scanner and scan — it auto-fills here.
              </p>
              <div className="field">
                <label className="label">Barcode / SKU</label>
                <input
                  className="input font-mono"
                  placeholder="Scan or type barcode…"
                  value={manualCode}
                  onChange={e=>setManualCode(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleManualLookup()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-teal flex-1 justify-center" onClick={handleManualLookup}>
                  <Search size={13}/> Lookup
                </button>
                <button className="btn btn-ghost btn-sm" title="Auto-generate" onClick={()=>setManualCode(genBarcode())}>
                  <Shuffle size={13}/> Generate
                </button>
              </div>
            </div>
          </div>

          {/* Scan result */}
          {scanCode && (
            <div className={`card border-2 ${scanResult ? 'border-teal' : 'border-coral'}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {scanResult
                      ? <><CheckCircle size={16} className="text-teal"/><span className="font-bold text-teal-dark">Product Found</span></>
                      : <><X size={16} className="text-coral"/><span className="font-bold text-coral">Not Found</span></>
                    }
                  </div>
                  <div className="font-mono text-[13px] text-ink-2 mb-2 bg-bg px-3 py-1.5 rounded-lg inline-block">{scanCode}</div>
                  {scanResult && (
                    <div className="space-y-1 text-[13px]">
                      <div><strong>{scanResult.brand || ''} {scanResult.model || scanResult.name || ''}</strong></div>
                      <div className="text-ink-3">{scanResult.color || scanResult.coating || scanResult.category || ''}</div>
                      <div className="text-ink-3 capitalize">Type: {scanResult.type}</div>
                      <div className="font-bold text-teal-dark text-[15px]">₹{Number(scanResult.sellPrice).toLocaleString('en-IN')}</div>
                    </div>
                  )}
                  {!scanResult && (
                    <p className="text-[13px] text-ink-3">This barcode is not assigned to any product in your inventory.</p>
                  )}
                </div>
                {scanResult && (
                  <div className="shrink-0">
                    <BarcodeCanvas code={scanCode} barW={1.5} height={50} showText={true} fontSize={9} className="border border-border rounded-lg p-1"/>
                    <button className="btn btn-xs btn-teal mt-2 w-full justify-center" onClick={()=>scanResult&&addToQueue(scanResult)}>
                      <Printer size={10}/> Add to Print Queue
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-ghost btn-xs mt-3" onClick={()=>{setScanResult(null);setScanCode('');setManualCode('');}}>
                <RefreshCw size={11}/> Clear Result
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB: BULK IMPORT
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'bulk' && (
        <div className="mt-5 max-w-3xl">
          {/* Instructions */}
          <div className="card mb-4 bg-teal-light border-teal/20">
            <div className="font-bold text-teal-dark mb-2">📋 How to use Bulk Import</div>
            <ol className="text-[13px] text-ink-2 space-y-1 list-decimal pl-4">
              <li>Download the Excel template below</li>
              <li>Fill in: <strong>type</strong> (frame/lens/accessory), <strong>id</strong> (product ID), <strong>barcode</strong></li>
              <li>Leave barcode empty → click Auto-Generate to fill them</li>
              <li>Upload your completed file and click Save All</li>
            </ol>
          </div>

          {/* Actions row */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
              <Download size={13}/> Download Template (.xlsx)
            </button>
            <button className="btn btn-teal btn-sm" onClick={()=>fileRef.current?.click()}>
              <Upload size={13}/> Upload Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload}/>
            {bulkRows.length > 0 && <>
              <button className="btn btn-gold btn-sm" onClick={autoGenBulk}>
                <Shuffle size={13}/> Auto-Generate Empty Barcodes
              </button>
              <button className="btn btn-teal btn-sm" onClick={saveBulk} disabled={bulkSaving}>
                {bulkSaving ? <><RefreshCw size={13} className="animate-spin"/> Saving…</> : <><CheckCircle size={13}/> Save All</>}
              </button>
              <button className="btn btn-ghost btn-sm text-coral" onClick={()=>setBulkRows([])}>
                <X size={13}/> Clear
              </button>
            </>}
          </div>

          {/* Also shows current inventory IDs for reference */}
          {bulkRows.length === 0 && (
            <div className="card">
              <div className="font-serif text-[16px] mb-3">Current Product IDs (for reference)</div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="tbl">
                  <thead><tr><th>Type</th><th>ID</th><th>Name</th><th>Current Barcode</th></tr></thead>
                  <tbody>
                    {allProducts.slice(0,30).map(p=>(
                      <tr key={p.id}>
                        <td><span className="badge badge-navy capitalize">{p.type}</span></td>
                        <td><span className="font-mono text-[11px] text-ink-3 select-all">{p.id}</span></td>
                        <td className="text-[13px]">{p.brand||''} {p.model||p.name||''}</td>
                        <td>
                          {p.barcode
                            ? <span className="font-mono text-[11.5px] text-teal-dark">{p.barcode}</span>
                            : <span className="text-coral text-[12px]">No barcode</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bulk rows preview */}
          {bulkRows.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                <span className="font-semibold text-[13px]">{bulkRows.length} rows imported</span>
                <div className="flex gap-3 text-[12px]">
                  <span className="text-[#00875a]">✓ {bulkRows.filter(r=>r.status==='saved').length} saved</span>
                  <span className="text-coral">✗ {bulkRows.filter(r=>r.status==='error').length} errors</span>
                  <span className="text-ink-3">⋯ {bulkRows.filter(r=>r.status==='pending').length} pending</span>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="tbl">
                  <thead><tr><th>#</th><th>Type</th><th>ID</th><th>Name</th><th>Barcode</th><th>Status</th></tr></thead>
                  <tbody>
                    {bulkRows.map((r,i)=>(
                      <tr key={i} className={r.status==='error'?'bg-coral-soft/30':r.status==='saved'?'bg-[#e8faf4]/40':''}>
                        <td className="text-ink-3 text-[12px]">{i+1}</td>
                        <td><span className="badge badge-navy capitalize text-[10.5px]">{r.type||'—'}</span></td>
                        <td><span className="font-mono text-[11px] text-ink-3">{r.id||'—'}</span></td>
                        <td className="text-[13px]">{r.name||'—'}</td>
                        <td>
                          <input
                            className="input input-sm font-mono text-[12px] w-44"
                            value={r.barcode}
                            onChange={e=>setBulkRows(prev=>prev.map((row,j)=>j===i?{...row,barcode:e.target.value,status:'pending'}:row))}
                          />
                        </td>
                        <td>
                          {r.status==='saved'  && <span className="badge badge-green text-[10.5px]">✓ Saved</span>}
                          {r.status==='error'  && <span className="badge badge-coral text-[10.5px]" title={r.error}>✗ Error</span>}
                          {r.status==='pending'&& <span className="badge badge-gray text-[10.5px]">Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Edit / Assign Barcode Modal ────────────────────────────────────── */}
      <Modal open={!!editModal} onClose={()=>setEditModal(null)} title="Assign / Edit Barcode">
        {editModal && (
          <>
            <div className="bg-bg rounded-xl p-3 mb-4 text-[13px]">
              <div className="font-bold">{editModal.product.brand||''} {editModal.product.model||editModal.product.name||''}</div>
              <div className="text-ink-3 capitalize mt-0.5">{editModal.product.type} · ₹{Number(editModal.product.sellPrice).toLocaleString('en-IN')}</div>
            </div>
            <div className="field">
              <label className="label">Barcode</label>
              <div className="flex gap-2">
                <input
                  className="input font-mono flex-1"
                  placeholder="Enter or scan barcode…"
                  value={editModal.code}
                  onChange={e=>setEditModal(m=>m?{...m,code:e.target.value}:null)}
                  onKeyDown={e=>e.key==='Enter'&&updateBarcode.mutate(editModal)}
                  autoFocus
                />
                <button className="btn btn-ghost btn-sm shrink-0" title="Auto-generate" onClick={()=>setEditModal(m=>m?{...m,code:genBarcode()}:null)}>
                  <Shuffle size={13}/> Generate
                </button>
              </div>
            </div>
            {editModal.code && (
              <div className="mb-4 flex justify-center p-3 bg-bg rounded-xl border border-border">
                <BarcodeCanvas code={editModal.code} barW={1.8} height={55} showText={true} fontSize={10}/>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button className="btn btn-ghost btn-sm" onClick={()=>setEditModal(null)}>Cancel</button>
              <button className="btn btn-teal btn-sm" onClick={()=>updateBarcode.mutate(editModal)} disabled={updateBarcode.isPending||!editModal.code}>
                {updateBarcode.isPending?'Saving…':'Save Barcode'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
