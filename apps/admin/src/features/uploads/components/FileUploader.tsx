/**
 * FileUploader — Reusable drag-and-drop file upload component
 *
 * Per TECH_REQUIREMENTS.md — react-dropzone + @fastify/multipart
 * Per SECURITY_AND_ENCRYPTION.md §8 — client-side size/type validation
 *
 * Usage:
 *   <FileUploader
 *     category="xray"
 *     accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
 *     onUploadComplete={(result) => form.setValue('imageKey', result.key)}
 *   />
 */

import { useState, useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { Upload, X, FileImage, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Progress, cn } from '@dento/ui';
import { useDirectUpload, type UploadCategory, type UploadResult } from '../hooks/useUpload.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Props ──────────────────────────────────────────────────

interface FileUploaderProps {
  /** Upload category determines size limits and S3 path */
  category: UploadCategory;
  /** File type accept filter (react-dropzone format) */
  accept?: Accept;
  /** Called when upload completes successfully */
  onUploadComplete?: (result: UploadResult) => void;
  /** Called on upload error */
  onError?: (error: string) => void;
  /** Max file count (default: 1) */
  maxFiles?: number;
  /** Custom placeholder text */
  placeholder?: string;
  /** Disable the uploader */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

// ── File State ──────────────────────────────────────────────

interface FileState {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  result?: UploadResult;
  error?: string;
}

// ── Size formatting ─────────────────────────────────────────

const MAX_SIZES: Record<UploadCategory, number> = {
  xray: 25 * 1024 * 1024,
  cbct: 150 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
  chatAttachment: 10 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  stl: 50 * 1024 * 1024,
  intraoral_scan: 200 * 1024 * 1024,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Component ───────────────────────────────────────────────

export function FileUploader({
  category,
  accept,
  onUploadComplete,
  onError,
  maxFiles = 1,
  placeholder,
  disabled = false,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileState[]>([]);
  const { upload } = useDirectUpload();
  const { t } = useTranslation();

  const maxSize = MAX_SIZES[category];
  const maxSizeMB = Math.round(maxSize / (1024 * 1024));

  // ── Upload handler ──────────────────────────────────────

  const uploadFile = useCallback(
    async (fileState: FileState) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === fileState.file ? { ...f, status: 'uploading' as const, progress: 0 } : f,
        ),
      );

      try {
        const result = await upload(fileState.file, category);

        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileState.file
              ? { ...f, status: 'success' as const, progress: 100, result }
              : f,
          ),
        );

        onUploadComplete?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('uploads.status.error');

        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileState.file ? { ...f, status: 'error' as const, error: message } : f,
          ),
        );

        onError?.(message);
      }
    },
    [upload, category, onUploadComplete, onError, t],
  );

  // ── Drop handler ────────────────────────────────────────

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: FileState[] = acceptedFiles.map((file) => ({
        file,
        status: 'pending' as const,
        progress: 0,
      }));

      setFiles((prev) => {
        const combined = [...prev, ...newFiles].slice(-maxFiles);
        return combined;
      });

      // Auto-upload each file
      for (const fs of newFiles) {
        void uploadFile(fs);
      }
    },
    [maxFiles, uploadFile],
  );

  // ── Remove file ─────────────────────────────────────────

  const removeFile = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  }, []);

  // ── Dropzone setup ──────────────────────────────────────

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
    multiple: maxFiles > 1,
  });

  // ── Render ──────────────────────────────────────────────

  const hasFiles = files.length > 0;
  const isUploading = files.some((f) => f.status === 'uploading');

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          !isDragActive && !disabled && 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50',
          hasFiles && 'p-4',
        )}
      >
        <input {...getInputProps()} />

        {!hasFiles && (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {placeholder || t('uploads.dropzone.defaultPlaceholder')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('uploads.dropzone.maxFileSize')} {maxSizeMB}
              {t('uploads.dropzone.maxFileSizeMb')}
            </p>
          </>
        )}

        {hasFiles && !isUploading && (
          <p className="text-xs text-muted-foreground">{t('uploads.dropzone.replaceHint')}</p>
        )}
      </div>

      {/* File List */}
      {files.map((fs) => (
        <div
          key={`${fs.file.name}-${fs.file.lastModified}`}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileImage className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{fs.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(fs.file.size)}</p>

            {fs.status === 'uploading' && <Progress value={fs.progress} className="mt-1.5 h-1.5" />}
            {fs.status === 'error' && <p className="mt-0.5 text-xs text-destructive">{fs.error}</p>}
          </div>

          {/* Status / Actions */}
          <div className="shrink-0">
            {fs.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {fs.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {fs.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
            {(fs.status === 'success' || fs.status === 'error') && (
              <Button
                variant="ghost"
                size="icon"
                className="ms-1 h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(fs.file);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
