/**
 * Uploads feature — Translation keys
 * Source: FileUploader.tsx
 */

export const uploads = {
  dropzone: {
    defaultPlaceholder: 'Drag & drop a file here, or click to browse',
    maxFileSize: 'Maximum file size:',
    maxFileSizeMb: 'MB',
    replaceHint: 'Drop to replace, or click to add another',
  },
  status: {
    uploading: 'Uploading',
    success: 'Uploaded',
    error: 'Failed',
  },
} as const;
