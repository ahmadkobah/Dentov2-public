import { Link } from 'react-router-dom';
import { Button } from '@dento/ui';
import { ShieldX } from 'lucide-react';

/**
 * 403 Forbidden page — shown when a user lacks the required platform permission.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">Access Denied</h1>
      <p className="mb-6 max-w-sm text-center text-gray-500 dark:text-gray-400">
        You don't have permission to view this page. Contact a platform owner if you believe this is
        an error.
      </p>
      <Link to="/">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
