import { create } from 'zustand';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
} from 'reactflow';
import { supabase } from './supabase';
import { INITIAL_BPMN_XML } from './bpmn-constants';

type WorkflowState = {
    nodes: Node[];
    edges: Edge[];
    selectedNode: Node | null;
    workflowId: string | null;
    tenantId: string | null;
    workflowName: string;
    workflowStatus: string;
    hierarchyLevel: number;
    bpmnXml: string | null;

    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    setSelectedNode: (node: Node | null) => void;
    updateNodeData: (id: string, data: any) => void;
    setWorkflowName: (name: string) => void; // Setter for name

    saveWorkflow: (status?: string, isPublished?: boolean, reviewerId?: string, hierarchyLevel?: number) => Promise<void>;
    loadWorkflow: (id: string) => Promise<void>;
    resetWorkflow: () => void;
    deleteNode: (id: string) => void;
    deleteEdge: (id: string) => void;

    notification: { message: string; type: 'success' | 'error' } | null;
    showNotification: (message: string, type: 'success' | 'error') => void;
};

export const useStore = create<WorkflowState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    workflowId: null,
    tenantId: null,
    workflowName: 'Untitled Workflow',
    workflowStatus: 'Draft',
    hierarchyLevel: 4,
    bpmnXml: null,
    notification: null,

    onNodesChange: (changes: NodeChange[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection: Connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
    },
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setSelectedNode: (node) => set({ selectedNode: node }),
    setWorkflowName: (name) => set({ workflowName: name }),

    updateNodeData: (id, data) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            }),
            // Also update selectedNode if it's the one being modified to keep UI in sync
            selectedNode: get().selectedNode?.id === id
                ? { ...get().selectedNode!, data: { ...get().selectedNode!.data, ...data } }
                : get().selectedNode
        });
    },

    saveWorkflow: async (status?: string, isPublished?: boolean, reviewerId?: string, hierarchyLevel?: number) => {
        let { workflowId, nodes, edges, tenantId, workflowName } = get();

        // Self-healing: If tenantId is missing, try to fetch it and role
        let userRole = '';
        if (!tenantId) {
            console.warn("Tenant ID or Role missing in store, attempting to fetch...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tenant_id, role')
                    .eq('id', user.id)
                    .single();

                const p = profile as any;
                tenantId = p?.tenant_id;
                userRole = (p?.role || '').toLowerCase();

                if (tenantId) {
                    set({ tenantId });
                }
            }
        }

        const isSuperAdmin = userRole === 'super admin' || userRole === 'super_admin';

        if (!tenantId && !isSuperAdmin) {
            console.error("Cannot save: No tenant ID found.");
            get().showNotification("Cannot save: User is not linked to any organization/tenant.", 'error');
            return;
        }

        const payload: any = {
            name: workflowName,
            nodes: nodes,
            edges: edges,
            updated_at: new Date().toISOString(),
            is_published: isPublished ?? false
        };

        if (tenantId) {
            payload.tenant_id = tenantId;
        }

        if (status) {
            payload.status = status;
        }

        if (reviewerId) {
            payload.reviewer_id = reviewerId;
        }

        if (hierarchyLevel) {
            payload.hierarchy_level = hierarchyLevel;
        }

        const { bpmnXml } = get();
        const xmlToSave = bpmnXml || INITIAL_BPMN_XML;

        if (xmlToSave) {
            payload.bpmn_xml = xmlToSave;
        }

        console.log("Saving workflow payload:", {
            id: workflowId,
            name: payload.name,
            xmlLength: payload.bpmn_xml?.length,
            tenantId: payload.tenant_id
        });

        try {
            if (workflowId) {
                // UPDATE existing workflow
                const { data, error } = await (supabase
                    .from('workflows') as any)
                    .update(payload)
                    .eq('id', workflowId)
                    .select();

                if (error) throw error;
                console.log("Workflow updated successfully:", data);
                get().showNotification("Workflow saved successfully", 'success');
            } else {
                // INSERT new workflow
                const { data, error } = await (supabase
                    .from('workflows') as any)
                    .insert({
                        ...payload,
                        created_by: (await supabase.auth.getUser()).data.user?.id
                    })
                    .select()
                    .single();

                if (data) {
                    set({ workflowId: data.id });
                }

                if (error) throw error;
            }
        } catch (err: any) {
            console.error("Error saving workflow:", err.message);
            get().showNotification(err.message || "Failed to save workflow", 'error');
        }
    },

    loadWorkflow: async (id: string) => {
        // Prevent re-loading the exact same workflow if already in memory
        if (get().workflowId === id && get().nodes.length > 0) return;

        const { data, error } = await (supabase
            .from('workflows') as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error loading workflow:', error);
            return;
        }

        const workflow = data;

        if (workflow) {
            // Map legacy or DB status to UI status
            let status = workflow.status;
            if (!['Draft', 'Under Review', 'Approved', 'Published', 'Rejected'].includes(status)) {
                if (workflow.is_published) status = 'Published';
                else if (status === 'pending_review') status = 'Under Review';
                else if (status === 'approved') status = 'Approved';
                else status = 'Draft';
            }

            set({
                workflowId: workflow.id,
                tenantId: workflow.tenant_id,
                workflowName: workflow.name,
                workflowStatus: status,
                hierarchyLevel: workflow.hierarchy_level || 4,
                bpmnXml: workflow.bpmn_xml || null,
                nodes: (workflow.nodes as any) || [],
                edges: (workflow.edges as any) || [],
            });
        }
    },

    resetWorkflow: () => {
        set({
            workflowId: null,
            // tenantId: null,
            workflowName: 'Untitled Workflow',
            workflowStatus: 'Draft',
            hierarchyLevel: 4,
            bpmnXml: null,
            nodes: [],
            edges: [],
            selectedNode: null
        });
    },

    deleteNode: (id) => {
        set({
            nodes: get().nodes.filter((node) => node.id !== id),
            edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
            selectedNode: get().selectedNode?.id === id ? null : get().selectedNode
        });
    },

    deleteEdge: (id) => {
        set({
            edges: get().edges.filter((edge) => edge.id !== id)
        });
    },

    showNotification: (message, type) => {
        set({ notification: { message, type } });
        setTimeout(() => {
            if (get().notification?.message === message) {
                set({ notification: null });
            }
        }, 3000);
    }
}));
