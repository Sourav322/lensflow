import { useEffect, useRef } from 'react';

/**
 * Listens for barcode-scanner keyboard bursts.
 * A scanner typically fires chars very quickly then ends with Enter.
 * onScan(code) is called when Enter is received after ≥3 chars within 100 ms.
 */
export function useBarcode(onScan: (code: string) => void, enabled = true) {
  const buf  = useRef('');
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - last.current > 100) buf.current = '';
      last.current = now;

      if (e.key === 'Enter') {
        if (buf.current.length >= 3) onScan(buf.current);
        buf.current = '';
        return;
      }
      if (e.key.length === 1) buf.current += e.key;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onScan, enabled]);
}
