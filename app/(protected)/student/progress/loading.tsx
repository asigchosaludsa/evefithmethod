import { Card } from '@/components/common';
import { Skeleton, SkeletonPageHeader } from '@/components/common';

export default function ProgressLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex flex-col items-center gap-4 p-5">
          <Skeleton className="size-36 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </Card>
        <Card className="p-5">
          <Skeleton className="mb-4 h-5 w-36" />
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
      <Card className="p-5">
        <Skeleton className="mb-4 h-5 w-44" />
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
    </div>
  );
}
