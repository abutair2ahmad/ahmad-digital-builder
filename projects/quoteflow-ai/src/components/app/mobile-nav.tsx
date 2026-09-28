'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { QuoteFlowLogo } from '@/components/shared/logo';
import { useI18n } from '@/lib/i18n/client';
import { SidebarNav } from './sidebar-nav';

export function MobileNav({ publicSlug, workspaceName }: { publicSlug: string; workspaceName: string }) {
  const [open, setOpen] = useState(false);
  const { dict } = useI18n();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={dict.nav.openNavigation}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-4">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle className="text-start">
            <QuoteFlowLogo />
          </SheetTitle>
          <p className="text-start text-xs text-muted-foreground">{workspaceName}</p>
        </SheetHeader>
        <SidebarNav publicSlug={publicSlug} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
