/**
 * InsuranceCompanyDetailPage — View details of an insurance company.
 * Shows company info, coverage, and claim statistics.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Insurance Management).
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceCompanyDetail } from '../hooks/useInsurance.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@dento/ui';
import { ArrowLeft, Pencil, Building2, Mail, Phone, User } from 'lucide-react';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '@/stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

// ── Component ──────────────────────────────────────────

export default function InsuranceCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: company, isLoading, isError, error, refetch } = useInsuranceCompanyDetail(id!);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-48 rounded" />
          <div className="bg-muted h-64 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="p-6">
        <ErrorState
          title={t('insurance.companyDetail.error.loadFailed')}
          message={error?.message ?? 'Company not found'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const fmtDate = (d?: string) => (d ? formatDate(d) : '—');

  const fmtCurrency = (n?: number) => (n !== undefined ? formatCurrency(n) : '—');

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={company.name?.en ?? 'Insurance Company'} description={company.code}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/insurance-companies')}>
            <ArrowLeft className="me-2 h-4 w-4" /> {t('insurance.companyDetail.actions.back')}
          </Button>
          <Button size="sm" onClick={() => navigate(`/insurance-companies/${id}/edit`)}>
            <Pencil className="me-2 h-4 w-4" /> {t('insurance.companyDetail.actions.edit')}
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('insurance.companyDetail.title')}</CardTitle>
            <Badge variant={company.isActive ? 'default' : 'destructive'}>
              {company.isActive
                ? t('insurance.companies.status.active')
                : t('insurance.companies.status.inactive')}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">
                    {t('insurance.companyDetail.labels.nameEnglish')}
                  </p>
                  <p className="font-medium">{company.name?.en}</p>
                </div>
              </div>
              {company.name?.ar && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      {t('insurance.companyDetail.labels.nameArabic')}
                    </p>
                    <p className="font-medium" dir="rtl">
                      {company.name.ar}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">{t('insurance.companyDetail.labels.code')}</p>
                <p className="font-medium font-mono">{company.code}</p>
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              {company.contactPerson && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      {t('insurance.companyDetail.labels.contactPerson')}
                    </p>
                    <p className="font-medium">{company.contactPerson}</p>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      {t('insurance.companyDetail.labels.phone')}
                    </p>
                    <p className="font-medium">{company.phone}</p>
                  </div>
                </div>
              )}
              {company.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      {t('insurance.companyDetail.labels.email')}
                    </p>
                    <p className="font-medium">{company.email}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Coverage */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">
                  {t('insurance.companyDetail.labels.defaultCoverage')}
                </p>
                <p className="text-lg font-semibold">{company.coveragePercentage}%</p>
              </div>
              {company.maxCoverage !== undefined && company.maxCoverage > 0 && (
                <div>
                  <p className="text-muted-foreground">
                    {t('insurance.companyDetail.labels.maxCoverage')}
                  </p>
                  <p className="text-lg font-semibold">{fmtCurrency(company.maxCoverage)}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p>{t('insurance.companyDetail.labels.created')}</p>
                <p className="font-medium text-foreground">{fmtDate(company.createdAt)}</p>
              </div>
              <div>
                <p>{t('insurance.companyDetail.labels.lastUpdated')}</p>
                <p className="font-medium text-foreground">{fmtDate(company.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t('insurance.companyDetail.quickActions.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/insurance-claims')}
            >
              {t('insurance.companyDetail.quickActions.viewClaims')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/insurance-claims/new')}
            >
              {t('insurance.companyDetail.quickActions.newClaim')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
