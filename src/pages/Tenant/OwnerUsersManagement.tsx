import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Search, Mail, Shield, X, Edit2Icon, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../lib/store';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';

type UserProfile = {
    id: string;
    full_name: string;
    username: string;
    role: string;
    tenant_id: string;
};

export const OwnerUsersManagement = () => {
    const { profile } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [formsubmit, setFormSubmit] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { showNotification } = useStore();

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Viewer'
    });

    // For Editing
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchUsers = async () => {
        if (!profile?.tenant_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            showNotification('Error loading users', 'error');
        } else {
            setUsers(data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, [profile?.tenant_id]);

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmit(true);
        try {
            // Create a temporary client that doesn't persist session to avoid logging out the owner
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            // 1. Create Auth User using the temp client
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        role: formData.role,
                        tenant_id: profile?.tenant_id // Store in metadata too
                    }
                }
            });

            if (authError) throw authError;

            // 2. Link Profile to Tenant using Owner RPC
            if (authData.user) {
                const { error: rpcError } = await supabase.rpc('owner_update_profile', {
                    target_user_id: authData.user.id,
                    new_full_name: formData.name,
                    new_role: formData.role
                });

                if (rpcError) throw rpcError;
            }

            showNotification(`User ${formData.name} created successfully!`, 'success');
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: '', role: 'Viewer' });
            fetchUsers();
        } catch (err: any) {
            showNotification('Error creating user: ' + err.message, 'error');
        } finally {
            setFormSubmit(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setFormSubmit(true);

        try {
            // Update Profile via RPC
            const { error: rpcError } = await supabase.rpc('owner_update_profile', {
                target_user_id: editingUser.id,
                new_full_name: formData.name,
                new_role: formData.role
            });

            if (rpcError) throw rpcError;

            showNotification('User updated successfully.', 'success');
            setEditingUser(null);
            setIsModalOpen(false);
            fetchUsers();
        } catch (err: any) {
            showNotification('Error updating user: ' + err.message, 'error');
        } finally {
            setFormSubmit(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!confirmDeleteId) return;

        setLoading(true);
        try {
            const { error } = await supabase.rpc('owner_delete_user', {
                target_user_id: confirmDeleteId
            });

            if (error) throw error;

            showNotification('User deleted successfully.', 'success');
            fetchUsers();
        } catch (err: any) {
            showNotification('Error deleting user: ' + err.message, 'error');
        } finally {
            setLoading(false);
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto w-full min-h-screen bg-gray-50">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Organization Users</h1>
                    <p className="text-gray-500 mt-1">Manage team members and their roles.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className='relative'>
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm w-64 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingUser(null);
                            setFormData({ name: '', email: '', password: '', role: 'Viewer' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-semibold"
                    >
                        <UserPlus size={20} />
                        Add Member
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    <div className="bg-gray-50/50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Team Members ({filteredUsers.length})
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                                <Search className="text-gray-300" size={24} />
                            </div>
                            <p>No users found matching your search.</p>
                        </div>
                    ) : (
                        filteredUsers.map(user => (
                            <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                                        {user.full_name?.substring(0, 2).toUpperCase() || <Shield size={16} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">{user.full_name || 'Unnamed User'}</h3>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Mail size={12} />
                                                {user.username || 'No email'}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border ${user.role === 'Owner' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                    user.role === 'Analyst' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        user.role === 'Reviewer' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                            'bg-gray-50 text-gray-600 border-gray-100'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => {
                                            setEditingUser(user);
                                            setFormData({
                                                name: user.full_name || '',
                                                email: user.username || '',
                                                password: '',
                                                role: user.role || 'Viewer'
                                            });
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        title="Edit Role"
                                    >
                                        <Edit2Icon size={18} />
                                    </button>

                                    {/* Prevent deleting own account broadly, though backend also checks */}
                                    {user.id !== profile?.id && (
                                        <button
                                            onClick={() => setConfirmDeleteId(user.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Remove User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal for Add/Edit User */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{editingUser ? 'Update Member' : 'Add Team Member'}</h2>
                                <p className="text-xs text-gray-500 mt-1">Manage access for your organization.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {!editingUser && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                            placeholder="john@company.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Password</label>
                                        <input
                                            type="password"
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                >
                                    <option value="Analyst">Analyst</option>
                                    <option value="Reviewer">Reviewer</option>
                                    <option value="Viewer">Viewer</option>
                                    <option value="Owner">Owner</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={formsubmit}
                                className="w-full mt-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {formsubmit && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {editingUser ? 'Update Member' : 'Add Member'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleDeleteUser}
                title="Remove Member"
                message="Are you sure you want to remove this user from your organization? They will no longer have access."
                confirmText="Remove User"
                type="danger"
            />
        </div>
    );
};
