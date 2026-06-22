'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils/compress-image';
import { saveProgressPhoto } from '@/lib/student/photo-actions';
import { Button, Select } from '@/components/common';
import type { PhotoType } from '@/types/app';

const TYPES: { value: PhotoType; label: string }[] = [
  { value: 'front', label: 'Frente' },
  { value: 'side', label: 'Perfil' },
  { value: 'back', label: 'Espalda' },
  { value: 'other', label: 'Otra' },
];

export function ProgressPhotoUpload({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState<PhotoType>('front');
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
      const path = `${userId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const res = await saveProgressPhoto({ path, photoType });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      setError('No se pudo subir la foto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Select
        value={photoType}
        onChange={(e) => setPhotoType(e.target.value as PhotoType)}
        aria-label="Tipo de foto"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />
      <Button type="button" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
        <Camera className="size-4" /> Subir foto
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
