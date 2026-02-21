import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
    Layout as LayoutIcon,
    Users,
    Activity,
    CheckCircle,
    TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
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
    const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true });
    const [searchTerm, setSearchTerm] = useState('');

    const filteredWorkflows = workflows.filter(w =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedWorkflows = {
        1: filteredWorkflows.filter(w => w.hierarchy_level === 1),
        2: filteredWorkflows.filter(w => w.hierarchy_level === 2),
        3: filteredWorkflows.filter(w => w.hierarchy_level === 3),
        4: filteredWorkflows.filter(w => (w.hierarchy_level === 4 || !w.hierarchy_level))
    };

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
            const { data: metricsData, error: metricsError } = await (supabase as any)
                .rpc('get_owner_dashboard_stats', { target_tenant_id: profile?.tenant_id || '' });

            if (metricsError) throw metricsError;

            // 2. Fetch Workflow List
            const { data: wfData, error: wfError } = await supabase
                .from('workflows')
                .select(`*`)
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
            <div className="flex h-full items-center justify-center p-8 bg-gray-50/50 min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"
                    />
                    <span className="text-gray-500 font-medium animate-pulse">Loading organization data...</span>
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
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Organization Overview</h1>
                        <p className="text-gray-500 mt-2 flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-500" />
                            Overview of your organization's performance and activity.
                        </p>
                    </motion.div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Users"
                        value={metrics.total_users}
                        icon={<Users className="text-blue-600" size={24} />}
                        color="bg-blue-50"
                        index={0}
                    />
                    <MetricCard
                        title="Active Users (30d)"
                        value={metrics.active_users}
                        icon={<Activity className="text-green-600" size={24} />}
                        color="bg-green-50"
                        index={1}
                    />
                    <MetricCard
                        title="Total Workflows"
                        value={metrics.total_workflows}
                        icon={<LayoutIcon className="text-purple-600" size={24} />}
                        color="bg-purple-50"
                        index={2}
                    />
                    <MetricCard
                        title="Published Workflows"
                        value={metrics.published_workflows}
                        icon={<CheckCircle className="text-indigo-600" size={24} />}
                        color="bg-indigo-50"
                        index={3}
                    />
                </div>

                {/* Process Hierarchy Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-6"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Process Hierarchy</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                {searchTerm ? `Showing ${filteredWorkflows.length} matches for "${searchTerm}"` : `Current organization contains ${workflows.length} processes`}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search processes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-64 transition-all"
                                />
                                <LayoutIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            </div>
                            <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                <button onClick={() => setExpandedLevels({ 1: true, 2: true, 3: true, 4: true })} className="text-xs text-blue-600 hover:text-blue-800 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Expand All</button>
                                <button onClick={() => setExpandedLevels({})} className="text-xs text-gray-500 hover:text-gray-700 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Collapse All</button>
                            </div>
                        </div>
                    </div>

                    {[1, 2, 3, 4].map(level => {
                        const levelWorkflows = groupedWorkflows[level as keyof typeof groupedWorkflows] || [];
                        const isExpanded = expandedLevels[level];
                        const levelNum = level as 1 | 2 | 3 | 4;

                        const levelConfig = {
                            1: { color: 'blue', label: 'L1: Restricted (Direct View & Below)', border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-900' },
                            2: { color: 'green', label: 'L2: Confidential (Dept View & Below)', border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-900' },
                            3: { color: 'yellow', label: 'L3: Internal (Team View & Below)', border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-900' },
                            4: { color: 'purple', label: 'L4: Public (Individual View Only)', border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-900' }
                        }[levelNum];

                        return (
                            <div key={level} className={`rounded-xl border ${levelConfig.border} overflow-hidden shadow-sm bg-white transition-all duration-300 ${isExpanded ? 'shadow-md ring-1 ring-black/5' : ''}`}>
                                <button
                                    onClick={() => setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }))}
                                    className={`w-full px-6 py-4 ${levelConfig.bg} flex items-center justify-between hover:brightness-95 transition-all`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg font-bold ${levelConfig.text} flex items-center gap-2`}>
                                            <span className="text-sm opacity-60">{isExpanded ? '▼' : '▶'}</span> {levelConfig.label}
                                        </span>
                                        <span className="bg-white/60 px-2.5 py-0.5 rounded-full text-xs font-bold text-gray-700 backdrop-blur-sm border border-white/20 shadow-sm">
                                            {levelWorkflows.length} Processes
                                        </span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="divide-y divide-gray-100 animate-in slide-in-from-top-2 duration-200">
                                        {levelWorkflows.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 text-sm italic bg-gray-50/30">No processes defined for this hierarchy level.</div>
                                        ) : (
                                            levelWorkflows.map(wf => (
                                                <div key={wf.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between group pl-8 border-l-4 border-transparent hover:border-l-blue-500">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-10 w-10 rounded-lg ${levelConfig.bg} flex items-center justify-center ${levelConfig.text} font-bold opacity-80 shadow-sm text-sm border border-black/5`}>
                                                            L{level}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition text-base">{wf.name}</h4>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">ID: {wf.id.slice(0, 8)}</span>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="flex items-center gap-1">
                                                                    Updated {new Date(wf.updated_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <StatusBadge status={wf.status} isPublished={wf.is_published} />
                                                        <button
                                                            onClick={() => window.location.href = `/my-workflow?id=${wf.id}`}
                                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                                        >
                                                            View Process
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
};

// Sub-components for premium feel
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
        under_review: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
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
