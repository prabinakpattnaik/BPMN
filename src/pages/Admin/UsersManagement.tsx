import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Search, Building2, Mail, Shield, X, Check, Edit2Icon } from 'lucide-react';
import { useStore } from '../../lib/store';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';

type UserProfile = {
    id: string;
    full_name: string;
    username: string;
    role: string;
    tenant_id: string;
    tenants: {
        name: string;
    } | null;
};

type Tenant = {
    id: string;
    name: string;
};

export const UsersManagement = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
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
        orgName: ''
    });
    const [orgSearch, setOrgSearch] = useState('');
    const [showOrgDropdown, setShowOrgDropdown] = useState(false);

    // For Editing
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                tenants (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
        } else {
            setUsers(data as any);
        }
        setLoading(false);
    };

    const fetchTenants = async () => {
        const { data } = await supabase.from('tenants').select('id, name');
        if (data) setTenants(data);
    };

    useEffect(() => {
        fetchUsers();
        fetchTenants();
    }, []);

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedUsers = filteredUsers.reduce((acc, user) => {
        const orgName = user.tenants?.name || 'Unknown Org';
        if (!acc[orgName]) acc[orgName] = [];
        acc[orgName].push(user);
        return acc;
    }, {} as Record<string, UserProfile[]>);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmit(true);
        try {
            // Create a temporary client that doesn't persist session to avoid logging out the admin
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            // 1. Ensure Org exists and get ID
            const { data: tenantId, error: tenantError } = await (supabase.rpc as any)('admin_create_org_link', {
                target_org_name: formData.orgName
            });

            if (tenantError) throw tenantError;

            // 2. Create Auth User using the temp client
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        role: 'tenant',
                        needs_password_reset: true
                    }
                }
            });

            if (authError) throw authError;

            // 3. Link Profile to Tenant using the regular admin client
            if (authData.user) {
                const { error: profileError } = await (supabase
                    .from('profiles') as any)
                    .update({
                        tenant_id: tenantId,
                        role: 'tenant'
                    })
                    .eq('id', authData.user.id);

                if (profileError) throw profileError;
            }

            showNotification(`User created for ${formData.orgName}. They can now sign in!`, 'success');
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: '', orgName: '' });
            fetchUsers();
            fetchTenants();
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
            // 1. Ensure Org exists and get ID
            const { data: tenantId, error: tenantError } = await (supabase.rpc as any)('admin_create_org_link', {
                target_org_name: formData.orgName
            });

            if (tenantError) throw tenantError;

            // 2. Update Profile
            const { error: profileError } = await (supabase
                .from('profiles') as any)
                .update({
                    full_name: formData.name,
                    tenant_id: tenantId
                })
                .eq('id', editingUser.id);

            if (profileError) throw profileError;

            showNotification('User profile updated successfully.', 'success');
            setEditingUser(null);
            setIsModalOpen(false);
            fetchUsers();
            fetchTenants();
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
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', confirmDeleteId);

            if (error) throw error;

            showNotification('User profile deleted successfully.', 'success');
            fetchUsers();
        } catch (err: any) {
            showNotification('Error deleting user: ' + err.message, 'error');
        } finally {
            setLoading(false);
            setConfirmDeleteId(null);
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(orgSearch.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="mb-4 flex items-center gap-4 justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage cross-organization users and administrator roles.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className='relative'>
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or organization..."
                            className="bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingUser(null);
                            setFormData({ name: '', email: '', password: '', orgName: '' });
                            setIsModalOpen(true);
                            setOrgSearch('');
                        }}
                        className="flex custm-btm items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-semibold"
                    >
                        <UserPlus size={20} />
                        Add User
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto overflow-y-visible">


                <div className="divide-y divide-gray-100">
                    {Object.entries(groupedUsers).map(([orgName, orgUsers]) => (
                        <div key={orgName} className="p-0">
                            <div className="bg-white px-6 py-3 border-y border-gray-100 flex items-center justify-between sticky top-0 z-10">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={14} className="text-gray-300" />
                                    {orgName}
                                    <span className="ml-2 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full lowercase font-medium tracking-normal">{orgUsers.length} users</span>
                                </span>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {orgUsers.map(user => (
                                    <div key={user.id} className="px-6 py-5 flex items-center justify-between hover:bg-blue-50/30 transition group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-100">
                                                {user.full_name?.substring(0, 2).toUpperCase() || <Shield size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">{user.full_name || 'Unnamed User'}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                                        <Mail size={14} />
                                                        {user.username || 'No email'}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        <Shield size={10} />
                                                        {user.role || 'Member'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setFormData({
                                                        name: user.full_name || '',
                                                        email: user.username || '',
                                                        password: '', // Don't show password on edit
                                                        orgName: user.tenants?.name || ''
                                                    });
                                                    setOrgSearch(user.tenants?.name || '');
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="Edit User"
                                            >
                                                <Edit2Icon size={20} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(user.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete User Profile"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredUsers.length === 0 && !loading && (
                        <div className="p-20 text-center">
                            <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <Search size={32} />
                            </div>
                            <h3 className="text-gray-900 font-bold">No users found</h3>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your search terms or filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Add/Edit User */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden transform transition-all flex flex-col">
                        {/* Fixed Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{editingUser ? 'Update Profile' : 'Create New Account'}</h2>
                                <p className="text-sm text-gray-500 mt-1">{editingUser ? 'Modify user details and organization.' : 'Set up a new user and assign them to an org.'}</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 hover:bg-white p-2 rounded-full transition shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Form Content */}
                        <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 space-y-5 overflow-y-auto flex-1">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={editingUser ? true : false}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-50"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                {!editingUser && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                                placeholder="john@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Initial Password</label>
                                            <input
                                                type="password"
                                                required
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-1.5 relative">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Organization</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                            placeholder="Start typing to search or create..."
                                            value={orgSearch}
                                            onChange={(e) => {
                                                setOrgSearch(e.target.value);
                                                setFormData({ ...formData, orgName: e.target.value });
                                                if (e.target.value.length > 2) {
                                                    setShowOrgDropdown(true);
                                                } else {
                                                    setShowOrgDropdown(false);
                                                }
                                            }}
                                            onFocus={() => setShowOrgDropdown(true)}
                                            onBlur={() => {
                                                // Small timeout to allow clicking the dropdown items
                                                setTimeout(() => setShowOrgDropdown(false), 200);
                                            }}
                                        />
                                        {showOrgDropdown && (orgSearch || filteredTenants.length > 0) && (
                                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2 max-h-48 overflow-y-auto">
                                                {filteredTenants.map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition flex items-center justify-between group"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setOrgSearch(t.name);
                                                            setFormData({ ...formData, orgName: t.name });
                                                            setShowOrgDropdown(false);
                                                        }}
                                                    >
                                                        <span className="font-medium text-gray-700">{t.name}</span>
                                                        <Check size={14} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                                {orgSearch && !tenants.find(t => t.name.toLowerCase() === orgSearch.toLowerCase()) && (
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 transition border-t border-gray-50 flex items-center gap-2 group"
                                                        onClick={() => {
                                                            setShowOrgDropdown(false);
                                                        }}
                                                    >
                                                        <span className="text-green-600 font-bold">New:</span>
                                                        <span className="font-medium text-gray-700 italic">"{orgSearch}"</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Footer Buttons */}
                            <div className="p-8 border-t border-gray-100 flex gap-4 bg-gray-50/30 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    // Disable if the form is currently submitting OR if validation fails
                                    disabled={formsubmit}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {formsubmit ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        editingUser ? 'Update User' : 'Create User'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleDeleteUser}
                title="Delete User Account"
                message="Are you sure you want to delete this user? This will remove their access and all associated profile data permanently. This action cannot be undone."
                confirmText="Delete User"
                type="danger"
            />
        </div>
    );
};
