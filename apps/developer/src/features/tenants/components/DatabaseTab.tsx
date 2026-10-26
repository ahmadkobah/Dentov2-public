import { useState } from 'react';
import { Database, Box, Eye, Zap, Search, RefreshCw, Download, Loader2 } from 'lucide-react';
import { Button } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import type { DatabaseCollection } from '../types/tenant-detail.types.js';
import {
  useTenantDbStats,
  useTenantDbCollections,
  useTenantDbDocuments,
} from '../hooks/useTenants.js';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DatabaseTab({ tenant }: { tenant: TenantDetail }) {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState('');

  const { data: statsRes } = useTenantDbStats(tenant.slug);
  const {
    data: collectionsRes,
    isLoading: collectionsLoading,
    refetch: refetchCollections,
  } = useTenantDbCollections(tenant.slug);
  const { data: docsRes, isLoading: docsLoading } = useTenantDbDocuments(
    tenant.slug,
    selectedCollection ?? '',
  );

  const stats = statsRes?.data as
    | {
        collections: number;
        documents: number;
        dataSize: number;
        storageSize: number;
        indexSize: number;
        avgObjSize: number;
      }
    | undefined;
  const collections =
    (collectionsRes?.data as { collections: DatabaseCollection[] } | undefined)?.collections ?? [];
  const documents =
    (docsRes?.data as { documents: Record<string, unknown>[] } | undefined)?.documents ?? [];

  const totalDocs = collections.reduce((sum, c) => sum + c.documentCount, 0);
  const totalIndexes = collections.reduce((sum, c) => sum + c.indexCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Database className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Database Size</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats ? formatBytes(stats.dataSize) : tenant.dbSize}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 dark:bg-success-500/10">
              <Box className="h-5 w-5 text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Collections</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.collections ?? collections.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50 dark:bg-warning-500/10">
              <Eye className="h-5 w-5 text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {(stats?.documents ?? totalDocs).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-light-50 dark:bg-blue-light-500/10">
              <Zap className="h-5 w-5 text-blue-light-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Indexes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalIndexes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Collections List */}
        <div className="lg:col-span-1 rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Collections</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchCollections()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Refresh collections"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {collectionsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            ) : collections.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No collections found
              </div>
            ) : (
              collections.map((collection) => (
                <Button
                  key={collection.name}
                  variant="ghost"
                  onClick={() => setSelectedCollection(collection.name)}
                  className={`w-full justify-between rounded-none px-4 py-3 text-start h-auto hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedCollection === collection.name ? 'bg-brand-50 dark:bg-brand-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database
                      className={`h-4 w-4 ${
                        selectedCollection === collection.name ? 'text-brand-500' : 'text-gray-400'
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        selectedCollection === collection.name
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {collection.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {collection.documentCount.toLocaleString()}
                  </span>
                </Button>
              ))
            )}
          </div>
        </div>

        {/* Document Viewer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Query */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 mb-3">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quick Query (Read Only)
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder='{ "name": "Ahmed" }'
                className="flex-1 h-10 rounded-lg border border-gray-200 bg-gray-50 px-4 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <Button variant="default">Run</Button>
            </div>
          </div>

          {/* Documents Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {selectedCollection ? (
                  <>
                    Documents in <code className="ms-1 text-brand-500">{selectedCollection}</code>
                  </>
                ) : (
                  'Select a collection'
                )}
              </h3>
              {selectedCollection && (
                <Button variant="link" className="gap-2 p-0 h-auto">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
            {selectedCollection ? (
              docsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No documents in this collection
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          _id
                        </th>
                        {Object.keys(documents[0] ?? {})
                          .filter((k) => k !== '_id' && k !== '__v')
                          .slice(0, 4)
                          .map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {documents.map((doc) => {
                        const id = String(doc._id ?? '');
                        const visibleKeys = Object.keys(doc)
                          .filter((k) => k !== '_id' && k !== '__v')
                          .slice(0, 4);
                        return (
                          <tr
                            key={id}
                            className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="whitespace-nowrap px-4 py-3">
                              <code className="text-xs text-gray-600 dark:text-gray-400">
                                {id.slice(0, 12)}…
                              </code>
                            </td>
                            {visibleKeys.map((key) => (
                              <td
                                key={key}
                                className="max-w-[200px] truncate whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white"
                              >
                                {typeof doc[key] === 'object'
                                  ? JSON.stringify(doc[key]).slice(0, 60)
                                  : String(doc[key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Database className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-2">Select a collection to view documents</p>
              </div>
            )}
          </div>

          {/* Collection Info */}
          {selectedCollection &&
            (() => {
              const col = collections.find((c) => c.name === selectedCollection);
              return col ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                  <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
                    Collection Info
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Documents</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {col.documentCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Size</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatBytes(col.totalSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Indexes</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {col.indexCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg Doc Size</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatBytes(col.avgDocumentSize)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
        </div>
      </div>
    </div>
  );
}
