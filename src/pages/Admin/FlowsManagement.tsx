import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Workflow, User as UserIcon, Building2, ExternalLink, Trash2, Check } from 'lucide-react';
import { Canvas } from '../../components/Canvas/Canvas';
import { useStore } from '../../lib/store';

type FlowData = {
    id: string;
    name: string;
    tenant_id: string;
    created_by: string;
    updated_at: string;
    profiles: {
        full_name: string;
    } | null;
    tenants: {
        name: string;
    } | null;
    nodes: any[];
    edges: any[];
};

type Tenant = { id: string; name: string };
type UserProfile = { id: string; full_name: string; tenant_id: string };

export const FlowsManagement = () => {
    const [flows, setFlows] = useState<FlowData[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal state
    const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
    const [selectedTenant, setSelectedTenant] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');
    const { nodes, edges, setNodes, setEdges, workflowName, setWorkflowName } = useStore();

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('workflows')
                .select(`
                    id,
                    name,
                    tenant_id,
                    created_by,
                    updated_at,
                    nodes,
                    edges,
                    tenants (name),
                    profiles:created_by (full_name)
                `);

            if (error) {
                console.error('Error fetching flows:', error);
                const { data: simpleData } = await supabase.from('workflows').select('*');
                if (simpleData) setFlows(simpleData as any);
            } else {
                setFlows(data as any);
            }
        } catch (err) {
            console.error('Unexpected error in fetchFlows:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        const { data } = await supabase.from('tenants').select('id, name');
        if (data) setTenants(data);
    };

    const fetchUsersForTenant = async (tenantId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, tenant_id')
            .eq('tenant_id', tenantId);
        if (data) setUsers(data);
    };

    useEffect(() => {
        fetchFlows();
        fetchTenants();
    }, []);

    useEffect(() => {
        if (selectedTenant && !editingFlowId) {
            fetchUsersForTenant(selectedTenant);
            setSelectedUser('');
        } else if (selectedTenant && editingFlowId) {
            fetchUsersForTenant(selectedTenant);
        } else {
            setUsers([]);
        }
    }, [selectedTenant, editingFlowId]);

    const handleOpenCreateFlow = () => {
        setEditingFlowId(null);
        setNodes([]);
        setEdges([]);
        setWorkflowName('');
        setSelectedTenant('');
        setSelectedUser('');
        setIsModalOpen(true);
    };

    const handleOpenEditFlow = async (flow: FlowData) => {
        setEditingFlowId(flow.id);
        setWorkflowName(flow.name);
        setSelectedTenant(flow.tenant_id);
        setSelectedUser(flow.created_by);

        // Wait for users to load for the selected tenant
        await fetchUsersForTenant(flow.tenant_id);

        // Load the nodes/edges into the store
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);

        setIsModalOpen(true);
    };

    const handlePublishFlow = async () => {
        if (!workflowName || !selectedTenant || !selectedUser) {
            alert('Please fill in all fields (Name, Org, and User)');
            return;
        }

        const payload = {
            name: workflowName,
            tenant_id: selectedTenant,
            nodes: nodes,
            edges: edges,
            created_by: selectedUser
        };

        let result;
        if (editingFlowId) {
            result = await (supabase
                .from('workflows') as any)
                .update(payload as any)
                .eq('id', editingFlowId);
        } else {
            result = await (supabase
                .from('workflows') as any)
                .insert(payload as any);
        }

        if (result.error) {
            alert('Error saving workflow: ' + result.error.message);
        } else {
            alert(editingFlowId ? 'Workflow updated successfully!' : 'Workflow created successfully!');
            setIsModalOpen(false);
            fetchFlows();
        }
    };

    const handleDeleteFlow = async (flowId: string) => {
        if (!confirm('Are you sure you want to delete this workflow? This cannot be undone.')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('workflows')
                .delete()
                .eq('id', flowId);

            if (error) throw error;

            alert('Workflow deleted successfully.');
            fetchFlows();
        } catch (err: any) {
            alert('Error deleting workflow: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Flows Management</h1>
                    <p className="text-gray-500 mt-1">Design and assign business processes to specific users and organizations.</p>
                </div>
                <button
                    onClick={handleOpenCreateFlow}
                    className="flex custm-btm items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 font-semibold"
                >
                    <Plus size={20} />
                    Create New Flow
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto overflow-y-visible">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-5">Workflow Details</th>
                            <th className="px-8 py-5">Organization</th>
                            <th className="px-8 py-5">Assigned To</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {flows.map((flow) => (
                            <tr key={flow.id} className="hover:bg-blue-50/20 transition group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white border border-gray-100 text-blue-600 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow">
                                            <Workflow size={20} />
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-900 block">{flow.name}</span>
                                            <span className="text-xs text-gray-400 mt-0.5 block italic">Last updated: {new Date(flow.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                        <Building2 size={16} className="text-gray-400" />
                                        {flow.tenants?.name || 'Global'}
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                        <UserIcon size={16} className="text-gray-400" />
                                        {flow.profiles?.full_name || 'System'}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => handleOpenEditFlow(flow)}
                                            title="Edit Flow"
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-blue-100"
                                        >
                                            <ExternalLink size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFlow(flow.id)}
                                            title="Delete Workflow"
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-red-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {flows.length === 0 && !loading && (
                    <div className="p-20 text-center">
                        <div className="bg-gray-50 h-16 w-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Workflow size={32} />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg">No Workflows Established</h3>
                        <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">Create your first business process and assign it to an organization to get started.</p>
                    </div>
                )}
            </div>

            {/* Workflow Creation/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xl z-[100] flex flex-col p-6 overflow-y-auto">
                    <div className="bg-white flex-1 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transform transition-all border border-white/50">
                        <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-20">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-xl text-white">
                                        {editingFlowId ? <Workflow size={20} /> : <Plus size={20} />}
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                        {editingFlowId ? 'EDIT FLOW' : 'DESIGN FLOW'}
                                    </h2>
                                </div>
                                <div className="h-8 w-px bg-gray-200" />
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="text"
                                        placeholder="Flow Name..."
                                        className="bg-gray-50 border border-transparent hover:border-gray-200 rounded-xl px-4 py-2 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all w-64"
                                        value={workflowName}
                                        onChange={(e) => setWorkflowName(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer text-gray-700"
                                            value={selectedTenant}
                                            onChange={(e) => setSelectedTenant(e.target.value)}
                                        >
                                            <option value="">Select Organization</option>
                                            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <select
                                            className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer text-gray-700 disabled:opacity-50"
                                            disabled={!selectedTenant}
                                            value={selectedUser}
                                            onChange={(e) => setSelectedUser(e.target.value)}
                                        >
                                            <option value="">Select Target User</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition font-bold"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handlePublishFlow}
                                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200 flex items-center gap-2"
                                >
                                    <Check size={20} />
                                    {editingFlowId ? 'Update Workflow' : 'Publish Workflow'}
                                </button>
                            </div>
                        </header>
                        <div className="flex-1 bg-gray-50 relative overflow-hidden">
                            <Canvas />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
