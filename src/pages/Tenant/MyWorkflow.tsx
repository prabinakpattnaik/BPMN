import { Canvas } from '../../components/Canvas/Canvas';
import { useStore } from '../../lib/store';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Clock, Layout as LayoutIcon } from 'lucide-react';

export const MyWorkflow = () => {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const { loadWorkflow, workflowName, resetWorkflow, workflowId } = useStore();
    const [loading, setLoading] = useState(true);
    const fetchInProgress = useRef(false);

    useEffect(() => {
        const fetchUserWorkflow = async () => {
            // Prevent duplicate calls if one is already running
            if (fetchInProgress.current || authLoading) return;

            if (!user) {
                setLoading(false);
                return;
            }

            fetchInProgress.current = true;

            try {
                // If we already have a workflow loaded, don't re-search for it
                if (workflowId) {
                    setLoading(false);
                    return;
                }

                // Determine if we actually need a profile refresh
                if (!profile?.tenant_id) {
                    await refreshProfile();
                }

                // If we still don't have it, we can't fetch workflows
                const currentTenantId = profile?.tenant_id;
                if (!currentTenantId) {
                    setLoading(false);
                    return;
                }

                // Fetch the latest workflow assigned to THIS specific user in this org
                const { data: workflows, error } = await supabase
                    .from('workflows')
                    .select('id')
                    .eq('tenant_id', currentTenantId)
                    .eq('created_by', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                if (error) throw error;

                if (workflows && workflows.length > 0) {
                    await loadWorkflow((workflows as any[])[0].id);
                } else {
                    resetWorkflow();
                }
            } catch (err) {
                console.error('Error loading workflow:', err);
            } finally {
                setLoading(false);
                fetchInProgress.current = false;
            }
        };

        fetchUserWorkflow();
    }, [user?.id, profile?.tenant_id, authLoading, workflowId]); // Added workflowId to deps

    if (authLoading || (loading && user)) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-500 font-medium">Retrieving your organization's workflow...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden">
            <header className="h-16 border-b border-gray-100 flex items-center px-8 justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <LayoutIcon size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 text-lg leading-tight">{workflowName || 'Assigned Workflow'}</h1>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live View
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                <Shield size={10} />
                                Read Only
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <Clock size={14} />
                        Auto-syncing
                    </span>
                </div>
            </header>
            <div className="flex-1 relative overflow-hidden">
                {!workflowId ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50">
                        <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-gray-100 max-w-sm text-center transform transition-all hover:scale-[1.02]">
                            <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Shield size={40} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">No Assigned Workflow</h2>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                You don't have any business processes assigned to your profile yet. Please contact your system administrator.
                            </p>
                            <button
                                onClick={() => refreshProfile()}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                Refresh Status
                            </button>
                        </div>
                    </div>
                ) : (
                    <Canvas readOnly={true} />
                )}
            </div>
        </div>
    );
};
