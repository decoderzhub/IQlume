import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Activity, RefreshCw, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { apiClient } from '../../lib/api-client';

interface DiagnosticCheck {
  status: 'pass' | 'fail' | 'warning';
  value?: any;
  message: string;
}

interface DiagnosticIssue {
  severity: 'critical' | 'error' | 'warning';
  issue: string;
  description: string;
  impact: string;
  fix: string;
}

interface DiagnosticResult {
  strategy_id: string;
  timestamp: string;
  checks: Record<string, DiagnosticCheck>;
  issues: DiagnosticIssue[];
  recommendations: any[];
  status: 'healthy' | 'warning' | 'error' | 'critical';
  strategy: any;
  grid_orders_detail?: any;
  trades_detail?: any[];
}

interface GridBotDiagnosticsProps {
  strategyId: string;
  onClose: () => void;
}

export function GridBotDiagnostics({ strategyId, onClose }: GridBotDiagnosticsProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.get(`/grid-diagnostics/strategy/${strategyId}`);
      setDiagnostics(result);
    } catch (err: any) {
      setError(err.message || 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const fixActivation = async () => {
    setFixing('activation');

    try {
      await apiClient.post(`/grid-diagnostics/strategy/${strategyId}/fix-activation`, {});
      await runDiagnostics();
    } catch (err: any) {
      setError(err.message || 'Failed to fix activation');
    } finally {
      setFixing(null);
    }
  };

  React.useEffect(() => {
    runDiagnostics();
  }, [strategyId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-orange-400';
      case 'critical':
      case 'fail':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
      case 'critical':
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading && !diagnostics) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-white">Running diagnostics...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Grid Bot Diagnostics</h2>
              {diagnostics && (
                <span className={`text-sm font-medium ${getStatusColor(diagnostics.status)}`}>
                  {diagnostics.status.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={runDiagnostics}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-400 mb-1">Error</h4>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {diagnostics && (
            <div className="space-y-6">
              {diagnostics.strategy && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Strategy Info</h3>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white ml-2">{diagnostics.strategy.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white ml-2">{diagnostics.strategy.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Active:</span>
                        <span className={`ml-2 font-medium ${diagnostics.strategy.is_active ? 'text-green-400' : 'text-red-400'}`}>
                          {diagnostics.strategy.is_active ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Auto Start:</span>
                        <span className={`ml-2 ${diagnostics.strategy.auto_start ? 'text-blue-400' : 'text-gray-500'}`}>
                          {diagnostics.strategy.auto_start ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {diagnostics.issues && diagnostics.issues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Issues Found</h3>
                  <div className="space-y-3">
                    {diagnostics.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-4 border ${
                          issue.severity === 'critical'
                            ? 'bg-red-500/10 border-red-500/20'
                            : issue.severity === 'error'
                            ? 'bg-orange-500/10 border-orange-500/20'
                            : 'bg-yellow-500/10 border-yellow-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getStatusIcon(issue.severity)}
                          <div className="flex-1">
                            <h4 className={`font-medium mb-1 ${
                              issue.severity === 'critical' ? 'text-red-400' :
                              issue.severity === 'error' ? 'text-orange-400' :
                              'text-yellow-400'
                            }`}>
                              {issue.issue}
                            </h4>
                            <p className="text-sm text-gray-300 mb-2">{issue.description}</p>
                            <div className="text-xs text-gray-400 space-y-1">
                              <p><strong>Impact:</strong> {issue.impact}</p>
                              <p><strong>Fix:</strong> {issue.fix}</p>
                            </div>

                            {issue.issue === 'Strategy is not active' && (
                              <Button
                                size="sm"
                                onClick={fixActivation}
                                disabled={fixing === 'activation'}
                                className="mt-3"
                              >
                                <Zap className="w-4 h-4 mr-2" />
                                {fixing === 'activation' ? 'Activating...' : 'Activate Strategy'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Diagnostic Checks</h3>
                <div className="space-y-2">
                  {Object.entries(diagnostics.checks).map(([key, check]) => (
                    <div key={key} className="bg-gray-800/30 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(check.status)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className={`text-xs font-medium ${getStatusColor(check.status)}`}>
                              {check.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{check.message}</p>
                          {check.value !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                              Value: {typeof check.value === 'boolean' ? (check.value ? 'true' : 'false') : JSON.stringify(check.value)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {diagnostics.grid_orders_detail && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Grid Orders</h3>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {diagnostics.grid_orders_detail.active?.length || 0}
                        </div>
                        <div className="text-sm text-gray-400">Active Orders</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {diagnostics.grid_orders_detail.filled?.length || 0}
                        </div>
                        <div className="text-sm text-gray-400">Filled Orders</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {(diagnostics.grid_orders_detail.active?.length || 0) +
                           (diagnostics.grid_orders_detail.filled?.length || 0)}
                        </div>
                        <div className="text-sm text-gray-400">Total Orders</div>
                      </div>
                    </div>

                    {diagnostics.grid_orders_detail.active && diagnostics.grid_orders_detail.active.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Sample Active Orders</h4>
                        <div className="space-y-1 text-xs">
                          {diagnostics.grid_orders_detail.active.slice(0, 5).map((order: any, index: number) => (
                            <div key={index} className="flex justify-between text-gray-400">
                              <span>{order.side.toUpperCase()} Level {order.level}</span>
                              <span>${order.price.toFixed(2)}</span>
                              <span>{order.quantity.toFixed(6)}</span>
                            </div>
                          ))}
                          {diagnostics.grid_orders_detail.active.length > 5 && (
                            <div className="text-gray-500 text-center pt-1">
                              ... and {diagnostics.grid_orders_detail.active.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
