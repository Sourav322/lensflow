interface Props { icon?: string; title: string; subtitle?: string; action?: React.ReactNode; }
export default function EmptyState({ icon = '📭', title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-3">
      <div className="text-5xl opacity-50">{icon}</div>
      <div className="text-[15px] font-semibold text-ink-2">{title}</div>
      {subtitle && <div className="text-[13px]">{subtitle}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
