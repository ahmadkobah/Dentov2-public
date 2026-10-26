/**
 * MaintenanceTab — Maintenance mode toggle + message
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.9
 */

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Label,
  Switch,
  Textarea,
  Badge,
} from '@dento/ui';
import { Save, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { SystemSettings, UpdateSystemSettingsInput } from '@dento/shared';
import { useUpdateSystemSettings } from '../hooks/useSystemSettings.js';

interface Props {
  settings: SystemSettings;
}

export function MaintenanceTab({ settings }: Props) {
  const updateMutation = useUpdateSystemSettings();

  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(settings.maintenanceMessage ?? '');

  const isDirty =
    maintenanceMode !== settings.maintenanceMode ||
    maintenanceMessage !== settings.maintenanceMessage;

  const handleReset = () => {
    setMaintenanceMode(settings.maintenanceMode);
    setMaintenanceMessage(settings.maintenanceMessage);
  };

  const handleSave = () => {
    const updates: UpdateSystemSettingsInput = {};
    if (maintenanceMode !== settings.maintenanceMode) updates.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== settings.maintenanceMessage)
      updates.maintenanceMessage = maintenanceMessage;
    if (Object.keys(updates).length > 0) updateMutation.mutate(updates);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Maintenance Mode
        </CardTitle>
        <CardDescription>
          When enabled, all tenant portals display a maintenance page. Only platform admins can
          access the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Banner */}
        {maintenanceMode && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Maintenance mode is active
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                All tenant portals are currently showing the maintenance page.
              </p>
            </div>
          </div>
        )}

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Enable Maintenance Mode</p>
              <p className="text-sm text-gray-500">
                Temporarily disable all tenant access to the platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={maintenanceMode ? 'destructive' : 'secondary'}>
              {maintenanceMode ? 'Active' : 'Inactive'}
            </Badge>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="mt-message">Maintenance Message</Label>
          <Textarea
            id="mt-message"
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="We're currently performing scheduled maintenance. Please check back soon."
            rows={4}
            maxLength={1000}
          />
          <p className="text-end text-xs text-gray-400">{(maintenanceMessage ?? '').length}/1000</p>
        </div>

        {/* Preview */}
        {maintenanceMessage && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Message Preview</Label>
            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              {maintenanceMessage}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4 dark:border-gray-800">
          <Button variant="outline" disabled={!isDirty} onClick={handleReset}>
            <RotateCcw className="me-1.5 h-4 w-4" />
            Reset
          </Button>
          <Button disabled={!isDirty || updateMutation.isPending} onClick={handleSave}>
            <Save className="me-1.5 h-4 w-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
