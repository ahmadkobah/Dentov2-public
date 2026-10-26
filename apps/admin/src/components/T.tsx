/**
 * Translation Component — <T>
 *
 * Usage:
 *   <T k="auth.login.title" />
 *   <T k="patients.list.showing" params={{ count: 10 }} />
 *   <T k="common.welcome" params={{ name: 'John' }} />
 *
 * Per MASTER_PLAN §26 - i18n System
 */

import type { ElementType } from 'react';
import { useTranslation } from '../stores/locale.store';

interface TProps {
  /** Translation key (e.g., "auth.login.title") */
  k: string;
  /** Optional parameters for interpolation */
  params?: Record<string, string | number>;
  /** Optional fallback text */
  fallback?: string;
  /** Render as specific element (default: span) */
  as?: ElementType;
  /** Additional className */
  className?: string;
}

/**
 * Translation component that renders translated text.
 *
 * @example
 * // Simple usage
 * <T k="auth.login.title" />
 *
 * @example
 * // With parameters
 * <T k="dashboard.welcome" params={{ name: user.firstName }} />
 *
 * @example
 * // As different element
 * <T k="common.loading" as="p" className="text-muted" />
 */
export function T({ k, params, fallback, as: Component = 'span', className }: TProps) {
  const { t } = useTranslation();
  const text = t(k, params);

  // If translation not found and fallback provided
  const displayText = text === k && fallback ? fallback : text;

  return <Component className={className}>{displayText}</Component>;
}

/**
 * Higher-order function for getting translations outside React components.
 * Use useTranslation() hook when inside components.
 *
 * @example
 * import { getTranslation } from './T';
 * const t = getTranslation();
 * const message = t('common.success');
 */
export { useTranslation as getTranslation } from '../stores/locale.store';
