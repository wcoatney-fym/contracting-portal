import React, { useState, useEffect } from 'react';
import { Bell, Clock, FileText, CheckCircle, Send, Users, TrendingUp, UserPlus, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, ActivityLog } from '../lib/supabase';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ pending: 0, inProgress: 0, completed: 0, newHires: 0 });
  const [metrics, setMetrics] = useState({ totalNewHires: 0, totalFormsSent: 0, totalFormsCompleted: 0 });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [agencyMetrics, setAgencyMetrics] = useState({
    formsSent: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    completionPercentage: 0
  });

  useEffect(() => {
    loadData();
    checkExpirations();
    const interval = setInterval(() => {
      loadData();
      checkExpirations();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expandedAgency) {
      loadAgencyData(expandedAgency);
    }
  }, [expandedAgency]);

  const checkExpirations = async () => {
    const now = new Date().toISOString();

    const { data: expiredAgents } = await supabase
      .from('agents')
      .select('*')
      .lt('expiration_date', now)
      .neq('status', 'completed')
      .neq('status', 'expired');

    if (expiredAgents && expiredAgents.length > 0) {
      const agentIds = expiredAgents.map(a => a.id);

      await supabase
        .from('agents')
        .update({ status: 'expired' })
        .in('id', agentIds);

      for (const agent of expiredAgents) {
        await supabase.from('activity_log').insert({
          agent_id: agent.id,
          action: 'link_expired',
          details: `Link expired for ${agent.first_name} ${agent.last_name}`,
        });
      }
    }
  };

  const loadData = async () => {
    const { data: agents } = await supabase.from('agents').select('status');
    const { data: newHires } = await supabase
      .from('new_hires')
      .select('id')
      .eq('processed', false);
    const { data: allNewHires } = await supabase.from('new_hires').select('id');
    const { data: allAgents } = await supabase.from('agents').select('status');
    const { data: completedAgents } = await supabase
      .from('agents')
      .select('id')
      .eq('status', 'completed');

    if (agents) {
      setCounts({
        pending: agents.filter(a => a.status === 'pending').length,
        inProgress: agents.filter(a => a.status === 'in-progress').length,
        completed: agents.filter(a => a.status === 'completed').length,
        newHires: newHires?.length || 0,
      });
    }

    setMetrics({
      totalNewHires: allNewHires?.length || 0,
      totalFormsSent: allAgents?.length || 0,
      totalFormsCompleted: completedAgents?.length || 0,
    });

    const { data: logs } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (logs) {
      setActivities(logs);
    }

    setLastUpdate(new Date());
  };

  const loadAgencyData = async (agency: string) => {
    const { data: agencyAgents } = await supabase
      .from('agents')
      .select('status')
      .eq('agency', agency);

    if (agencyAgents) {
      const formsSent = agencyAgents.length;
      const pending = agencyAgents.filter(a => a.status === 'pending').length;
      const inProgress = agencyAgents.filter(a => a.status === 'in-progress').length;
      const completed = agencyAgents.filter(a => a.status === 'completed').length;
      const completionPercentage = formsSent > 0 ? Math.round((completed / formsSent) * 100) : 0;

      setAgencyMetrics({
        formsSent,
        pending,
        inProgress,
        completed,
        completionPercentage
      });
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const toggleAgency = (agency: string) => {
    setExpandedAgency(expandedAgency === agency ? null : agency);
  };

  const agencies = [
    { name: 'FYM', value: 'FYM' },
    { name: 'Wisechoice', value: 'Wisechoice' },
    { name: 'Aspire', value: 'Aspire' }
  ];

  const kpiCards = [
    {
      title: 'New Hires Awaiting Form',
      count: counts.newHires,
      icon: Users,
      accentColor: 'text-gold-600',
      bgColor: 'bg-gold-50',
      borderColor: 'border-gold-200',
      onClick: () => navigate('/new-hires'),
    },
    {
      title: 'Pending Verification',
      count: counts.pending,
      icon: Clock,
      accentColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      title: 'In Progress',
      count: counts.inProgress,
      icon: FileText,
      accentColor: 'text-navy-600',
      bgColor: 'bg-navy-50',
      borderColor: 'border-navy-200',
    },
    {
      title: 'Completed',
      count: counts.completed,
      icon: CheckCircle,
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Dashboard</h1>
          <p className="text-steel-500 text-sm mt-0.5">Overview of agent intake and contracting status</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-lg hover:bg-steel-100 relative transition-colors"
          >
            <Bell className="w-5 h-5 text-steel-600" />
            {activities.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-gold-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-steel-200 max-h-96 overflow-auto z-10">
              <div className="p-4 border-b border-steel-200">
                <h3 className="font-semibold text-steel-900">Recent Activity</h3>
              </div>
              <div className="p-2">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="p-3 hover:bg-steel-50 rounded-lg transition-colors">
                    <p className="text-sm text-steel-800">{activity.details}</p>
                    <p className="text-xs text-steel-400 mt-1">{formatTimeAgo(activity.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cumulative Metrics */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-600 rounded-xl p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative">
          <div className="flex items-center mb-6">
            <TrendingUp className="w-5 h-5 mr-2 text-gold-400" />
            <h2 className="text-lg font-bold">Cumulative Performance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-gold-400/20 rounded-lg mr-3">
                  <UserPlus className="w-5 h-5 text-gold-300" />
                </div>
                <span className="text-sm font-medium text-white/80">Total New Hires</span>
              </div>
              <div className="text-3xl font-bold">{metrics.totalNewHires}</div>
              <p className="text-xs text-white/50 mt-2">All-time new hire entries</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-gold-400/20 rounded-lg mr-3">
                  <Mail className="w-5 h-5 text-gold-300" />
                </div>
                <span className="text-sm font-medium text-white/80">Forms Sent</span>
              </div>
              <div className="text-3xl font-bold">{metrics.totalFormsSent}</div>
              <p className="text-xs text-white/50 mt-2">Total forms sent to agents</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-gold-400/20 rounded-lg mr-3">
                  <CheckCircle className="w-5 h-5 text-gold-300" />
                </div>
                <span className="text-sm font-medium text-white/80">Forms Completed</span>
              </div>
              <div className="text-3xl font-bold">{metrics.totalFormsCompleted}</div>
              <p className="text-xs text-white/50 mt-2">Successfully completed forms</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            onClick={card.onClick}
            className={`bg-white rounded-xl border ${card.borderColor} p-5 transition-all duration-200 hover:shadow-md ${card.onClick ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.accentColor}`} />
              </div>
              <span className={`text-2xl font-bold ${card.accentColor}`}>
                {card.count}
              </span>
            </div>
            <h3 className="text-steel-600 text-sm font-medium">{card.title}</h3>
          </div>
        ))}
      </div>

      <p className="text-xs text-steel-400 mb-6">
        Last updated {lastUpdate.toLocaleTimeString()}
      </p>

      {/* Agency Performance */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-bold text-navy-800 mb-5">Agency Performance</h2>

        <div className="space-y-3">
          {agencies.map((agency) => (
            <div key={agency.value} className="border border-steel-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleAgency(agency.value)}
                className={`w-full flex items-center justify-between px-5 py-4 text-left transition-all duration-200 ${
                  expandedAgency === agency.value
                    ? 'bg-navy-700 text-white'
                    : 'bg-white hover:bg-steel-50 text-steel-900'
                }`}
              >
                <span className="text-base font-semibold">{agency.name}</span>
                {expandedAgency === agency.value ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-steel-400" />
                )}
              </button>

              {expandedAgency === agency.value && (
                <div className="p-5 bg-steel-50 border-t border-steel-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-5 border border-navy-100">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-navy-50 rounded-lg mr-3">
                          <Mail className="w-4 h-4 text-navy-600" />
                        </div>
                        <span className="text-xs font-medium text-steel-600">Forms Sent</span>
                      </div>
                      <div className="text-2xl font-bold text-navy-800">{agencyMetrics.formsSent}</div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-amber-100">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-amber-50 rounded-lg mr-3">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs font-medium text-steel-600">Pending</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-700">{agencyMetrics.pending}</div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-sky-100">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-sky-50 rounded-lg mr-3">
                          <FileText className="w-4 h-4 text-sky-600" />
                        </div>
                        <span className="text-xs font-medium text-steel-600">In Progress</span>
                      </div>
                      <div className="text-2xl font-bold text-sky-700">{agencyMetrics.inProgress}</div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-emerald-100">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-emerald-50 rounded-lg mr-3">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xs font-medium text-steel-600">Completed</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-700">{agencyMetrics.completed}</div>
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        {agencyMetrics.completionPercentage}% completion rate
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-navy-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/populate-form')}
              className="w-full flex items-center px-4 py-3 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
            >
              <Send className="w-5 h-5 mr-3" />
              <span className="font-medium text-sm">Populate Form</span>
            </button>
            <button
              onClick={() => navigate('/agent-tracking')}
              className="w-full flex items-center px-4 py-3 bg-gold-500 text-navy-900 rounded-lg hover:bg-gold-600 transition-colors"
            >
              <Users className="w-5 h-5 mr-3" />
              <span className="font-medium text-sm">View Intake Form Tracking</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-navy-800 mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-64 overflow-auto">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="pb-3 border-b border-steel-100 last:border-0">
                <p className="text-sm text-steel-800">{activity.details}</p>
                <p className="text-xs text-steel-400 mt-1">{formatTimeAgo(activity.created_at)}</p>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-steel-400 text-center py-4">No recent activity</p>
            )}
          </div>
          <button
            onClick={() => navigate('/agent-tracking')}
            className="mt-4 text-navy-600 text-sm font-medium hover:underline"
          >
            View all agents
          </button>
        </div>
      </div>
    </div>
  );
};
