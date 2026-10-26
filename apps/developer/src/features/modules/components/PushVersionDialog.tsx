import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Separator,
} from '@dento/ui';
import { Upload, Plus, X, ArrowRight, Info } from 'lucide-react';
import { usePushVersion } from '../hooks/useModules.js';

const schema = z.object({
  version: z
    .string()
    .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Must be valid SemVer (e.g. 2.1.0)'),
});

type FormValues = z.infer<typeof schema>;

interface PushVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleSlug: string;
  currentVersion: string;
}

export function PushVersionDialog({
  open,
  onOpenChange,
  moduleSlug,
  currentVersion,
}: PushVersionDialogProps) {
  const [changes, setChanges] = useState<string[]>(['']);
  const pushVersion = usePushVersion(moduleSlug);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodFormResolver(schema),
    mode: 'onChange',
  });

  const watchedVersion = watch('version');

  useEffect(() => {
    if (open) {
      const [major, minor, patch] = currentVersion.split('.').map(Number);
      reset({ version: `${major}.${minor}.${patch + 1}` });
      setChanges(['']);
    }
  }, [open, currentVersion, reset]);

  const addChange = () => setChanges((c) => [...c, '']);
  const removeChange = (idx: number) => setChanges((c) => c.filter((_, i) => i !== idx));
  const updateChange = (idx: number, value: string) =>
    setChanges((c) => c.map((v, i) => (i === idx ? value : v)));

  const validChanges = changes.filter((c) => c.trim().length > 0);

  // Determine bump type for visual hint
  const getBumpType = (): string | null => {
    if (!watchedVersion || !currentVersion) return null;
    const [cMaj, cMin, cPat] = currentVersion.split('.').map(Number);
    const parts = watchedVersion.split('.').map(Number);
    if (parts.some(isNaN) || parts.length !== 3) return null;
    const [nMaj, nMin, nPat] = parts;
    if (nMaj > cMaj) return 'Major — breaking changes';
    if (nMaj === cMaj && nMin > cMin) return 'Minor — new features';
    if (nMaj === cMaj && nMin === cMin && nPat > cPat) return 'Patch — bug fixes';
    return null;
  };

  const bumpType = getBumpType();

  const onSubmit = (values: FormValues) => {
    if (validChanges.length === 0) return;
    pushVersion.mutate(
      {
        version: values.version,
        changelog: { changes: validChanges },
      },
      {
        onSuccess: () => {
          reset();
          setChanges(['']);
          onOpenChange(false);
        },
      },
    );
  };

  const [cMaj, cMin, cPat] = currentVersion.split('.').map(Number);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Push New Version
          </DialogTitle>
          <DialogDescription>
            Release a new version for <span className="font-semibold">{moduleSlug}</span>. This will
            update the module's version and notify all tenants that have it installed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Current → New version display */}
          <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
              <p className="text-lg font-mono font-semibold text-gray-700 dark:text-gray-300">
                v{currentVersion}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">New</p>
              <p className="text-lg font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                v{watchedVersion || '?.?.?'}
              </p>
            </div>
          </div>

          {/* Version input */}
          <div className="space-y-1.5">
            <Label htmlFor="new-version">New Version (SemVer) *</Label>
            <Input
              id="new-version"
              placeholder="1.2.0"
              className="font-mono"
              {...register('version')}
            />
            {errors.version && <p className="text-xs text-red-500">{errors.version.message}</p>}
            {bumpType && <p className="text-xs text-indigo-600 dark:text-indigo-400">{bumpType}</p>}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => reset({ version: `${cMaj}.${cMin}.${cPat + 1}` })}
              >
                Patch ({cMaj}.{cMin}.{cPat + 1})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => reset({ version: `${cMaj}.${cMin + 1}.0` })}
              >
                Minor ({cMaj}.{cMin + 1}.0)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => reset({ version: `${cMaj + 1}.0.0` })}
              >
                Major ({cMaj + 1}.0.0)
              </Button>
            </div>
          </div>

          <Separator />

          {/* Changelog entries */}
          <div className="space-y-2">
            <Label>Changelog Entries *</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Describe what changed in this version. At least one entry is required.
            </p>
            {changes.map((change, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={change}
                  onChange={(e) => updateChange(idx, e.target.value)}
                  placeholder={
                    idx === 0 ? 'e.g. Fixed patient search performance' : 'Another change...'
                  }
                  className="flex-1"
                />
                {changes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeChange(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addChange}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Entry
            </Button>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">What happens when you push:</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li>The module version is updated from v{currentVersion} to the new version</li>
                <li>The changelog is recorded with a timestamp</li>
                <li>All tenants with this module see the update as available</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || validChanges.length === 0 || pushVersion.isPending}
            >
              {pushVersion.isPending ? 'Pushing…' : 'Push Version'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
