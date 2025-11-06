import React, { useState, useEffect } from 'react';
import { Eye, Activity, FileText, Server, RefreshCw, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

type TabType = 'overview' | 'activity' | 'logs' | 'health';

interface UserActivityLog {
  id: string;
  user_email: string;
  activity_type: string;
  created_at: string;
  metadata: Record<string, any>;
}

interface SystemLog {
  id: string;
  log_level: string;
  source: string;
  message: string;
  details: Record<string, any>;
  created_at: string;
}

interface EndpointHealth {
  id: string;
  endpoint_name: string;
  endpoint_url: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  http_status: number;
  last_checked_at: string;
  last_error?: string;
}

interface Stats {
  totalUsers: number;
  activeToday: number;
  totalStrategies: number;
  activeStrategies: number;
  totalTrades: number;
  todayTrades: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeToday: 0,
    totalStrategies: 0,
    activeStrategies: 0,
    totalTrades: 0,
    todayTrades: 0,
  });
  const [userLogs, setUserLogs] = useState<UserActivityLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointHealth[]>([]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [usersRes, strategiesRes, tradesRes, activeUsersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('trading_strategies').select('id, is_active', { count: 'exact' }),
        supabase.from('trades').select('id, created_at', { count: 'exact' }),
        supabase.from('user_activity_logs')
          .select('user_id')
          .eq('activity_type', 'login')
          .gte('created_at', today.toISOString())
      ]);

      const activeStrategiesCount = strategiesRes.data?.filter(s => s.is_active).length || 0;
      const todayTradesCount = tradesRes.data?.filter(t =>
        new Date(t.created_at) >= today
      ).length || 0;

      const uniqueActiveUsers = new Set(activeUsersRes.data?.map(log => log.user_id) || []).size;

      setStats({
        totalUsers: usersRes.count || 0,
        activeToday: uniqueActiveUsers,
        totalStrategies: strategiesRes.count || 0,
        activeStrategies: activeStrategiesCount,
        totalTrades: tradesRes.count || 0,
        todayTrades: todayTradesCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUserActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUserLogs(data || []);
    } catch (error) {
      console.error('Error fetching user activity:', error);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSystemLogs(data || []);
    } catch (error) {
      console.error('Error fetching system logs:', error);
    }
  };

  const fetchEndpointHealth = async () => {
    try {
      const { data, error } = await supabase
        .from('endpoint_health')
        .select('*')
        .order('endpoint_name');

      if (error) throw error;
      setEndpoints(data || []);
    } catch (error) {
      console.error('Error fetching endpoint health:', error);
    }
  };

  const checkEndpointHealth = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(`${apiUrl}/api/admin/check-health`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await fetchEndpointHealth();
      }
    } catch (error) {
      console.error('Error checking endpoint health:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUserActivity(),
      fetchSystemLogs(),
      fetchEndpointHealth(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Eye },
    { id: 'activity' as TabType, label: 'User Activity', icon: Activity },
    { id: 'logs' as TabType, label: 'System Logs', icon: FileText },
    { id: 'health' as TabType, label: 'Endpoint Health', icon: Server },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">System monitoring and analytics</p>
        </div>
        <button
          onClick={refreshStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-700 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-white hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab stats={stats} userLogs={userLogs.slice(0, 5)} endpoints={endpoints} />
      )}

      {activeTab === 'activity' && (
        <UserActivityTab logs={userLogs} />
      )}

      {activeTab === 'logs' && (
        <SystemLogsTab logs={systemLogs} />
      )}

      {activeTab === 'health' && (
        <EndpointHealthTab endpoints={endpoints} onCheckHealth={checkEndpointHealth} loading={loading} />
      )}
    </div>
  );
}

function OverviewTab({ stats, userLogs, endpoints }: { stats: Stats; userLogs: UserActivityLog[]; endpoints: EndpointHealth[] }) {
  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, change: '+12%', icon: Users, color: 'bg-blue-500' },
    { label: 'Active Today', value: stats.activeToday, change: '+8%', icon: Activity, color: 'bg-green-500' },
    { label: 'Total Strategies', value: stats.totalStrategies, change: '+5%', icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Active Strategies', value: stats.activeStrategies, change: '+15%', icon: CheckCircle, color: 'bg-orange-500' },
    { label: 'Total Trades', value: stats.totalTrades, change: '+10%', icon: TrendingUp, color: 'bg-pink-500' },
    { label: 'Today Trades', value: stats.todayTrades, change: '+20%', icon: Activity, color: 'bg-teal-500' },
    { label: 'System Health', value: `${endpoints.filter(e => e.status === 'healthy').length}/${endpoints.length}`, change: '100%', icon: Server, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-green-500 text-sm flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {card.change}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-3">
            {endpoints.slice(0, 4).map((endpoint) => (
              <div key={endpoint.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{endpoint.endpoint_name}</p>
                    <p className="text-gray-400 text-xs">{endpoint.response_time_ms}ms</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  endpoint.status === 'healthy'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {endpoint.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {userLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Activity className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">{log.user_email.split('@')[0]}</p>
                    <p className="text-gray-400 text-xs capitalize">{log.activity_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <span className="text-gray-400 text-xs">
                  {format(new Date(log.created_at), 'h:mm a')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserActivityTab({ logs }: { logs: UserActivityLog[] }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">User Activity Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Activity</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-white">{log.user_email.split('@')[0]}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                      {log.user_email.includes('darin') || log.user_email.includes('bryce') ? 'admin' : 'user'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300 capitalize">{log.activity_type.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-gray-400">{format(new Date(log.created_at), 'MM/dd/yyyy, h:mm:ss a')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SystemLogsTab({ logs }: { logs: SystemLog[] }) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'bg-blue-500/20 text-blue-400';
      case 'WARNING': return 'bg-yellow-500/20 text-yellow-400';
      case 'ERROR': return 'bg-red-500/20 text-red-400';
      case 'CRITICAL': return 'bg-red-600/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">System Logs</h2>
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.log_level)}`}>
                    {log.log_level}
                  </span>
                  <span className="text-gray-400 text-sm">SYSTEM • {log.source}</span>
                </div>
                <span className="text-gray-500 text-xs">{format(new Date(log.created_at), 'MM/dd/yyyy, h:mm:ss a')}</span>
              </div>
              <p className="text-white mb-2">{log.message}</p>
              {log.details && Object.keys(log.details).length > 0 && (
                <pre className="bg-gray-950 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EndpointHealthTab({ endpoints, onCheckHealth, loading }: { endpoints: EndpointHealth[]; onCheckHealth: () => void; loading: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Endpoint Health Status</h2>
          <button
            onClick={onCheckHealth}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Check All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {endpoint.status === 'healthy' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-white font-medium">{endpoint.endpoint_name}</p>
                    <p className="text-gray-300 text-xs">{endpoint.endpoint_url}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  endpoint.status === 'healthy'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {endpoint.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-white">
                  <Server className="w-4 h-4" />
                  <span>{endpoint.response_time_ms || 0}ms</span>
                </div>
                {endpoint.last_checked_at && (
                  <span className="text-gray-300 text-xs">
                    {format(new Date(endpoint.last_checked_at), 'h:mm:ss a')}
                  </span>
                )}
              </div>
              {endpoint.last_error && (
                <p className="mt-2 text-xs text-red-400">{endpoint.last_error}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
