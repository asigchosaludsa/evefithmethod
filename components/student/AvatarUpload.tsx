'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateAvatar } from '@/lib/student/photo-actions';
import { Button } from '@/components/common';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

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
    if (!ALLOWED.includes(file.type)) {
      setError('Solo JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 3MB.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true });
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
          accept="image/jpeg,image/png,image/webp"
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
