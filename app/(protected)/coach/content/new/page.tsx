import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, PageHeader } from '@/components/common';
import { ContentPostForm } from '@/components/coach/ContentPostForm';

export const metadata = { title: 'Nuevo tip' };

export default function NewContentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/coach/content" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Contenido
      </Link>
      <PageHeader title="Nuevo tip" />
      <Card className="p-6">
        <ContentPostForm />
      </Card>
    </div>
  );
}
