'use client';

import { useTransition } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import type { Service } from '@/lib/types';
import { useI18n } from '@/lib/i18n/client';
import { fill } from '@/lib/i18n';
import { deleteServiceAction, toggleServiceAction } from './actions';
import { ServiceDialog } from './service-dialog';

export function ServiceActiveSwitch({ service }: { service: Service }) {
  const { dict: d } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={service.active}
      disabled={pending}
      aria-label={`${service.name} — ${d.common.active}`}
      onCheckedChange={(v) =>
        start(async () => {
          await toggleServiceAction(service.id, v);
          toast.success(v ? d.services.enabled : d.services.disabled);
        })
      }
    />
  );
}

export function ServiceRowActions({ service, ruleCount }: { service: Service; ruleCount: number }) {
  const { dict: d } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1">
      <ServiceDialog
        service={service}
        trigger={
          <Button variant="ghost" size="sm">
            <Pencil /> {d.common.edit}
          </Button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={d.common.actions}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onSelect={() => {
              const msg = ruleCount
                ? fill(d.services.confirmDeleteWithRules, { name: service.name, n: ruleCount })
                : fill(d.services.confirmDelete, { name: service.name });
              if (!window.confirm(msg)) return;
              start(async () => {
                const r = await deleteServiceAction(service.id);
                if (r.ok) toast.success(d.services.deleted);
                else toast.error(r.error ?? d.services.couldNotDelete);
              });
            }}
          >
            <Trash2 /> {d.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
