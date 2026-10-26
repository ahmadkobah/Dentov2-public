import { Shield, Clock } from 'lucide-react';
import { useActiveSupportSession } from '../hooks/useSupportSession.js';

/* ------------------------------------------------------------------ */
/*  Banner                                                             */
/* ------------------------------------------------------------------ */

export function SupportSessionBanner() {
  const { data: session } = useActiveSupportSession();

  if (!session) return null;

  return (
    <div className="flex items-center justify-between border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm dark:border-yellow-800 dark:bg-yellow-900/20">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-yellow-600" />
        <span className="font-medium text-yellow-800 dark:text-yellow-200">
          Support Session Active
        </span>
        <span className="text-yellow-600 dark:text-yellow-300">
          — {session.performedBy.name} is assisting your clinic
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-yellow-600">
        <Clock className="h-3 w-3" />
        Expires: {new Date(session.expiresAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
