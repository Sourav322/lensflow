import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const maxW = { md: 'max-w-[640px]', lg: 'max-w-[820px]', xl: 'max-w-[1000px]' }[size];

  return (
    <div className="fixed inset-0 bg-navy/65 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn p-4">
      <div className={`animate-slideUp bg-white rounded-[20px] p-7 w-full ${maxW} max-h-[92vh] overflow-y-auto shadow-[0_12px_48px_rgba(0,0,0,.18)]`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg border-none flex items-center justify-center text-ink-2 hover:bg-coral-soft hover:text-coral transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
