'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { QuoteFlowLogo } from '@/components/shared/logo';
import { SidebarNav } from './sidebar-nav';

export function MobileNav({ publicSlug, workspaceName }: { publicSlug: string; workspaceName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-4">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle className="text-left">
            <QuoteFlowLogo />
          </SheetTitle>
          <p className="text-left text-xs text-muted-foreground">{workspaceName}</p>
        </SheetHeader>
        <SidebarNav publicSlug={publicSlug} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
