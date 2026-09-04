import type { Staff } from '../../data/clinic';

const palettes: Record<Staff['accent'], { from: string; to: string; ink: string; ring: string }> = {
  jade: { from: '#14584c', to: '#08302a', ink: '#d6ede6', ring: 'rgba(214,237,230,0.20)' },
  copper: { from: '#a8603a', to: '#5c2f18', ink: '#f6e2d3', ring: 'rgba(246,226,211,0.20)' },
  ink: { from: '#16382f', to: '#06120f', ink: '#cfe9e0', ring: 'rgba(207,233,224,0.18)' },
};

/**
 * Practitioner portrait. Renders a commissioned-looking monogram plate today and
 * swaps to a real photograph the moment `photo` is supplied — see ASSETS.md.
 */
export function PortraitPlate({
  member,
  photo,
  className = '',
}: {
  member: Staff;
  photo?: string;
  className?: string;
}) {
  const p = palettes[member.accent];

  if (photo) {
    return (
      <img
        src={photo}
        alt={`${member.name}, ${member.role} at ORIVA`}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 400 500"
      role="img"
      aria-label={`Monogram portrait plate for ${member.name}`}
      className={`h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`pp-${member.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
        <radialGradient id={`pl-${member.id}`} cx="30%" cy="24%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#pp-${member.id})`} />
      <rect width="400" height="500" fill={`url(#pl-${member.id})`} />
      {[70, 118, 166, 214].map((r) => (
        <circle key={r} cx="200" cy="236" r={r} fill="none" stroke={p.ring} strokeWidth="1" />
      ))}
      <circle cx="200" cy="236" r="46" fill="none" stroke={p.ink} strokeOpacity="0.5" strokeWidth="1.2" />
      <text
        x="200"
        y="252"
        textAnchor="middle"
        fill={p.ink}
        fontFamily="Fraunces, Georgia, serif"
        fontSize="46"
        letterSpacing="2"
      >
        {member.initials}
      </text>
    </svg>
  );
}
