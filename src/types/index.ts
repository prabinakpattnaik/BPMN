import type { Edge, Node } from "reactflow";

export type Tenant = {
    id: string;
    created_at: string;
    name: string;
    slug: string;
    subscription_plan: string;
};

export type Profile = {
    id: string;
    created_at: string;
    username: string | null;
    full_name: string | null;
    tenant_id: string | null;
    role: UserRole;
    hierarchy_level?: number;
};

export type Workflow = {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    is_published: boolean;
    created_by: string;
    description: string | null;
    status: 'Draft' | 'Under Review' | 'Approved' | 'Published' | 'Rejected';
    hierarchy_level: 1 | 2 | 3 | 4;
    nodes: Node[];
    edges: Edge[];
    tenant_id: string;
    reviewer_id?: string;
};

export type UserRole = 'Owner' | 'Admin' | 'Analyst' | 'Reviewer' | 'Viewer' | 'admin' | 'tenant';

export const HIERARCHY_LEVELS = {
    L1: 1,
    L2: 2,
    L3: 3,
    L4: 4
} as const;

export type Comment = {
    id: string;
    workflow_id: string;
    node_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user_name?: string;
    user?: {
        full_name: string;
        role?: string;
    };
};

export type Database = {
    public: {
        Tables: {
            tenants: {
                Row: Tenant;
                Insert: Omit<Tenant, "id" | "created_at">;
                Update: Partial<Omit<Tenant, "id" | "created_at">>;
            };
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, "created_at">;
                Update: Partial<Omit<Profile, "created_at">>;
            };
            workflows: {
                Row: Workflow;
                Insert: Omit<Workflow, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<Workflow, "id" | "created_at" | "updated_at">>;
            };
        };
    };
};
