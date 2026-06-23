import { Card } from '@/components/common';
import { Skeleton, SkeletonPageHeader } from '@/components/common';

export default function TodayLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="mb-3 h-24 w-full" />
          <Skeleton className="h-9 w-40" />
        </Card>
        <Card className="p-5">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </Card>
      </div>
    </div>
  );
}
