import React, { useState, useEffect } from 'react';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  XCircle,
  Activity,
  Award,
  Building,
  Shield,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency, AgencyKpi, AgencyClient, CrmNotification } from '../../lib/supabase';

interface PortalDashboardTabProps {
  agency: CrmAgency;
  agencyIds: string[];
  agencyNames: string[];
}

type MonthlyData = { month: string; policies: number };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const PortalDashboardTab: React.FC<PortalDashboardTabProps> = ({ agencyIds }) => {
  const [kpi, setKpi] = useState<AgencyKpi | null>(null);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [topAgents, setTopAgents] = useState<{ name: string; policies: number; trend: number }[]>([]);
  const [carrierBreakdown, setCarrierBreakdown] = useState<{ carrier: string; count: number; pct: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [kpiRes, clientsRes, notifRes] = await Promise.all([
        supabase
          .from('agency_kpis')
          .select('*')
          .in('agency_id', agencyIds)
          .order('computed_at', { ascending: false })
          .limit(agencyIds.length * 5),
        supabase
          .from('agency_clients')
          .select('*')
          .in('agency_id', agencyIds),
        supabase
          .from('crm_notifications')
          .select('*')
          .in('agency_id', agencyIds)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      // Aggregate KPIs across agencies (get latest per agency, then sum)
      const kpiRows: AgencyKpi[] = kpiRes.data || [];
      const latestPerAgency = new Map<string, AgencyKpi>();
      for (const row of kpiRows) {
        if (!latestPerAgency.has(row.agency_id)) {
          latestPerAgency.set(row.agency_id, row);
        }
      }
      const kpiList = Array.from(latestPerAgency.values());
      const aggregatedKpi: AgencyKpi | null = kpiList.length > 0
        ? {
            ...kpiList[0],
            total_contacts: kpiList.reduce((s, k) => s + (k.total_contacts || 0), 0),
            total_policies: kpiList.reduce((s, k) => s + (k.total_policies || 0), 0),
            active_clients: kpiList.reduce((s, k) => s + (k.active_clients || 0), 0),
            terminated_clients: kpiList.reduce((s, k) => s + (k.terminated_clients || 0), 0),
            at_risk_clients: kpiList.reduce((s, k) => s + (k.at_risk_clients || 0), 0),
            policies_this_month: kpiList.reduce((s, k) => s + (k.policies_this_month || 0), 0),
            deals_closed: kpiList.reduce((s, k) => s + (k.deals_closed || 0), 0),
            revenue: kpiList.reduce((s, k) => s + (k.revenue || 0), 0),
          }
        : null;
      setKpi(aggregatedKpi);
      setNotifications(notifRes.data || []);

      const allClients: AgencyClient[] = clientsRes.data || [];
      setClients(allClients);

      // Compute top agents by active policy count
      const agentMap: Record<string, { name: string; policies: number }> = {};
      for (const c of allClients.filter(cl => cl.status === 'active')) {
        const key = c.agent_id || 'unassigned';
        if (!agentMap[key]) agentMap[key] = { name: key, policies: 0 };
        agentMap[key].policies++;
      }

      // Fetch agent names for IDs
      const agentIds = Object.keys(agentMap).filter(k => k !== 'unassigned');
      if (agentIds.length > 0) {
        const { data: agentNames } = await supabase
          .from('agents')
          .select('id, first_name, last_name')
          .in('id', agentIds);
        if (agentNames) {
          for (const a of agentNames) {
            if (agentMap[a.id]) {
              agentMap[a.id].name = `${a.first_name} ${a.last_name}`;
            }
          }
        }
      }

      const sorted = Object.values(agentMap)
        .sort((a, b) => b.policies - a.policies)
        .slice(0, 5)
        .map(a => ({ ...a, trend: 0 }));
      setTopAgents(sorted);

      // Carrier breakdown
      const carrierMap: Record<string, number> = {};
      const activeClients = allClients.filter(cl => cl.status === 'active');
      for (const c of activeClients) {
        const carrier = c.carrier || 'Unknown';
        carrierMap[carrier] = (carrierMap[carrier] || 0) + 1;
      }
      const total = activeClients.length || 1;
      const carriers = Object.entries(carrierMap)
        .map(([carrier, count]) => ({ carrier, count, pct: Math.round((count / total) * 100) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setCarrierBreakdown(carriers);

      // Monthly production data (last 6 months)
      const months: MonthlyData[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const count = allClients.filter(c => {
          if (!c.effective_date) return false;
          const ed = new Date(c.effective_date);
          return ed >= monthStart && ed <= monthEnd;
        }).length;
        months.push({ month: monthStr, policies: count });
      }
      setMonthlyData(months);

      setLoading(false);
    };
    load();
  }, [agencyIds.join(',')]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  const hasClients = clients.length > 0;
  const totalPolicies = hasClients ? clients.length : (kpi?.total_policies || kpi?.total_contacts || 0);
  const activeCount = hasClients
    ? clients.filter(c => c.status !== 'terminated').length
    : (kpi?.active_clients || kpi?.total_contacts || 0);
  const atRiskCount = hasClients
    ? clients.filter(c => c.status === 'at_risk').length
    : (kpi?.at_risk_clients || 0);
  const terminatedCount = hasClients
    ? clients.filter(c => c.status === 'terminated').length
    : (kpi?.terminated_clients || 0);
  const policiesThisMonth = kpi?.policies_this_month ?? monthlyData[monthlyData.length - 1]?.policies ?? 0;
  const lastMonthPolicies = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2].policies : 0;
  const monthChange = lastMonthPolicies > 0 ? Math.round(((policiesThisMonth - lastMonthPolicies) / lastMonthPolicies) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-600 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Production Overview</h2>
              <p className="text-white/60 text-sm mt-1">Real-time agency performance metrics</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gold-400">{totalPolicies.toLocaleString()}</p>
              <p className="text-xs text-white/60">Total Contacts</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Total Policies"
          value={totalPolicies}
          subtitle={policiesThisMonth > 0 ? `+${policiesThisMonth} this month` : 'No new this month'}
          accentColor="text-navy-600"
          bgColor="bg-navy-50"
        />
        <KpiCard
          icon={Users}
          label="Active Clients"
          value={activeCount}
          subtitle={`Excludes ${terminatedCount} declined`}
          accentColor="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <KpiCard
          icon={AlertTriangle}
          label="At-Risk Clients"
          value={atRiskCount}
          subtitle={atRiskCount > 0 ? 'Needs attention' : 'All healthy'}
          accentColor="text-gold-600"
          bgColor="bg-gold-50"
          alert={atRiskCount > 0}
        />
        <KpiCard
          icon={XCircle}
          label="Terminated"
          value={terminatedCount}
          subtitle={monthChange !== 0 ? `${monthChange > 0 ? '+' : ''}${monthChange}% vs last month` : 'Flat vs last month'}
          accentColor="text-red-600"
          bgColor="bg-red-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Production Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-steel-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-steel-800">Monthly Policy Production</h3>
              <p className="text-xs text-steel-500 mt-0.5">New policies written per month</p>
            </div>
            {monthChange !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                monthChange > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {monthChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthChange)}%
              </div>
            )}
          </div>
          <ProductionChart data={monthlyData} />
        </div>

        {/* Top Carriers */}
        <div className="bg-white rounded-xl border border-steel-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building className="w-4 h-4 text-steel-400" />
            <h3 className="text-sm font-semibold text-steel-800">Top Carriers</h3>
          </div>
          {carrierBreakdown.length === 0 ? (
            <p className="text-sm text-steel-400 text-center py-8">No policy data yet</p>
          ) : (
            <div className="space-y-3">
              {carrierBreakdown.map((c) => (
                <CarrierBar key={c.carrier} carrier={c.carrier} count={c.count} pct={c.pct} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Agents */}
        <div className="bg-white rounded-xl border border-steel-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-gold-500" />
            <h3 className="text-sm font-semibold text-steel-800">Top Producing Agents</h3>
          </div>
          {topAgents.length === 0 ? (
            <p className="text-sm text-steel-400 text-center py-8">No agent production data yet</p>
          ) : (
            <div className="space-y-2">
              {topAgents.map((agent, idx) => (
                <div key={agent.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-steel-50 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-gold-100 text-gold-700' :
                    idx === 1 ? 'bg-steel-200 text-steel-700' :
                    idx === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-steel-100 text-steel-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-steel-800 truncate">{agent.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-navy-700">{agent.policies}</p>
                    <p className="text-xs text-steel-400">policies</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Health + Activity */}
        <div className="space-y-6">
          {/* Client Health */}
          <div className="bg-white rounded-xl border border-steel-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-steel-400" />
              <h3 className="text-sm font-semibold text-steel-800">Client Health</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-xl font-bold text-emerald-700">{activeCount}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Active</p>
              </div>
              <div className={`text-center p-3 rounded-lg border ${atRiskCount > 0 ? 'bg-gold-50 border-gold-200' : 'bg-steel-50 border-steel-100'}`}>
                <p className={`text-xl font-bold ${atRiskCount > 0 ? 'text-gold-700' : 'text-steel-500'}`}>{atRiskCount}</p>
                <p className={`text-xs mt-0.5 ${atRiskCount > 0 ? 'text-gold-600' : 'text-steel-400'}`}>At Risk</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-xl font-bold text-red-700">{terminatedCount}</p>
                <p className="text-xs text-red-600 mt-0.5">Terminated</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-steel-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-steel-400" />
              <h3 className="text-sm font-semibold text-steel-800">Recent Activity</h3>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-steel-400 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-steel-50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy-400 mt-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-steel-700 leading-snug">{n.message}</p>
                      <p className="text-xs text-steel-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  value: number;
  subtitle: string;
  accentColor: string;
  bgColor: string;
  alert?: boolean;
}> = ({ icon: Icon, label, value, subtitle, accentColor, bgColor, alert }) => (
  <div className={`bg-white rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${alert ? 'border-gold-300 shadow-sm' : 'border-steel-200'}`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${accentColor}`} />
      </div>
      {alert && <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />}
    </div>
    <p className={`text-2xl font-bold ${accentColor}`}>{value.toLocaleString()}</p>
    <p className="text-xs text-steel-500 mt-1">{label}</p>
    <p className="text-xs text-steel-400 mt-0.5">{subtitle}</p>
  </div>
);

const ProductionChart: React.FC<{ data: MonthlyData[] }> = ({ data }) => {
  const max = Math.max(...data.map(d => d.policies), 1);

  return (
    <div className="flex items-end gap-3 h-48">
      {data.map((d, i) => {
        const height = Math.max((d.policies / max) * 100, 4);
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs font-medium text-steel-600">{d.policies}</span>
            <div className="w-full relative flex-1 flex items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  isLast ? 'bg-gold-400' : 'bg-navy-200'
                } hover:bg-navy-400`}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-xs text-steel-500">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
};

const CARRIER_COLORS = [
  'bg-navy-500',
  'bg-gold-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-rose-500',
  'bg-steel-400',
];

const CarrierBar: React.FC<{ carrier: string; count: number; pct: number }> = ({ carrier, count, pct }) => {
  const colorIdx = carrier.charCodeAt(0) % CARRIER_COLORS.length;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-steel-700">{carrier}</span>
        <span className="text-xs text-steel-500">{count} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-steel-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${CARRIER_COLORS[colorIdx]} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
