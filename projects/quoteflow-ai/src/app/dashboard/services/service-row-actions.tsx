'use client';

import { useTransition } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import type { Service } from '@/lib/types';
import { deleteServiceAction, toggleServiceAction } from './actions';
import { ServiceDialog } from './service-dialog';

export function ServiceActiveSwitch({ service }: { service: Service }) {
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={service.active}
      disabled={pending}
      aria-label={`${service.name} active`}
      onCheckedChange={(v) =>
        start(async () => {
          await toggleServiceAction(service.id, v);
          toast.success(v ? 'Service enabled' : 'Service disabled');
        })
      }
    />
  );
}

export function ServiceRowActions({ service, ruleCount }: { service: Service; ruleCount: number }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1">
      <ServiceDialog
        service={service}
        trigger={
          <Button variant="ghost" size="sm">
            <Pencil /> Edit
          </Button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onSelect={() => {
              const msg = ruleCount ? `Delete "${service.name}" and its ${ruleCount} pricing rule${ruleCount === 1 ? '' : 's'}? Existing leads and quotes keep their history.` : `Delete "${service.name}"?`;
              if (!window.confirm(msg)) return;
              start(async () => {
                const r = await deleteServiceAction(service.id);
                if (r.ok) toast.success('Service deleted');
                else toast.error(r.error ?? 'Could not delete');
              });
            }}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
