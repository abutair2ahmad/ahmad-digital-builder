'use client';

import { FileText, ImageIcon } from 'lucide-react';
import type { UploadedFile } from '@/lib/types';
import { useI18n } from '@/lib/i18n/client';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FileList({ files }: { files: UploadedFile[] }) {
  const { dict: d } = useI18n();
  if (!files.length) return <p className="text-sm text-muted-foreground">{d.leads.noFiles}</p>;
  return (
    <ul className="grid gap-2">
      {files.map((f) => {
        const isImage = f.mime_type.startsWith('image/');
        return (
          <li key={f.id}>
            <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-accent">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${f.id}`} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  <FileText className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isImage ? <ImageIcon className="me-1 inline size-3" /> : null}
                  {d.files[f.kind]} · {formatBytes(f.size_bytes)} · {f.uploaded_by === 'customer' ? d.files.uploadedByCustomer : d.files.uploadedByMember}
                </p>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
