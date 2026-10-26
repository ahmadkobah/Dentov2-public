/**
 * SignatureWidget — Canvas-based signature capture component.
 *
 * Per V2_STRUCTURE.md: Used in consent forms for capturing
 * patient and witness signatures. Outputs base64 PNG string.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@dento/ui';
import { Eraser, Check } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

interface SignatureWidgetProps {
  /** Existing signature data URL to display */
  value?: string;
  /** Callback with base64 data URL when saved */
  onChange: (dataUrl: string) => void;
  /** Label shown above the pad */
  label?: string;
  /** Pad width */
  width?: number;
  /** Pad height */
  height?: number;
  disabled?: boolean;
}

export function SignatureWidget({
  value,
  onChange,
  label = 'Signature',
  width = 400,
  height = 150,
  disabled = false,
}: SignatureWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const { t } = useTranslation();

  // Initialize canvas with existing value
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasContent(true);
    };
    img.src = value;
  }, [value]);

  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const touch = e.touches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;
      setIsDrawing(true);
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [disabled, getPos],
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasContent(true);
    },
    [isDrawing, disabled, getPos],
  );

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onChange('');
  }, [onChange]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label || t('consent.signature.label')}
      </label>
      <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full cursor-crosshair touch-none ${disabled ? 'opacity-50' : ''}`}
          style={{ height: `${height}px` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || !hasContent}
        >
          <Eraser className="me-1 h-3.5 w-3.5" />
          {t('consent.signature.clearBtn')}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={disabled || !hasContent}
        >
          <Check className="me-1 h-3.5 w-3.5" />
          {t('consent.signature.confirmBtn')}
        </Button>
      </div>
    </div>
  );
}
