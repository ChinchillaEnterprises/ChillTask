'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { dataClient } from '@/lib/amplify-data-client';
import { useAuth } from '@/providers/AuthProvider';

interface WebhookEvent {
  id: string;
  requestId: string;
  eventType: string;
  repoName?: string;
  branch?: string;
  commitMessage?: string;
  pusher?: string;
  success: boolean;
  errorMessage?: string;
  processingTimeMs?: number;
  timestamp: string;
}

interface WebhookStats {
  total: number;
  successRate: number;
  avgProcessingTime: number;
  lastWebhook: string;
}

interface WebhookHistoryResponse {
  events: WebhookEvent[];
  stats: WebhookStats;
  status: string;
}

export default function WebhookMonitorPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<WebhookHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhookHistory = async () => {
    try {
      // Call GraphQL query instead of REST API
      const { data: result, errors } = await dataClient.queries.getWebhookHistory();

      if (errors && errors.length > 0) {
        throw new Error('Failed to fetch webhook history');
      }

      if (!result) {
        throw new Error('No data returned');
      }

      // Events come as array from GraphQL (no parsing needed)
      setData({
        events: result.events as any,
        stats: result.stats as any,
        status: result.status,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    fetchWebhookHistory();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchWebhookHistory, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, authLoading]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-white p-8">
          <div className="max-w-6xl mx-auto">
            <div style={{ color: '#666' }}>Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-white p-8">
          <div className="max-w-6xl mx-auto">
            <div style={{ color: '#d32f2f' }}>Error: {error}</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1
            style={{
              fontWeight: 600,
              marginBottom: '16px',
              fontSize: '42px',
              letterSpacing: '-0.02em',
              color: '#1a1a1a',
            }}
          >
            Webhook Monitor
          </h1>
          <p
            style={{
              color: '#666',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: 1.6,
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            Monitor GitHub webhook events and deployment activity in real-time
          </p>
          <div className="flex items-center justify-center gap-2 text-sm mt-4" style={{ color: '#666' }}>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {data?.status || 'Unknown'}
          </div>
        </div>

        {/* Stats */}
        {data?.stats && (
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>Last webhook: {data.stats.lastWebhook}</span>
          </div>
        )}

        {/* Activity Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Recent Activity</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {data?.events && data.events.length > 0 ? (
              data.events.map((event) => (
                <div
                  key={event.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Time */}
                      <div className="text-sm text-gray-500 w-20 flex-shrink-0">
                        {formatTime(event.timestamp)}
                      </div>

                      {/* Repo → Branch */}
                      <div className="text-sm text-gray-900 min-w-0 flex-1">
                        {event.repoName ? (
                          <>
                            <span className="font-medium">{event.repoName}</span>
                            {event.branch && (
                              <span className="text-gray-500"> → {event.branch}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">No repository info</span>
                        )}
                      </div>

                      {/* Commit Message */}
                      <div className="text-sm text-gray-600 truncate flex-1 min-w-0">
                        {event.commitMessage ||
                         (event.errorMessage || 'No message')}
                      </div>

                      {/* Processing Time */}
                      <div className="text-sm text-gray-500 w-16 text-right flex-shrink-0">
                        {event.processingTimeMs}ms
                      </div>

                      {/* Status */}
                      <div className="w-4 flex-shrink-0">
                        {event.success ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Error message if failed */}
                  {!event.success && event.errorMessage && (
                    <div className="mt-2 ml-24 text-xs text-red-600">
                      {event.errorMessage}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">
                No webhook events yet
              </div>
            )}
          </div>
        </div>

        {/* Bottom Stats */}
        {data?.stats && data.stats.total > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{data.stats.total} webhooks today</span>
            <span>·</span>
            <span>{data.stats.successRate}% success</span>
            <span>·</span>
            <span>{data.stats.avgProcessingTime}ms avg</span>
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
