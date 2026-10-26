/**
 * BarcodeScanner — html5-qrcode integration for scanning barcodes / QR codes.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@dento/ui';
import { Camera, X } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  className?: string;
}

export function BarcodeScanner({ onScan, className = '' }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-scanner-region');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Ignore decode failures (keep scanning)
        },
      );
      setIsActive(true);
    } catch (err: any) {
      setError(err?.message || t('inventory.barcodeScanner.cameraAccessDenied'));
      setIsActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsActive(false);
  };

  return (
    <div className={className}>
      {!isActive ? (
        <Button type="button" variant="outline" size="sm" onClick={startScanner} className="gap-2">
          <Camera className="h-4 w-4" /> {t('inventory.barcodeScanner.scanBarcode')}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('inventory.barcodeScanner.pointCamera')}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={stopScanner}
              aria-label={t('inventory.barcodeScanner.stopScanner')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div
            id="barcode-scanner-region"
            ref={containerRef}
            className="overflow-hidden rounded-md border"
            style={{ width: '100%', maxWidth: 320 }}
          />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
