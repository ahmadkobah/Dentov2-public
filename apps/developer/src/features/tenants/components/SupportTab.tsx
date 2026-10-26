import { useState } from 'react';
import { ExternalLink, HeadphonesIcon, Loader2 } from 'lucide-react';
import { Button } from '@dento/ui';
import { useTenantTickets } from '../hooks/useTenants.js';
import type { SupportTicket } from '../types/tenant-detail.types.js';

export function SupportTab({ tenantId }: { tenantId: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'tickets'>('tickets');

  const { data: ticketsRes, isLoading, error } = useTenantTickets(tenantId);
  const tickets = (ticketsRes?.data ?? []) as SupportTicket[];
  const openCount = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;

  const priorityStyles: Record<string, string> = {
    urgent: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400',
    high: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400',
    medium: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  const statusStyles: Record<string, string> = {
    open: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
    in_progress: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
    waiting_customer: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
    waiting_internal: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
    resolved: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  const formatStatus = (s: string) => s.replace(/_/g, ' ');

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={() => setActiveSubTab('sessions')}
          className={`gap-2 rounded-none border-b-2 px-4 py-3 hover:bg-transparent ${
            activeSubTab === 'sessions'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          Support Sessions
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveSubTab('tickets')}
          className={`gap-2 rounded-none border-b-2 px-4 py-3 hover:bg-transparent ${
            activeSubTab === 'tickets'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <HeadphonesIcon className="h-4 w-4" />
          Tickets ({openCount} open)
        </Button>
      </div>

      {activeSubTab === 'sessions' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <ExternalLink className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Support Sessions
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Impersonation sessions for this tenant will appear here. Use the impersonation feature
            to start a support session.
          </p>
          <Button variant="default" className="mt-4 gap-2">
            <ExternalLink className="h-4 w-4" />
            Start Session
          </Button>
        </div>
      ) : (
        <>
          {/* Tickets Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Support Tickets
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View and manage support requests from this tenant
              </p>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-error-500">Failed to load tickets</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <HeadphonesIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-2">No support tickets yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Ticket
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Subject
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Category
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Priority
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket._id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-brand-500">
                        {ticket.ticketNumber}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{ticket.subject}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {ticket.category}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[ticket.priority] ?? ''}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[ticket.status] ?? ''}`}
                        >
                          {formatStatus(ticket.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
