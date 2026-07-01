'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Barcode, Loader2, X } from 'lucide-react';
import { Button, FormField, Input } from '@/components/common';
import { cn } from '@/lib/utils/cn';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con el código detectado (o escrito a mano). */
  onDetected: (code: string) => void;
  /** Muestra un spinner mientras el padre resuelve el código. */
  busy?: boolean;
  error?: string | null;
}

function hasBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Cuerpo del escáner. Vive dentro de Dialog.Content (Radix lo monta/desmonta al
 * abrir/cerrar), así la cámara se enciende al abrir y se apaga al cerrar sin
 * necesidad de un branch de reset en el efecto.
 */
function ScannerBody({
  onDetected,
  busy,
  error,
}: {
  onDetected: (code: string) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const firedRef = React.useRef(false);
  const [manual, setManual] = React.useState('');
  const [camError, setCamError] = React.useState<string | null>(null);
  const supported = hasBarcodeDetector();

  React.useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled || firedRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes?.[0]?.rawValue;
            if (value) {
              firedRef.current = true;
              onDetected(String(value));
              return;
            }
          } catch {
            /* frame sin código, seguir */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setCamError('No pudimos abrir la cámara. Ingresa el código manualmente.');
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  return (
    <>
      {supported ? (
        <div className="mt-4 space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-primary/80" />
          </div>
          <p className="text-xs text-muted">Apunta al código de barras del producto.</p>
          {camError && <p className="text-xs text-warning">{camError}</p>}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
          Tu dispositivo no permite escanear con la cámara. Ingresa el código de barras a mano.
        </p>
      )}

      <div className="mt-4">
        <FormField label="O ingresa el código" htmlFor="bc_manual">
          <div className="flex gap-2">
            <Input
              id="bc_manual"
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 7801234567890"
            />
            <Button type="button" variant="secondary" disabled={manual.length < 8 || busy} onClick={() => onDetected(manual)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Barcode className="size-4" />}
              Buscar
            </Button>
          </div>
        </FormField>
        {busy && <p className="mt-2 text-xs text-muted">Consultando producto…</p>}
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </>
  );
}

export function BarcodeScanner({ open, onOpenChange, onDetected, busy, error }: BarcodeScannerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-border bg-elevated p-5 shadow-2xl',
          )}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-foreground">
              Escanear código de barras
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted hover:text-foreground" aria-label="Cerrar">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <ScannerBody onDetected={onDetected} busy={busy} error={error} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
