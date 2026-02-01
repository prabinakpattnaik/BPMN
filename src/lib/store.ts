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

type WorkflowState = {
    nodes: Node[];
    edges: Edge[];
    selectedNode: Node | null;
    workflowId: string | null;
    tenantId: string | null;
    workflowName: string; // Add workflow name state

    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    setSelectedNode: (node: Node | null) => void;
    updateNodeData: (id: string, data: any) => void;
    setWorkflowName: (name: string) => void; // Setter for name

    saveWorkflow: () => Promise<void>;
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

    saveWorkflow: async () => {
        let { workflowId, nodes, edges, tenantId, workflowName } = get();

        // Self-healing: If tenantId is missing, try to fetch it
        if (!tenantId) {
            console.warn("Tenant ID missing in store, attempting to fetch...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tenant_id')
                    .eq('id', user.id)
                    .single();

                tenantId = (profile as any)?.tenant_id;
                if (tenantId) {
                    set({ tenantId }); // Update store
                    console.log("Tenant ID recovered:", tenantId);
                }
            }
        }

        if (!tenantId) {
            console.error("Cannot save: No tenant ID found.");
            get().showNotification("Cannot save: User is not linked to any organization/tenant.", 'error');
            return;
        }

        const payload = {
            name: workflowName,
            nodes: nodes as any,
            edges: edges as any,
            updated_at: new Date().toISOString(),
            tenant_id: tenantId,
            is_published: true // auto-publish for now
        };

        try {
            if (workflowId) {
                // UPDATE existing workflow
                const { error } = await (supabase
                    .from('workflows') as any)
                    .update(payload)
                    .eq('id', workflowId);

                if (error) throw error;
                console.log("Workflow updated successfully");
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

                if (error) throw error;

                if (data) {
                    set({ workflowId: data.id });
                    console.log("Workflow created successfully with ID:", data.id);
                    get().showNotification("New workflow created successfully", 'success');
                }
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
            set({
                workflowId: workflow.id,
                tenantId: workflow.tenant_id,
                workflowName: workflow.name, // Load name
                nodes: (workflow.nodes as any) || [],
                edges: (workflow.edges as any) || [],
            });
        }
    },

    resetWorkflow: () => {
        set({
            workflowId: null,
            tenantId: null,
            workflowName: 'Untitled Workflow',
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
