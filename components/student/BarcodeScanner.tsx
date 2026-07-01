'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Barcode, Loader2, X } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';
import { Button, FormField, Input } from '@/components/common';
import { cn } from '@/lib/utils/cn';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con el código detectado (o escrito a mano). */
  onDetected: (code: string) => void;
  /** Muestra un spinner mientras el padre resuelve el código. */
  busy?: boolean;
  error?: string | null;
}

/**
 * Cuerpo del escáner. Usa @zxing/browser (decodifica en JS desde la cámara), que
 * funciona en iOS Safari, Firefox y Android — no depende de la API nativa
 * BarcodeDetector. Vive dentro de Dialog.Content: Radix lo monta al abrir y lo
 * desmonta al cerrar, así la cámara se enciende/apaga sin lógica de reset.
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
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const firedRef = React.useRef(false);
  const [manual, setManual] = React.useState('');
  const [camError, setCamError] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setStarting(false);
          setCamError('Tu navegador no permite la cámara. Ingresa el código a mano.');
        }
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result) => {
            if (cancelled || firedRef.current || !result) return;
            firedRef.current = true;
            onDetected(result.getText());
            controlsRef.current?.stop();
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStarting(false);
      } catch {
        if (!cancelled) {
          setStarting(false);
          setCamError('No pudimos abrir la cámara (permiso denegado o no disponible). Ingresa el código a mano.');
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="mt-4 space-y-2">
        <div className="relative overflow-hidden rounded-lg border border-border bg-black">
          <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
          {starting && !camError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
              <Loader2 className="mr-2 size-4 animate-spin" /> Abriendo cámara…
            </div>
          )}
          {!camError && (
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-primary/80" />
          )}
        </div>
        {camError ? (
          <p className="text-xs text-warning">{camError}</p>
        ) : (
          <p className="text-xs text-muted">Apunta al código de barras del producto.</p>
        )}
      </div>

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
