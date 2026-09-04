import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

interface Props {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. Kept small — this should read as depth, not as a toy. */
  max?: number;
  glare?: boolean;
}

/**
 * Pointer-driven 3D tilt. Disabled for reduced-motion and for coarse pointers,
 * where it would fight with scrolling.
 */
export function TiltCard({ children, className = '', max = 6, glare = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [style, setStyle] = useState<{ transform: string; glareX: number; glareY: number; active: boolean }>({
    transform: '',
    glareX: 50,
    glareY: 50,
    active: false,
  });

  const enabled = !reduce && typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setStyle({
      transform: `perspective(1100px) rotateX(${(0.5 - py) * max * 2}deg) rotateY(${(px - 0.5) * max * 2}deg) translateZ(0)`,
      glareX: px * 100,
      glareY: py * 100,
      active: true,
    });
  }

  function onLeave() {
    setStyle((s) => ({ ...s, transform: '', active: false }));
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`card-3d relative transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${className}`}
      style={{ transform: style.transform || undefined }}
    >
      {children}
      {glare && enabled ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500"
          style={{
            opacity: style.active ? 0.5 : 0,
            background: `radial-gradient(420px circle at ${style.glareX}% ${style.glareY}%, rgba(255,255,255,0.5), transparent 55%)`,
            mixBlendMode: 'soft-light',
          }}
        />
      ) : null}
    </div>
  );
}
