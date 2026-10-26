import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@dento/ui';
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Settings,
  Trash2,
  Filter,
  Building2,
  Users,
  Globe,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { useTenants, useTenantsStats, useDeleteTenant } from '../hooks/useTenants.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

const CreateTenantWizard = lazy(() => import('../components/CreateTenantWizard.js'));

const statusStyles: Record<string, string> = {
  active: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
  trial: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  suspended: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function TenantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showWizard, setShowWizard] = useState(false);

  const filters = {
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { data: tenantsData, isLoading, isError, refetch } = useTenants(filters);
  const { data: statsData } = useTenantsStats();
  const deleteTenant = useDeleteTenant();

  const tenants = tenantsData?.items ?? [];
  const totalCount = tenantsData?.meta?.total ?? tenants.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage all dental clinic subscriptions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="default" className="gap-2 py-2.5" onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4" />
            New Tenant
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              aria-label="Search tenants"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent ps-10 pe-4 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button
              variant="outline"
              className="gap-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button
              variant="outline"
              className="gap-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Building2 className="h-6 w-6 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Tenants</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {statsData?.totalTenants ?? totalCount}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 dark:bg-success-500/10">
              <Users className="h-6 w-6 text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {statsData?.activeTenants ?? '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 dark:bg-warning-500/10">
              <Globe className="h-6 w-6 text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Countries</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {statsData?.countries ?? '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-light-50 dark:bg-blue-light-500/10">
              <CreditCard className="h-6 w-6 text-blue-light-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total MRR</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${statsData?.totalMrr?.toLocaleString() ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            All Tenants ({totalCount})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tenant
                </th>
                <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Plan
                </th>
                <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Country
                </th>
                <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Users
                </th>
                <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  MRR
                </th>
                <th className="px-6 py-3.5 text-end text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tenants.map((tenant) => (
                <tr
                  key={tenant._id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      to={`/tenants/${tenant._id}`}
                      className="flex items-center gap-3 hover:text-brand-500"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg dark:bg-brand-500/10">
                        {tenant.logoUrl ? (
                          <img src={tenant.logoUrl} alt={tenant.name.en} className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          '🦷'
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {tenant.name.en}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {tenant.slug}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[tenant.status]}`}
                    >
                      {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {tenant.plan}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span>{tenant.countryFlag}</span>
                      <span className="text-gray-700 dark:text-gray-300">{tenant.country}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {tenant.users}/{tenant.maxUsers}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    ${tenant.mrr}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          aria-label="Tenant actions"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/tenants/${tenant._id}`} className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/tenants/${tenant._id}?tab=settings`} className="gap-2">
                            <Settings className="h-4 w-4" />
                            Configure
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-error-600 focus:text-error-600"
                          onClick={() => deleteTenant.mutate(tenant._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing 1-{tenants.length} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-500 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              disabled
            >
              Previous
            </Button>
            <Button variant="default" size="sm">
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-gray-500 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              disabled
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create Tenant Wizard */}
      {showWizard && (
        <Suspense fallback={null}>
          <CreateTenantWizard onClose={() => setShowWizard(false)} onCreated={() => refetch()} />
        </Suspense>
      )}
    </div>
  );
}
