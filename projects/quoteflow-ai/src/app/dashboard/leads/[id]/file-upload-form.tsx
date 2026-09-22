'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { SubmitButton, useFormAction } from '@/components/shared/form';
import { uploadLeadFileAction } from '../actions';

export function FileUploadForm({ leadId }: { leadId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [, action] = useFormAction(
    async (prev, fd) => {
      const r = await uploadLeadFileAction(leadId, prev, fd);
      if (r.error) toast.error(r.error);
      return r;
    },
    () => {
      toast.success('File uploaded');
      formRef.current?.reset();
    },
  );
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        name="file"
        type="file"
        required
        accept="image/*,application/pdf"
        aria-label="Choose a file"
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary"
      />
      <SubmitButton variant="outline" size="sm" pendingText="Uploading…">
        <Upload /> Upload
      </SubmitButton>
    </form>
  );
}
