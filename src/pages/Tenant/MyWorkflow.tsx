import { Canvas } from '../../components/Canvas/Canvas';
import { useStore } from '../../lib/store';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Clock, Layout as LayoutIcon } from 'lucide-react';

export const MyWorkflow = () => {
    const { user, profile } = useAuth();
    const { loadWorkflow, workflowName } = useStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserWorkflow = async () => {
            if (!user || !profile?.tenant_id) {
                setLoading(false);
                return;
            }

            try {
                // Fetch the latest workflow assigned to THIS specific user in this org
                const { data: workflows, error } = await supabase
                    .from('workflows')
                    .select('id')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('created_by', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                if (error) throw error;

                if (workflows && workflows.length > 0) {
                    await loadWorkflow((workflows as any[])[0].id);
                }
            } catch (err) {
                console.error('Error loading workflow:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserWorkflow();
    }, [user, profile, loadWorkflow]);

    if (loading) {
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
                <Canvas readOnly={true} />
            </div>
        </div>
    );
};
