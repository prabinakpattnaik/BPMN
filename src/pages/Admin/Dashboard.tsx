import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Layout as LayoutIcon,
    Building2,
    Globe,
    Clock,
    ArrowRight,
    TrendingUp,
    Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Workflow } from '../../types';

interface AdminMetrics {
    total_orgs: number;
    total_workflows: number;
    published_workflows: number;
    review_processes: number;
}

interface WorkflowWithTenant extends Workflow {
    tenants: {
        name: string;
    };
}

const Dashboard = () => {
    const [metrics, setMetrics] = useState<AdminMetrics>({
        total_orgs: 0,
        total_workflows: 0,
        published_workflows: 0,
        review_processes: 0
    });
    const [workflows, setWorkflows] = useState<WorkflowWithTenant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Metrics via RPC
            const { data: metricsData, error: metricsError } = await supabase
                .rpc('get_admin_dashboard_stats');

            if (metricsError) {
                console.warn('RPC might not be deployed yet, falling back to manual counts.');
                // Fallback if RPC is not yet in DB
                const [orgs, wfs, pub, rev] = await Promise.all([
                    supabase.from('tenants').select('*', { count: 'exact', head: true }),
                    supabase.from('workflows').select('*', { count: 'exact', head: true }),
                    supabase.from('workflows').select('*', { count: 'exact', head: true }).eq('is_published', true),
                    supabase.from('workflows').select('*', { count: 'exact', head: true }).eq('status', 'pending_review')
                ]);

                setMetrics({
                    total_orgs: orgs.count || 0,
                    total_workflows: wfs.count || 0,
                    published_workflows: pub.count || 0,
                    review_processes: rev.count || 0
                });
            } else {
                setMetrics(metricsData);
            }

            // 2. Fetch Workflow List with Tenant info
            const { data: wfData, error: wfError } = await supabase
                .from('workflows')
                .select(`
                    *,
                    tenants (
                        name
                    )
                `)
                .order('updated_at', { ascending: false })
                .limit(10);

            if (wfError) throw wfError;
            setWorkflows(wfData as any || []);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8 bg-gray-50/50 min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"
                    />
                    <span className="text-gray-500 font-medium animate-pulse">Analyzing system data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50/30 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Overview</h1>
                        <p className="text-gray-500 mt-2 flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-500" />
                            Live system metrics and across all organizations.
                        </p>
                    </motion.div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Organizations"
                        value={metrics.total_orgs}
                        icon={<Building2 className="text-blue-600" size={24} />}
                        color="bg-blue-50"
                        index={0}
                    />
                    <MetricCard
                        title="Total Workflows"
                        value={metrics.total_workflows}
                        icon={<Briefcase className="text-purple-600" size={24} />}
                        color="bg-purple-50"
                        index={1}
                    />
                    <MetricCard
                        title="Published Live"
                        value={metrics.published_workflows}
                        icon={<Globe className="text-green-600" size={24} />}
                        color="bg-green-50"
                        index={2}
                    />
                    <MetricCard
                        title="Pending Reviews"
                        value={metrics.review_processes}
                        icon={<Clock className="text-orange-600" size={24} />}
                        color="bg-orange-50"
                        index={3}
                    />
                </div>

                {/* Recent Activity Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
                >
                    <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-white">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Recent Workflow Activity</h2>
                            <p className="text-sm text-gray-400 mt-1">Real-time updates across the platform</p>
                        </div>
                        <button
                            onClick={loadDashboardData}
                            className="p-2 hover:bg-gray-50 rounded-full transition-colors text-blue-600"
                            title="Refresh Data"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/30 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    <th className="px-8 py-5">Workflow & Org</th>
                                    <th className="px-8 py-5">Last Activity</th>
                                    <th className="px-8 py-5">Current Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {workflows.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <LayoutIcon size={40} className="text-gray-200" />
                                                <span className="text-gray-400 font-medium">No system activity detected yet.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    workflows.map((wf, idx) => (
                                        <motion.tr
                                            key={wf.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * idx }}
                                            className="hover:bg-blue-50/30 transition-all duration-200 group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                        <LayoutIcon size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{wf.name}</div>
                                                        <div className="text-xs font-semibold text-gray-400 flex items-center gap-1 mt-1">
                                                            <Building2 size={12} />
                                                            {wf.tenants?.name || 'Independent Org'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-medium text-gray-700">
                                                    {new Date(wf.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">
                                                    {new Date(wf.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <StatusBadge status={wf.status} isPublished={wf.is_published} />
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {workflows.length > 0 && (
                        <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-center">
                            <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                                View Full Platform Audit <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, icon, color, index }: { title: string, value: number, icon: React.ReactNode, color: string, index: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -5 }}
        className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 flex items-center justify-between transition-all duration-300 group"
    >
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
                {value.toLocaleString()}
            </p>
        </div>
        <div className={`p-4 rounded-2xl ${color} shadow-inner transition-transform duration-300 group-hover:rotate-12`}>
            {icon}
        </div>
    </motion.div>
);

const StatusBadge = ({ status, isPublished }: { status: string, isPublished: boolean }) => {
    const config: Record<string, { bg: string, text: string, border: string }> = {
        draft: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
        pending_review: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    };

    const normalized = (status || 'draft').toLowerCase().replace(' ', '_');
    const style = config[normalized] || config['draft'];
    const label = normalized.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${style.bg} ${style.text} ${style.border}`}>
                {label}
            </span>
            {isPublished && status !== 'published' && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live Environment" />
            )}
        </div>
    );
};

export default Dashboard;