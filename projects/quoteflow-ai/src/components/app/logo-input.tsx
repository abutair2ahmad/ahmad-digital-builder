'use client';

import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/client';

export function LogoInput({ name, currentUrl }: { name: string; currentUrl?: string | null }) {
  const { dict: d } = useI18n();
  const [preview, setPreview] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const shown = preview ?? currentUrl ?? null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Logo preview" className="size-full object-contain" />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <input
          key={key}
          id={name}
          name={name}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        {preview ? (
          <Button type="button" variant="ghost" size="icon" aria-label={d.common.clear} onClick={() => { setPreview(null); setKey((k) => k + 1); }}>
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
