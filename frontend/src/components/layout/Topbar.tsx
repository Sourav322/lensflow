import { Bell, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

interface Props { onMenuClick: () => void; title: string; }

export default function Topbar({ onMenuClick, title }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="h-[58px] shrink-0 bg-white border-b border-border flex items-center px-6 gap-3">
      <button
        className="md:hidden w-[38px] h-[38px] rounded-[9px] bg-bg border border-border flex items-center justify-center text-ink-2 hover:border-teal hover:text-teal transition-all"
        onClick={onMenuClick}
      >
        <Menu size={18} />
      </button>

      <h1 className="font-serif text-[20px] text-ink tracking-[-0.2px]">{title}</h1>
      <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
      <span className="text-[12px] text-ink-3 hidden sm:block">LensFlow / {title}</span>

      <div className="ml-auto flex items-center gap-2">
        <button className="relative w-9 h-9 rounded-[9px] bg-bg border border-border flex items-center justify-center text-ink-2 hover:border-teal hover:text-teal hover:bg-teal-light transition-all">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-coral border border-white" />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-[9px] bg-teal-light border border-teal-mid flex items-center justify-center text-[13px] font-bold text-teal-dark hover:bg-teal-mid transition-all"
          title={user?.name}
        >
          {user?.name?.[0]}
        </button>
      </div>
    </header>
  );
}
