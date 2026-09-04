interface Props {
  className?: string;
  tone?: 'dark' | 'light';
  withWordmark?: boolean;
}

/** The ORIVA mark: an open ring with a copper aperture — "read before treated". */
export function Logo({ className = '', tone = 'dark', withWordmark = true }: Props) {
  const ink = tone === 'light' ? '#FAF8F4' : '#0A1C17';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 34 34" className="h-8 w-8 shrink-0" aria-hidden="true">
        <circle cx="17" cy="17" r="15.2" fill="none" stroke={ink} strokeOpacity="0.22" strokeWidth="1.2" />
        <path
          d="M17 4.6c6.4 0 11.4 5.5 11.4 12.4S23.4 29.4 17 29.4 5.6 23.9 5.6 17 10.6 4.6 17 4.6Zm0 4.3c-3.9 0-6.9 3.7-6.9 8.1s3 8.1 6.9 8.1 6.9-3.7 6.9-8.1-3-8.1-6.9-8.1Z"
          fill={ink}
        />
        <circle cx="17" cy="17" r="3.1" fill="#C0764A" />
      </svg>
      {withWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className="font-display text-[19px] tracking-[0.30em] uppercase"
            style={{ color: ink }}
          >
            Oriva
          </span>
          <span
            className="mt-1 text-[8.5px] tracking-[0.26em] uppercase"
            style={{ color: ink, opacity: 0.55 }}
          >
            Skin &amp; Laser Atelier
          </span>
        </span>
      ) : null}
    </span>
  );
}
