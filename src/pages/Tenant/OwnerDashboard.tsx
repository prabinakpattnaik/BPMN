import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Layout as LayoutIcon, Users, Activity, CheckCircle, Clock } from 'lucide-react';
import type { Workflow } from '../../types';

export const OwnerDashboard = () => {
    const { profile } = useAuth();
    const [metrics, setMetrics] = useState({
        total_users: 0,
        active_users: 0,
        total_workflows: 0,
        published_workflows: 0
    });
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.tenant_id) {
            loadDashboardData();
        }
    }, [profile?.tenant_id]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            if (!profile?.tenant_id) return;

            // 1. Fetch Metrics via RPC
            const { data: metricsData, error: metricsError } = await supabase
                .rpc('get_owner_dashboard_stats', { target_tenant_id: profile.tenant_id });

            if (metricsError) throw metricsError;

            // 2. Fetch Workflow List
            const { data: wfData, error: wfError } = await supabase
                .from('workflows')
                .select(`
                    *
                `)
                .eq('tenant_id', profile.tenant_id)
                .order('updated_at', { ascending: false });

            if (wfError) throw wfError;

            setMetrics(metricsData);
            setWorkflows(wfData || []);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8 bg-gray-50 min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 font-medium">Loading dashboard statistics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Overview of your organization's performance</p>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Users"
                        value={metrics.total_users}
                        icon={<Users className="text-blue-600" size={24} />}
                        color="bg-blue-50"
                    />
                    <MetricCard
                        title="Active Users (30d)"
                        value={metrics.active_users}
                        icon={<Activity className="text-green-600" size={24} />}
                        color="bg-green-50"
                    />
                    <MetricCard
                        title="Total Workflows"
                        value={metrics.total_workflows}
                        icon={<LayoutIcon className="text-purple-600" size={24} />}
                        color="bg-purple-50"
                    />
                    <MetricCard
                        title="Published Workflows"
                        value={metrics.published_workflows}
                        icon={<CheckCircle className="text-indigo-600" size={24} />}
                        color="bg-indigo-50"
                    />
                </div>

                {/* Workflow Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-900">Recent Workflows</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Workflow Name</th>
                                    <th className="px-6 py-4">Last Updated</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {workflows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                                            No workflows found.
                                        </td>
                                    </tr>
                                ) : (
                                    workflows.map((wf: any) => (
                                        <tr key={wf.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{wf.name}</div>
                                                <div className="text-xs text-gray-400 mt-0.5" title={wf.id}>ID: ...{wf.id.slice(-6)}</div>
                                            </td>
                                            {/* <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
                                                        {wf.creator?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="text-sm text-gray-600">{wf.creator?.full_name || 'Unknown'}</span>
                                                </div>
                                            </td> */}
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(wf.updated_at).toLocaleDateString()}
                                                <span className="text-xs text-gray-400 ml-1">
                                                    {new Date(wf.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={wf.status || (wf.is_published ? 'published' : 'draft')} />
                                                {wf.is_published && wf.status !== 'published' && (
                                                    <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">
                                                        Live
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleanliness
const MetricCard = ({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
            {icon}
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-600 border-gray-200',
        pending_review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        approved: 'bg-blue-50 text-blue-700 border-blue-200',
        published: 'bg-green-50 text-green-700 border-green-200',
    };

    // Normalize status key
    const normalized = (status || 'draft').toLowerCase().replace(' ', '_');
    const classes = config[normalized] || config['draft'];

    // Format label
    const label = normalized.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
            {label}
        </span>
    );
};
