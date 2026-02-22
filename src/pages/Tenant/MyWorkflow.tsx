import { Canvas } from '../../components/Canvas/Canvas';
import { useStore } from '../../lib/store';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Clock, Layout as LayoutIcon, Send, CheckCircle, X, Eye } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect/CustomSelect';


export const MyWorkflow = () => {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const {
        loadWorkflow,
        saveWorkflow,
        workflowName,
        workflowStatus,
        hierarchyLevel,
        resetWorkflow,
        workflowId,
        showNotification
    } = useStore();
    const [loading, setLoading] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);
    const [showReviewerModal, setShowReviewerModal] = useState(false);
    const [reviewers, setReviewers] = useState<any[]>([]);
    const [selectedReviewer, setSelectedReviewer] = useState('');
    const fetchInProgress = useRef(false);

    // Sidebar & Hierarchy States
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [allAvailableWorkflows, setAllAvailableWorkflows] = useState<any[]>([]);

    // Role Checks (Case-Insensitive)
    const role = (profile?.role || 'Viewer').toLowerCase();
    const isSuperAdmin = role === 'super admin' || role === 'super_admin';
    const isAdmin = role === 'admin' || isSuperAdmin;
    const isOwner = role === 'owner' || role === 'tenant';
    const isAnalyst = role === 'analyst';
    const isReviewer = role === 'reviewer';
    const isViewer = role === 'viewer';
    const isCreator = isAnalyst || isOwner || isAdmin;

    const [isCreating, setIsCreating] = useState(false);
    const [showNamingModal, setShowNamingModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newLevel, setNewLevel] = useState(4);

    const showHierarchySidebar = isOwner || isAdmin || isViewer || isAnalyst;


    // Permission Logic
    // Edit: Analyst (Own), Admin/Owner (All). Status: Draft, Rejected.
    const canEdit = (isAnalyst || isOwner || isAdmin) && (workflowStatus === 'Draft' || workflowStatus === 'Rejected');

    // Review: Reviewer (Assigned), Admin/Owner (All). Status: Under Review.
    const canReview = (isReviewer || isOwner || isAdmin) && workflowStatus === 'Under Review';

    // Publish: Admin/Owner (All). Status: Approved.
    const canPublish = (isOwner || isAdmin) && workflowStatus === 'Approved';

    // Comments: Admin/Owner/Reviewer/Analyst can add/view comments. Viewer cannot.
    const canAddComments = !isViewer;

    const fetchReviewers = async () => {
        if (!profile?.tenant_id) return;
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('tenant_id', profile.tenant_id)
            .eq('role', 'Reviewer');
        if (data) setReviewers(data);
    };

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

            // 1. Initial Content Load for Non-Viewers (Focus on latest or assigned)
            if (!isViewer) {
                let query = supabase
                    .from('workflows')
                    .select('id, is_published, status, hierarchy_level')
                    .eq('tenant_id', currentTenantId)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                const { data, error } = await query;
                if (error) throw error;
                const workflows = data as any[];

                if (workflows && workflows.length > 0) {
                    await loadWorkflow(workflows[0].id);
                } else {
                    resetWorkflow();
                }
            } else {
                // Viewers start clean (must select a process)
                resetWorkflow();
            }

            // 2. Fetch Hierarchy Navigator Entries (Owner, Admin, Viewer)
            if (showHierarchySidebar) {
                const userAccessLevel = (isOwner || isAdmin || isAnalyst) ? 1 : (profile?.hierarchy_level || 4);

                let sidebarQuery = supabase
                    .from('workflows')
                    .select('id, name, hierarchy_level, status, updated_at')
                    .eq('tenant_id', currentTenantId)
                    .gte('hierarchy_level', userAccessLevel)
                    .order('hierarchy_level', { ascending: true })
                    .order('name', { ascending: true });

                // Viewers ONLY see published ones in navigator
                if (isViewer) {
                    sidebarQuery = sidebarQuery.eq('status', 'Published');
                }

                // Analysts used to only see their own, but now they see all

                const { data: sidebarData, error: sidebarError } = await sidebarQuery;
                if (sidebarError) throw sidebarError;

                const allWfs = (sidebarData as any[]) || [];
                setAllAvailableWorkflows(allWfs);

                // Default Navigator highlighted level
                const topLevelWf = allWfs.find(w => w.hierarchy_level === userAccessLevel);
                if (topLevelWf) {
                    setSelectedLevel(userAccessLevel);
                } else if (allWfs.length > 0) {
                    setSelectedLevel(allWfs[0].hierarchy_level);
                } else {
                    setSelectedLevel(userAccessLevel);
                }
            }




        } catch (err) {
            console.error('Error loading workflow:', err);
        } finally {
            setLoading(false);
            setIsInitializing(false);
            fetchInProgress.current = false;
        }
    };

    const handleHierarchyChange = async (level: number) => {
        if (!workflowId) return;
        try {
            await saveWorkflow(undefined, undefined, undefined, level);
            useStore.setState({ hierarchyLevel: level });
            showNotification(`Hierarchy Level updated to L${level}`, 'success');
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveDraft = async () => {
        if (!workflowId && !isCreating) return;
        setLoading(true);
        try {
            await saveWorkflow('Draft', false);
            useStore.setState({ workflowStatus: 'Draft' });
            setIsCreating(false); // Reset creating state after success
            showNotification('Workflow saved as Draft', 'success');
            // Refresh the workflow list to see the new entry
            fetchUserWorkflow();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitForReview = async () => {
        if (!workflowId && !isCreating) return;
        setLoading(true);
        try {
            await saveWorkflow('Under Review', false, selectedReviewer);
            useStore.setState({ workflowStatus: 'Under Review' });
            setIsCreating(false);
            setShowReviewerModal(false);
            showNotification('Workflow submitted for review', 'success');
            fetchUserWorkflow();
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            await saveWorkflow('Approved', false);
            useStore.setState({ workflowStatus: 'Approved' });
            showNotification('Workflow Approved! Ready for Owner to publish.', 'success');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            await saveWorkflow('Rejected', false);
            useStore.setState({ workflowStatus: 'Rejected' });
            showNotification('Workflow Rejected. Sent back to Analyst.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!workflowId) return;
        setLoading(true);
        try {
            await saveWorkflow('Published', true);
            useStore.setState({ workflowStatus: 'Published' });
            showNotification('Workflow published to Viewers successfully!', 'success');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id && profile?.tenant_id) {
            fetchUserWorkflow();
            if (isAnalyst) fetchReviewers();
        }
    }, [user?.id, profile?.tenant_id, authLoading]);

    if (loading || isInitializing || authLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-500 font-medium">Retrieving your organization's workflow...</span>
            </div>
        );
    }

    const showCanvas = !!workflowId || (isCreating && isCreator);

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
            {showCanvas ? <header className="h-16 border-b border-gray-100 flex items-center px-8 justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <LayoutIcon size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 text-lg leading-tight">{workflowName || 'Assigned Workflow'}</h1>
                        <div className="flex items-center gap-3 mt-0.5">
                            {/* Hierarchy Level */}
                            {canEdit ? (
                                <CustomSelect
                                    value={hierarchyLevel}
                                    onChange={(val) => handleHierarchyChange(Number(val))}
                                    options={[
                                        { value: 1, label: 'L1', icon: <Eye size={12} /> },
                                        { value: 2, label: 'L2', icon: <Eye size={12} /> },
                                        { value: 3, label: 'L3', icon: <Eye size={12} /> },
                                        { value: 4, label: 'L4', icon: <Eye size={12} /> },
                                    ]}
                                    className="w-20"
                                />
                            ) : (

                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-200" title="Minimum Viewer Level">
                                    L{hierarchyLevel}
                                </span>
                            )}
                            <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${canEdit ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                <Shield size={10} />
                                {role} Mode
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md border text-white
                                ${workflowStatus === 'Published' ? 'bg-green-500 border-green-600' :
                                    workflowStatus === 'Approved' ? 'bg-emerald-500 border-emerald-600' :
                                        workflowStatus === 'Rejected' ? 'bg-red-500 border-red-600' :
                                            workflowStatus === 'Under Review' ? 'bg-orange-400 border-orange-500' :
                                                'bg-gray-400 border-gray-500'}`}>
                                {workflowStatus}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Analyst Actions */}
                    {canEdit && (
                        <>
                            <button
                                onClick={handleSaveDraft}
                                disabled={loading}
                                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition shadow-sm"
                            >
                                <LayoutIcon size={16} />
                                Save Draft
                            </button>
                            <button
                                onClick={() => setShowReviewerModal(true)}
                                disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                            >
                                <Send size={16} />
                                Submit for Review
                            </button>
                        </>
                    )}

                    {/* Reviewer Actions */}
                    {isReviewer && (
                        <div className="flex items-center gap-2">
                            {canReview ? (
                                <>
                                    <button
                                        onClick={handleReject}
                                        className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition"
                                    >
                                        <X size={16} />
                                        Reject
                                    </button>
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
                                    {workflowStatus === 'Draft' ? "Waiting for submission..." :
                                        workflowStatus === 'Approved' ? "You Approved this workflow." :
                                            workflowStatus === 'Rejected' ? "You Rejected this workflow." :
                                                "Review Complete"}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Owner/Admin Actions */}
                    {(isOwner || role === 'Admin') && (
                        <div className="flex items-center gap-2">
                            {canPublish ? (
                                <button
                                    onClick={handlePublish}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                >
                                    <Send size={16} />
                                    Publish
                                </button>
                            ) : (
                                <span className="text-xs text-gray-400 font-medium italic pr-2">
                                    {workflowStatus === 'Published' ? "Published Live" : "Waiting for Approval..."}
                                </span>
                            )}
                        </div>
                    )}

                    <span className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <Clock size={14} />
                        {canEdit ? 'Auto-syncing' : 'Read Only'}
                    </span>
                </div>
            </header> : null}

            <div className="flex-1 relative overflow-hidden flex">
                {/* Process Hierarchy Sidebar (Navigator) */}
                {showHierarchySidebar && (
                    <aside className="w-72 bg-gray-50 border-r border-gray-100 flex flex-col z-20 shadow-sm">
                        <div className="p-6 border-b border-gray-100 bg-white">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <LayoutIcon size={16} className="text-blue-600" />
                                {isAnalyst ? "Design Hub" : "Process Navigator"}
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                                {isAnalyst ? "Manager View" : `L${(isOwner || isAdmin || isAnalyst) ? 1 : (profile?.hierarchy_level || 4)} Access Cleared`}
                            </p>
                        </div>

                        {/* Level Selectors */}
                        <div className="p-4 space-y-1 bg-white/50 border-b border-gray-100">
                            {[1, 2, 3, 4].filter(l => l >= ((isOwner || isAdmin || isAnalyst) ? 1 : (profile?.hierarchy_level || 4))).map(level => {

                                const levelConfig = {
                                    1: { label: 'L1 Restricted', text: 'text-blue-700', bg: 'bg-blue-50', active: 'bg-blue-200 border-blue-300 ring-4 ring-blue-50 shadow-sm' },
                                    2: { label: 'L2 Confidential', text: 'text-green-700', bg: 'bg-green-50', active: 'bg-green-200 border-green-300 ring-4 ring-green-50 shadow-sm' },
                                    3: { label: 'L3 Internal', text: 'text-yellow-700', bg: 'bg-yellow-50', active: 'bg-yellow-200 border-yellow-300 ring-4 ring-yellow-50 shadow-sm' },
                                    4: { label: 'L4 Public', text: 'text-purple-700', bg: 'bg-purple-50', active: 'bg-purple-200 border-purple-300 ring-4 ring-purple-50 shadow-sm' }
                                }[level as 1 | 2 | 3 | 4];


                                const isLvlSelected = selectedLevel === level;
                                const count = allAvailableWorkflows.filter(w => w.hierarchy_level === level).length;

                                return (
                                    <button
                                        key={level}
                                        onClick={() => {
                                            setSelectedLevel(level);
                                            // Just switch level view, don't auto-load first process
                                            resetWorkflow();
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-transparent transition-all duration-200 group ${isLvlSelected ? levelConfig.active + ' shadow-sm' : 'hover:bg-white hover:border-gray-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${isLvlSelected ? 'bg-current pulse' : 'bg-gray-200'} ${levelConfig.text}`} />
                                            <span className={`text-xs font-bold uppercase tracking-wide ${isLvlSelected ? levelConfig.text : 'text-gray-500 group-hover:text-gray-700'}`}>
                                                {levelConfig.label}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isLvlSelected ? 'bg-white/50' : 'bg-gray-100 text-gray-400'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Process List for Level */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            <div className="px-2 mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Available Processes</span>
                                {isAnalyst && (
                                    <button
                                        onClick={() => {
                                            resetWorkflow();
                                            setNewName('');
                                            setNewLevel(selectedLevel || 4);
                                            setShowNamingModal(true);
                                        }}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                    >
                                        + New Process
                                    </button>
                                )}
                            </div>
                            {allAvailableWorkflows.filter(w => w.hierarchy_level === selectedLevel).length === 0 ? (
                                <div className="p-4 text-center">
                                    <p className="text-xs text-gray-400 italic">No processes at this level.</p>
                                </div>
                            ) : (
                                allAvailableWorkflows.filter(w => w.hierarchy_level === selectedLevel).map(wf => (
                                    <button
                                        key={wf.id}
                                        onClick={() => {
                                            setIsCreating(false);
                                            loadWorkflow(wf.id);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${workflowId === wf.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'}`}
                                    >
                                        <h4 className={`text-xs font-bold truncate ${workflowId === wf.id ? 'text-white' : 'text-gray-900'}`}>{wf.name}</h4>
                                        <div className={`flex items-center gap-2 mt-1 ${workflowId === wf.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                            <Clock size={10} />
                                            <span className="text-[10px] font-medium">{new Date(wf.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </aside>
                )}

                {!showCanvas ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50">
                        <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-gray-100 max-w-sm text-center transform transition-all hover:scale-[1.02]">
                            <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Shield size={40} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                {(isViewer || isOwner)
                                    ? (allAvailableWorkflows.filter(w => w.hierarchy_level === selectedLevel).length > 0 ? "Select a Process" : "No Process Assigned")
                                    : (isAnalyst || isAdmin) ? "Start Your Design" : "No Access"}
                            </h2>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                {(isViewer || isOwner)
                                    ? (allAvailableWorkflows.filter(w => w.hierarchy_level === selectedLevel).length > 0
                                        ? `Please select a process from the Navigator on the left to view the L${selectedLevel} diagram.`
                                        : `There are no processes assigned to the L${selectedLevel} hierarchy level yet.`)
                                    : (isAnalyst || isAdmin) ? "You haven't selected a process to edit. Select one from the navigator or start a new one." : "No workflows found. Create one or wait for assignment."}
                            </p>
                            <button
                                onClick={() => {
                                    if (isCreator) {
                                        resetWorkflow();
                                        setNewName('');
                                        setNewLevel(selectedLevel || 4);
                                        setShowNamingModal(true);
                                    } else {
                                        fetchUserWorkflow();
                                    }
                                }}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                {isCreator ? "Begin New Process" : "Refresh Status"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 relative h-full">
                        <Canvas readOnly={!canEdit} canAddComments={canAddComments} />
                    </div>
                )}
            </div>


            {/* Create Process Modal */}
            {showNamingModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Create New Process</h3>
                            <button onClick={() => setShowNamingModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">Process Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter process name..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">Hierarchy Level</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                                    value={newLevel}
                                    onChange={(e) => setNewLevel(Number(e.target.value))}
                                >
                                    <option value={1}>L1 - Restricted</option>
                                    <option value={2}>L2 - Confidential</option>
                                    <option value={3}>L3 - Internal</option>
                                    <option value={4}>L4 - Public</option>
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    if (!newName.trim()) return;
                                    useStore.setState({ workflowName: newName, hierarchyLevel: newLevel });
                                    setIsCreating(true);
                                    setShowNamingModal(false);
                                }}
                                disabled={!newName.trim()}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                            >
                                Start Designing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit for Review Modal */}
            {showReviewerModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Submit for Review</h3>
                            <button onClick={() => setShowReviewerModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">Select a Reviewer to assign this workflow to.</p>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">Assign Reviewer</label>
                            <select
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white mb-6"
                                value={selectedReviewer}
                                onChange={(e) => setSelectedReviewer(e.target.value)}
                            >
                                <option value="">Select a Reviewer...</option>
                                {reviewers.map(r => (
                                    <option key={r.id} value={r.id}>{r.full_name} ({r.role})</option>
                                ))}
                            </select>
                            <button
                                onClick={handleSubmitForReview}
                                disabled={!selectedReviewer || loading}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Submitting...' : 'Confirm Submission'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
