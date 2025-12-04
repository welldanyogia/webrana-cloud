import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SectionSkeleton() {
  return (
    <div className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
       <div className="space-y-4 text-center max-w-3xl mx-auto">
         <Skeleton className="h-8 w-32 mx-auto rounded-full bg-muted/50" />
         <Skeleton className="h-12 w-3/4 mx-auto bg-muted/50" />
         <Skeleton className="h-6 w-1/2 mx-auto bg-muted/50" />
       </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-[400px] w-full rounded-xl bg-muted/50" />
          <Skeleton className="h-[400px] w-full rounded-xl bg-muted/50" />
          <Skeleton className="h-[400px] w-full rounded-xl bg-muted/50" />
       </div>
    </div>
  );
}
