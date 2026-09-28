'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { safeHex } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';

const PRESETS = ['#2563eb', '#1d4ed8', '#0f766e', '#b45309', '#be123c', '#6d28d9', '#111827'];

export function BrandColorInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  const { dict: d } = useI18n();
  const [value, setValue] = useState(safeHex(defaultValue));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 overflow-hidden rounded-md border" style={{ backgroundColor: safeHex(value) }}>
          <input type="color" aria-label={d.common.pickColour} value={safeHex(value)} onChange={(e) => setValue(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
        <Input name={name} value={value} onChange={(e) => setValue(e.target.value)} pattern="^#[0-9a-fA-F]{6}$" className="font-mono" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((c) => (
          <button key={c} type="button" aria-label={c} onClick={() => setValue(c)} className="size-6 rounded-full border ring-offset-2 focus-visible:ring-2" style={{ backgroundColor: c, outline: value === c ? `2px solid ${c}` : undefined, outlineOffset: 2 }} />
        ))}
      </div>
    </div>
  );
}
