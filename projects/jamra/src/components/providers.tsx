'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Dictionary } from '@/lib/i18n';
import type { Locale, MenuData } from '@/lib/types';

interface SiteContext {
  locale: Locale;
  dict: Dictionary;
  menu: MenuData;
  demo: boolean;
}

const Ctx = createContext<SiteContext | null>(null);

/** One provider for the public site: locale, its dictionary, and the cached menu. */
export function SiteProvider({ value, children }: { value: SiteContext; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite(): SiteContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSite outside SiteProvider');
  return ctx;
}
