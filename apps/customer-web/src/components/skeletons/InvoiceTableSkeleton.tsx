import { Skeleton } from '@/components/ui/skeleton';

export function InvoiceTableSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] p-4">
         <div className="flex justify-between items-center mb-4">
             <Skeleton className="h-6 w-32" />
             <div className="flex gap-2">
                 <Skeleton className="h-9 w-32" />
                 <Skeleton className="h-9 w-48" />
             </div>
         </div>
         <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                </div>
            ))}
         </div>
         <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border)]">
             <Skeleton className="h-4 w-32" />
             <div className="flex gap-2">
                 <Skeleton className="h-8 w-20" />
                 <Skeleton className="h-8 w-20" />
             </div>
         </div>
      </div>
    </div>
  );
}
