import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Badge } from '@dento/ui';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { useValidateCoupon, useRedeemCoupon, useRedeemedCoupons } from '../hooks/useCoupon.js';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CouponRedemptionCard() {
  const [code, setCode] = useState('');
  const validate = useValidateCoupon();
  const redeem = useRedeemCoupon();
  const { data: redeemed = [] } = useRedeemedCoupons();

  const validation = validate.data?.data;

  function handleValidate() {
    if (!code.trim()) return;
    validate.mutate(code.trim());
  }

  function handleRedeem() {
    if (!code.trim()) return;
    redeem.mutate(code.trim(), {
      onSuccess: () => {
        setCode('');
        validate.reset();
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Coupon Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input + Validate */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter coupon code…"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (validate.data) validate.reset();
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            className="font-mono uppercase"
          />
          <Button
            onClick={handleValidate}
            disabled={!code.trim() || validate.isPending}
            variant="outline"
          >
            {validate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
          </Button>
        </div>

        {/* Validation Result */}
        {validation && (
          <div
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              validation.valid
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
            }`}
          >
            {validation.valid ? (
              <>
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div className="space-y-1">
                  <p className="font-medium text-green-700 dark:text-green-300">
                    {validation.coupon!.discountType === 'fixed_amount'
                      ? `${validation.coupon!.discountAmount} off`
                      : `${validation.coupon!.discountPercent}% discount`}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Duration:{' '}
                    {validation.coupon!.duration === 'once'
                      ? 'One-time'
                      : validation.coupon!.duration === 'forever'
                        ? 'Forever'
                        : `${validation.coupon!.durationMonths} months`}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleRedeem}
                    disabled={redeem.isPending}
                    className="mt-2"
                  >
                    {redeem.isPending ? 'Redeeming…' : 'Redeem Coupon'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <X className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{validation.reason}</p>
              </>
            )}
          </div>
        )}

        {/* Redeemed Coupons List */}
        {redeemed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Active Coupons</p>
            <div className="space-y-2">
              {redeemed.map((r) => (
                <div
                  key={r.couponCode}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="font-mono text-sm font-medium">{r.couponCode}</span>
                    <span className="ms-2 text-xs text-muted-foreground">
                      {r.duration === 'once'
                        ? 'One-time'
                        : r.duration === 'forever'
                          ? 'Forever'
                          : `${r.remainingMonths}/${r.durationMonths} months left`}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {r.discountType === 'fixed_amount'
                      ? `${r.discountAmount} off`
                      : `${r.discountPercent}% off`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
