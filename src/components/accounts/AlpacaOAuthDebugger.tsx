import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface OAuthConfigStatus {
  client_id_configured: boolean;
  client_id_preview?: string;
  client_secret_configured: boolean;
  redirect_uri?: string;
  redirect_uri_valid: boolean;
  frontend_url?: string;
  environment: string;
  authorize_endpoint: string;
  token_endpoint: string;
  api_base: string;
  issues: string[];
  configuration_valid: boolean;
}

export function AlpacaOAuthDebugger() {
  const [status, setStatus] = useState<OAuthConfigStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);

  const checkConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/alpaca/config-check`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check configuration: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Alpaca OAuth Debugger] Configuration status:', data);
      setStatus(data);
    } catch (err) {
      console.error('[Alpaca OAuth Debugger] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showDebugger) {
      checkConfiguration();
    }
  }, [showDebugger]);

  if (!showDebugger) {
    return (
      <Button
        variant="ghost"
        onClick={() => setShowDebugger(true)}
        className="text-xs"
      >
        <Info className="w-3 h-3 mr-1" />
        Debug OAuth Config
      </Button>
    );
  }

  return (
    <Card className="p-6 mt-4 border-blue-500/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Alpaca OAuth Configuration</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={checkConfiguration}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDebugger(false)}
              className="text-xs"
            >
              Hide
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking configuration...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {status && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              status.configuration_valid
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {status.configuration_valid ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-semibold ${
                  status.configuration_valid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {status.configuration_valid
                    ? 'Configuration Valid'
                    : `Configuration Issues (${status.issues.length})`
                  }
                </span>
              </div>

              {status.issues.length > 0 && (
                <ul className="ml-7 space-y-1">
                  {status.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-300">
                      • {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConfigItem
                label="Client ID"
                value={status.client_id_preview || 'Not set'}
                status={status.client_id_configured}
              />
              <ConfigItem
                label="Client Secret"
                value={status.client_secret_configured ? 'Configured' : 'Not set'}
                status={status.client_secret_configured}
              />
              <ConfigItem
                label="Redirect URI"
                value={status.redirect_uri || 'Not set'}
                status={status.redirect_uri_valid}
                fullWidth
              />
              <ConfigItem
                label="Frontend URL"
                value={status.frontend_url || 'Using default'}
                status={!!status.frontend_url}
              />
              <ConfigItem
                label="Environment"
                value={status.environment.toUpperCase()}
                status={true}
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">Endpoints</h4>
              <div className="space-y-1 text-xs font-mono">
                <div>
                  <span className="text-gray-400">Authorize: </span>
                  <span className="text-blue-400">{status.authorize_endpoint}</span>
                </div>
                <div>
                  <span className="text-gray-400">Token: </span>
                  <span className="text-blue-400">{status.token_endpoint}</span>
                </div>
                <div>
                  <span className="text-gray-400">API Base: </span>
                  <span className="text-blue-400">{status.api_base}</span>
                </div>
              </div>
            </div>

            {!status.configuration_valid && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-400">Action Required</h4>
                    <p className="text-sm text-yellow-300">
                      To fix these issues:
                    </p>
                    <ol className="text-sm text-yellow-300 space-y-1 ml-4 list-decimal">
                      <li>Go to your Alpaca dashboard at <a href="https://app.alpaca.markets" target="_blank" rel="noopener noreferrer" className="underline">app.alpaca.markets</a></li>
                      <li>Navigate to OAuth Apps section</li>
                      <li>Create or edit your OAuth application</li>
                      <li>Copy the Client ID and Client Secret to your server's .env file</li>
                      <li>Register your redirect URI exactly as shown above</li>
                      <li>Restart your backend server to load the new environment variables</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

interface ConfigItemProps {
  label: string;
  value: string;
  status: boolean;
  fullWidth?: boolean;
}

function ConfigItem({ label, value, status, fullWidth }: ConfigItemProps) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <div className="flex items-start gap-2">
        {status ? (
          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
          <p className={`text-sm font-mono break-all ${
            status ? 'text-white' : 'text-red-300'
          }`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
