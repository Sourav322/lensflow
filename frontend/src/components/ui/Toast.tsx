import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../../hooks/useToast';

const icons = {
  success: <CheckCircle size={16} className="text-teal" />,
  error:   <XCircle    size={16} className="text-coral" />,
  info:    <Info       size={16} className="text-gold"  />,
};
const borders = { success: 'border-l-teal', error: 'border-l-coral', info: 'border-l-gold' };

export default function ToastStack() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toastIn pointer-events-auto flex items-center gap-3 bg-white border ${borders[t.type]} border-l-4 border-border rounded-xl px-4 py-3 shadow-[0_12px_48px_rgba(0,0,0,.15)] max-w-[340px] text-[13px]`}
        >
          {icons[t.type]}
          <span className="flex-1 text-ink">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-ink-4 hover:text-ink transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
