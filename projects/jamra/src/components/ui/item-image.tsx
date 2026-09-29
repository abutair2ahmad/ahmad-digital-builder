import Image from 'next/image';

export const CARD_IMAGE_SIZES = '(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw';

interface Props {
  name: string;
  imagePath: string | null;
  sizes?: string;
  soldOut?: boolean;
  className?: string;
}

/**
 * Every dish image goes through here: next/image, lazy, inside a 4:3 box
 * that reserves its space (no layout shift). Photos live in
 * public/menu/<slug>.webp (800×600). An item without `image_path` gets the
 * placeholder (dark surface, soft ember glow, initial).
 */
export function ItemImage({ name, imagePath, sizes = CARD_IMAGE_SIZES, soldOut = false, className = '' }: Props) {
  const muted = soldOut ? 'grayscale opacity-50' : '';
  return (
    <div className={`relative aspect-[4/3] overflow-hidden bg-elevated ${className}`}>
      {imagePath ? (
        <Image src={imagePath} alt={name} fill sizes={sizes} className={`object-cover ${muted}`} />
      ) : (
        <div
          aria-hidden
          className={`absolute inset-0 grid place-items-center ${muted}`}
          style={{
            background:
              'radial-gradient(120% 90% at 50% 110%, rgb(255 107 26 / 0.28), transparent 60%), linear-gradient(160deg, #24211e, #1a1816)',
          }}
        >
          <span className="text-5xl font-bold text-accent/70">{Array.from(name)[0]}</span>
        </div>
      )}
    </div>
  );
}
