import { Canvas } from '../../components/Canvas/Canvas';
import { useStore } from '../../lib/store';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Clock, Layout as LayoutIcon, Send, CheckCircle } from 'lucide-react';

export const MyWorkflow = () => {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const { loadWorkflow, saveWorkflow, workflowName, resetWorkflow, workflowId, showNotification } = useStore();
    const [loading, setLoading] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);
    const [workflowStatus, setWorkflowStatus] = useState<'draft' | 'pending_review' | 'approved' | 'published'>('draft');
    const fetchInProgress = useRef(false);

    // Role Checks
    const role = profile?.role || 'Viewer';
    const isAnalyst = role === 'Analyst' || role === 'tenant';
    const isOwner = role === 'Owner';
    const isReviewer = role === 'Reviewer';
    const isViewer = role === 'Viewer';

    // Permission Logic
    // Analyst can edit ONLY if draft.
    const canEdit = isAnalyst && workflowStatus === 'draft';

    // Analyst can submit if draft.
    const canSubmit = isAnalyst && workflowStatus === 'draft';

    // Reviewer can ONLY act if pending_review.
    const canReview = isReviewer && workflowStatus === 'pending_review';

    // Owner can ONLY publish if approved.
    const canPublish = isOwner && workflowStatus === 'approved';

    // View Comments: Analyst, Reviewer, Owner can view always (if workflow exists). Viewer never.
    // const canViewComments = !isViewer;

    // Add Comments: Reviewer (when pending), Analyst (always? or when pending/draft?). 
    // Request says: "Analyst... submit... then only reviewer can see... show conversation". 
    // "give the right panel to add just only comment for reviewer". 
    // "Owner... can see the comments but not add". 
    // So: Reviewer can Add. Owner CANNOT. Analyst CAN (to reply).
    const canAddComments = isReviewer || isAnalyst;

    const fetchUserWorkflow = async () => {
        if (fetchInProgress.current || authLoading) return;

        if (!user) {
            setLoading(false);
            setIsInitializing(false);
            return;
        }

        fetchInProgress.current = true;
        setIsInitializing(true);

        try {
            if (!profile?.tenant_id) {
                await refreshProfile();
            }

            const currentTenantId = profile?.tenant_id;
            if (!currentTenantId) {
                setLoading(false);
                return;
            }

            let query = supabase
                .from('workflows')
                .select('id, is_published, status')
                .eq('tenant_id', currentTenantId)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (isViewer) {
                query = query.eq('is_published', true);
            }

            const { data, error } = await query;
            const workflows = data as any[];

            if (error) throw error;

            if (workflows && workflows.length > 0) {
                const wf = workflows[0];
                setWorkflowStatus(wf.status || (wf.is_published ? 'published' : 'draft'));
                await loadWorkflow(wf.id);
            } else {
                resetWorkflow();
            }
        } catch (err) {
            console.error('Error loading workflow:', err);
        } finally {
            setLoading(false);
            setIsInitializing(false);
            fetchInProgress.current = false;
        }
    };

    const handleSaveDraft = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            await saveWorkflow('draft', false);
            setWorkflowStatus('draft');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitForReview = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            await saveWorkflow('pending_review', false);
            setWorkflowStatus('pending_review');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            await saveWorkflow('approved', false);
            setWorkflowStatus('approved');
            showNotification('Workflow Approved! Ready for Owner to publish.', 'success');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            await saveWorkflow('published', true);
            setWorkflowStatus('published');
            showNotification('Workflow published to Viewers successfully!', 'success');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id && profile?.tenant_id)
            fetchUserWorkflow();
    }, [user?.id, profile?.tenant_id, authLoading]);

    if (loading || isInitializing || authLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-500 font-medium">Retrieving your organization's workflow...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
            {workflowId ? <header className="h-16 border-b border-gray-100 flex items-center px-8 justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <LayoutIcon size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 text-lg leading-tight">{workflowName || 'Assigned Workflow'}</h1>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${canEdit ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                <Shield size={10} />
                                {role} Mode
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-widest font-bold bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                Status: {workflowStatus.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Analyst Actions */}
                    {canEdit && (
                        <button
                            onClick={handleSaveDraft}
                            disabled={loading}
                            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition shadow-sm"
                        >
                            <LayoutIcon size={16} />
                            Save as Draft
                        </button>
                    )}
                    {canSubmit && (
                        <button
                            onClick={handleSubmitForReview}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                        >
                            <Send size={16} />
                            Submit for Review
                        </button>
                    )}

                    {/* Reviewer Actions */}
                    {isReviewer && (
                        <div className="flex items-center gap-2">
                            {canReview ? (
                                <>
                                    <button
                                        onClick={handleApprove}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-lg shadow-green-100"
                                    >
                                        <CheckCircle size={16} />
                                        Approve
                                    </button>
                                </>
                            ) : (
                                <span className="text-xs text-gray-400 font-medium italic pr-2">
                                    {workflowStatus === 'draft' ? "Waiting for submission..." : "Review Complete"}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Owner Actions */}
                    {isOwner && (
                        <div className="flex items-center gap-2">
                            {canPublish ? (
                                <button
                                    onClick={handlePublish}
                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-lg shadow-green-100"
                                >
                                    <Send size={16} />
                                    Publish
                                </button>
                            ) : (
                                <span className="text-xs text-gray-400 font-medium italic pr-2">
                                    {workflowStatus === 'published' ? "Published Live" : "Waiting for Approval..."}
                                </span>
                            )}
                        </div>
                    )}

                    <span className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <Clock size={14} />
                        {canEdit ? 'Auto-syncing' : 'Live Updated'}
                    </span>
                </div>
            </header> : null}
            <div className="flex-1 relative overflow-hidden flex">
                {!workflowId || (isViewer && workflowStatus !== 'published') ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50">
                        <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-gray-100 max-w-sm text-center transform transition-all hover:scale-[1.02]">
                            <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Shield size={40} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">No Assigned Workflow</h2>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                {isViewer ? "No published workflows available." : "No workflows found. Create one or wait for assignment."}
                            </p>
                            <button
                                onClick={() => fetchUserWorkflow()}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                Refresh Status
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 relative h-full">
                        <Canvas readOnly={!canEdit} canAddComments={canAddComments} />
                    </div>
                )}
            </div>
        </div>
    );
};
