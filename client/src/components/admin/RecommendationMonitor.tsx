
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw, Settings } from 'lucide-react';
import { getRecommendationMetrics } from '@/services/adminService';
import { getSocket } from '@/services/socketService';
import { getImageUrl, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type RecommendationSummary = {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  avgCtr: number;
  avgCvr: number;
};

type RecommendationProductMetric = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  primaryImage?: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  revenue: number;
};

type RecommendationMetrics = {
  summary: RecommendationSummary;
  products: RecommendationProductMetric[];
  updatedAt?: string;
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatPercentage = (value: number) =>
  Number.isFinite(value) ? `${value.toFixed(1)}%` : '0%';

const formatRelativeTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'just now';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'just now';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes <= 0) return 'just now';
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const RecommendationMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<RecommendationMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleMetricsUpdate = useCallback((data: RecommendationMetrics) => {
    if (!data || !isMountedRef.current) return;
    setMetrics(data);
    setError(null);
    setLoading(false);
    setIsRefreshing(false);
  }, []);

  const fetchMetrics = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const data = await getRecommendationMetrics();
        if (!isMountedRef.current) return;
        setMetrics(data);
      } catch (err) {
        if (!isMountedRef.current) return;
        const message = typeof err === 'string' ? err : (err as Error)?.message || 'Failed to load recommendation metrics';
        setError(message);
        toast({
          title: 'Unable to load recommendation metrics',
          description: message,
          variant: 'destructive',
        });
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    let socketInstance: ReturnType<typeof getSocket> | null = null;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      pollingInterval = setInterval(() => {
        fetchMetrics({ silent: true });
      }, 30000);
    };

    try {
      socketInstance = getSocket();
      socketInstance.on('recommendation-metrics', handleMetricsUpdate);
    } catch (err) {
      console.warn('RecommendationMonitor: socket unavailable, falling back to polling.', err);
      startPolling();
    }

    return () => {
      if (socketInstance) {
        socketInstance.off('recommendation-metrics', handleMetricsUpdate);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [fetchMetrics, handleMetricsUpdate]);

  const highlightCards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        key: 'ctr',
        label: 'Click-Through Rate',
        value: formatPercentage(metrics.summary.avgCtr),
        helper: `${metrics.summary.totalClicks.toLocaleString()} clicks from ${metrics.summary.totalImpressions.toLocaleString()} impressions`,
      },
      {
        key: 'cvr',
        label: 'Conversion Rate',
        value: formatPercentage(metrics.summary.avgCvr),
        helper: `${metrics.summary.totalConversions.toLocaleString()} conversions`,
      },
      {
        key: 'revenue',
        label: 'Attributed Revenue',
        value: currencyFormatter.format(metrics.summary.totalRevenue),
        helper: `From ${metrics.summary.totalConversions.toLocaleString()} attributed conversions`,
      },
      {
        key: 'impressions',
        label: 'Total Impressions',
        value: metrics.summary.totalImpressions.toLocaleString(),
        helper: `${metrics.summary.totalClicks.toLocaleString()} clicks and ${metrics.summary.totalConversions.toLocaleString()} conversions`,
      },
    ];
  }, [metrics]);

  const topProducts = useMemo(() => {
    if (!metrics) return [];
    return metrics.products.slice(0, 20);
  }, [metrics]);

  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`summary-skeleton-${index}`}>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`row-skeleton-${index}`} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-8 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Failed to load recommendation performance</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => fetchMetrics()}>Try again</Button>
    </div>
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Recommendation Engine</CardTitle>
          <CardDescription>Real-time performance across the recommendation funnel</CardDescription>
          {metrics?.updatedAt && (
            <p className="mt-2 text-xs text-muted-foreground">Last updated {formatRelativeTimestamp(metrics.updatedAt)}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchMetrics({ silent: true })}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing' : 'Refresh'}
          </Button>
          <Button size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !metrics ? (
          renderSkeleton()
        ) : error && !metrics ? (
          renderError()
        ) : (
          <>
            {error && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Using cached metrics</p>
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {highlightCards.map((card) => (
                <Card key={card.key}>
                  <CardContent className="space-y-2 pt-6">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-semibold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.helper}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <p className="text-sm font-medium">Top Performing Products</p>
                  <p className="text-xs text-muted-foreground">
                    Sorted by conversions · showing {topProducts.length} of {metrics?.products.length ?? 0}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Impressions
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Clicks
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        CTR
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Conversions
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        CVR
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Revenue
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                        No recommendation metrics yet. Trigger some outfit suggestions or orders to see live data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topProducts.map((product) => {
                      const imageSrc = product.primaryImage ? getImageUrl(product.primaryImage) : '/placeholder.svg';
                      const ctrBadgeVariant = product.ctr >= (metrics?.summary.avgCtr ?? 0) ? 'success' : 'outline';
                      const cvrBadgeVariant = product.cvr >= (metrics?.summary.avgCvr ?? 0) ? 'success' : 'outline';

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <img
                                src={imageSrc}
                                alt={product.name}
                                className="h-10 w-10 rounded-md object-cover"
                                onError={(event) => {
                                  (event.currentTarget as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[product.brand, product.category].filter(Boolean).join(' · ') || '—'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.impressions.toLocaleString()}</TableCell>
                          <TableCell>{product.clicks.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={ctrBadgeVariant as 'success' | 'outline'}>{formatPercentage(product.ctr)}</Badge>
                          </TableCell>
                          <TableCell>{product.conversions.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={cvrBadgeVariant as 'success' | 'outline'}>{formatPercentage(product.cvr)}</Badge>
                          </TableCell>
                          <TableCell>{currencyFormatter.format(product.revenue)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationMonitor;
