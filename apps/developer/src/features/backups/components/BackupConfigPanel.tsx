import { useState, useEffect } from 'react';
import { Card, Button, Input, Label, Badge, Switch } from '@dento/ui';
import { Settings, Save, Loader2, RefreshCw } from 'lucide-react';
import { useBackupConfig, useUpdateBackupConfig } from '../hooks/useBackups.js';
import { toast } from '@dento/ui';

export function BackupConfigPanel() {
  const { data: config, isLoading } = useBackupConfig();
  const updateConfig = useUpdateBackupConfig();

  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleCron, setScheduleCron] = useState('0 3 * * *');
  const [retentionDays, setRetentionDays] = useState(30);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [dirty, setDirty] = useState(false);

  // Populate form from server config
  useEffect(() => {
    if (!config) return;
    setScheduleEnabled(config.scheduleEnabled);
    setScheduleCron(config.scheduleCron);
    setRetentionDays(config.retentionDays);
    setEncryptionEnabled(config.encryptionEnabled);
    setNotifyOnFailure(config.notifyOnFailure);
    setNotifyEmail(config.notifyEmail ?? '');
    setDirty(false);
  }, [config]);

  function markDirty() {
    setDirty(true);
  }

  async function handleSave() {
    try {
      await updateConfig.mutateAsync({
        scheduleEnabled,
        scheduleCron,
        retentionDays,
        encryptionEnabled,
        notifyOnFailure,
        notifyEmail: notifyEmail || null,
      });
      toast.success('Backup configuration saved');
      setDirty(false);
    } catch {
      toast.error('Failed to save backup configuration');
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading configuration…
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <h3 className="text-base font-semibold">Global Backup Defaults</h3>
        </div>
        <Button size="sm" onClick={handleSave} disabled={!dirty || updateConfig.isPending}>
          {updateConfig.isPending ? (
            <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="me-1.5 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Schedule Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Scheduled Backups</Label>
            <p className="text-xs text-gray-500">Run backups on a cron schedule</p>
          </div>
          <Switch
            checked={scheduleEnabled}
            onCheckedChange={(v) => {
              setScheduleEnabled(v);
              markDirty();
            }}
          />
        </div>

        {/* Cron Schedule */}
        <div className="space-y-1.5">
          <Label className="text-sm">Cron Schedule</Label>
          <Input
            value={scheduleCron}
            onChange={(e) => {
              setScheduleCron(e.target.value);
              markDirty();
            }}
            disabled={!scheduleEnabled}
            placeholder="0 3 * * *"
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-400">Default: daily at 3:00 AM</p>
        </div>

        {/* Retention Days */}
        <div className="space-y-1.5">
          <Label className="text-sm">Retention (days)</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={retentionDays}
            onChange={(e) => {
              setRetentionDays(Number(e.target.value));
              markDirty();
            }}
          />
        </div>

        {/* Encryption Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Encryption</Label>
            <p className="text-xs text-gray-500">AES-256-GCM at rest</p>
          </div>
          <Switch
            checked={encryptionEnabled}
            onCheckedChange={(v) => {
              setEncryptionEnabled(v);
              markDirty();
            }}
          />
        </div>

        {/* Failure Notifications */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Failure Alerts</Label>
            <p className="text-xs text-gray-500">Email on backup failure</p>
          </div>
          <Switch
            checked={notifyOnFailure}
            onCheckedChange={(v) => {
              setNotifyOnFailure(v);
              markDirty();
            }}
          />
        </div>

        {/* Notification Email */}
        <div className="space-y-1.5">
          <Label className="text-sm">Alert Email</Label>
          <Input
            type="email"
            value={notifyEmail}
            onChange={(e) => {
              setNotifyEmail(e.target.value);
              markDirty();
            }}
            disabled={!notifyOnFailure}
            placeholder="ops@example.com"
          />
        </div>
      </div>

      {/* Status Info */}
      {config && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          <Badge variant="secondary" className="text-xs">
            <RefreshCw className="me-1 h-3 w-3" />
            Provider: {config.storageProvider.toUpperCase()}
          </Badge>
          {config.lastBackupAt && (
            <Badge variant="secondary" className="text-xs">
              Last backup: {new Date(config.lastBackupAt).toLocaleDateString()}
            </Badge>
          )}
          {config.lastRestoreTestAt && (
            <Badge variant="secondary" className="text-xs">
              Last restore test: {new Date(config.lastRestoreTestAt).toLocaleDateString()}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}
