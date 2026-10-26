/**
 * Report Category Page
 * Based on DENTO_V2_MASTER_PLAN.md §21
 *
 * Single parameterized component for all 5 report categories:
 * Financial, Patient, Appointment, Clinical, Operational
 *
 * - Free reports: Show mock data with chart preview
 * - Paid reports: Show blurred locked preview + "Upgrade to Advanced Analytics" CTA
 */

import { useParams, useNavigate } from 'react-router-dom';
import { CATEGORY_CONFIG } from '../config/report-catalog.config.js';
import { LiveReportCard } from '../components/LiveReportCard.js';
import { Lock, ArrowLeft, Crown, BarChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@dento/ui';
import { Badge } from '@dento/ui';
import { Button } from '@dento/ui';
import { useSubscriptionPlan } from '../../subscription/hooks/useSubscription.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Component ───────────────────────────────────────────────────────────────

export default function ReportCategoryPage() {
  const { t } = useTranslation();
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { data: subData } = useSubscriptionPlan();

  const config = category ? CATEGORY_CONFIG[category] : undefined;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">{t('reports.categoryNotFound')}</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4 me-2" />
            {t('reports.backToHub')}
          </Button>
        </div>
      </div>
    );
  }

  const freeReports = config.reports.filter((r) => r.isFree);
  const paidReports = config.reports.filter((r) => !r.isFree);
  const Icon = config.icon;

  // Check if tenant has the reports module enabled — if so, all reports are unlocked
  const enabledModules = subData?.plan?.enabledModules ?? [];
  const reportsUnlocked = enabledModules.length === 0 || enabledModules.includes('reports');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/reports')}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className={`p-3 rounded-lg ${config.bg}`}>
          <Icon className={`h-6 w-6 ${config.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{config.name.en}</h1>
          <p className="text-sm text-muted-foreground">
            {config.reports.length} reports
            {!reportsUnlocked && (
              <>
                {' '}
                • {freeReports.length} free • {paidReports.length} advanced
              </>
            )}
          </p>
        </div>
      </div>

      {/* When reports module is enabled, show ALL reports as live cards */}
      {reportsUnlocked ? (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            {t('reports.allReports')}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {config.reports.map((report) => (
              <LiveReportCard key={report.type} report={report} category={category!} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Free Reports Section */}
          {freeReports.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                {t('reports.freeReports')}
                <Badge variant="success" className="text-[10px] px-2 py-0">
                  FREE
                </Badge>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {freeReports.map((report) => (
                  <LiveReportCard key={report.type} report={report} category={category!} />
                ))}
              </div>
            </div>
          )}

          {/* Advanced (Locked) Reports Section */}
          {paidReports.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                {t('reports.advancedReports')}
                <Badge variant="outline" className="text-[10px] px-2 py-0">
                  ADVANCED
                </Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paidReports.map((report) => (
                  <Card
                    key={report.type}
                    className="relative overflow-hidden border-dashed opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{report.name.en}</CardTitle>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardDescription className="text-xs">{report.description.en}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Blurred Preview */}
                      <div className="relative h-32 mt-2">
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 backdrop-blur-sm rounded-lg z-10">
                          <div className="text-center">
                            <Lock className="h-6 w-6 text-muted-foreground mx-auto" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('reports.badge.locked')}
                            </p>
                          </div>
                        </div>
                        {/* Placeholder chart bars (blurred) */}
                        <div className="flex items-end gap-1.5 h-full px-4 pb-2">
                          {[0.65, 0.45, 0.78, 0.52, 0.38, 0.62].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-muted-foreground/10 rounded-t"
                              style={{ height: `${h * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Upgrade CTA */}
              <Card className="mt-4 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">
                          Unlock {paidReports.length} Advanced{' '}
                          {config.name.en.replace(' Reports', '')} Reports
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('reports.upgrade.unlockSubtitle')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="gap-2">
                      <Crown className="h-4 w-4" />
                      {t('reports.upgrade.button')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
