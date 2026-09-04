export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'default' | 'attention';
}) {
  return (
    <div className="bg-porcelain p-6">
      <p className="eyebrow">{label}</p>
      <p
        className={`tabular mt-3 font-display text-[2.4rem] leading-none ${
          tone === 'attention' ? 'text-aurum' : 'text-ink'
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[0.75rem] text-clay">{hint}</p>}
    </div>
  );
}
