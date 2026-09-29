export function PanelSkeleton() {
  return <div className="card h-64 animate-pulse" aria-busy="true" aria-label="جارٍ التحميل" />;
}
export function NotOwner({ email }: { email: string | null }) {
  return (
    <div className="card grid gap-2 p-6">
      <p className="font-bold">هذا الحساب مش صاحب المطعم.</p>
      <p className="text-sm text-muted">
        {email ? `الحساب ${email} مسجّل، بس ما إله صف بجدول owners.` : 'الحساب مش مضاف كصاحب مطعم.'} شوف README ← «إضافة صاحب المطعم».
      </p>
    </div>
  );
}
