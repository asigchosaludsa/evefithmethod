'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils/compress-image';
import { updateAvatar } from '@/lib/student/photo-actions';
import { Button } from '@/components/common';

export function AvatarUpload({
  userId,
  current,
  name,
}: {
  userId: string;
  current: string | null;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await compressImage(file);
      if (blob.size > 6 * 1024 * 1024) {
        setError('La imagen es demasiado grande.');
        return;
      }
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const res = await updateAvatar(publicUrl);
      if (res.error) {
        setError(res.error);
        return;
      }
      setUrl(publicUrl);
      router.refresh();
    } catch {
      setError('No se pudo subir la foto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-elevated">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="font-display text-xl font-bold text-muted">{name.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
        />
        <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
          <Camera className="size-4" /> Cambiar foto
        </Button>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
