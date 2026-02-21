import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, Save, CheckCircle, AlertCircle, Users, Workflow as WorkflowIcon, Layout as LayoutIcon, Mail, Shield, Globe, LogOut, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';

type LayoutProps = {
    children: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
    const { t } = useTranslation();
    const location = useLocation();
    const { saveWorkflow, loadWorkflow, tenantId, notification } = useStore();
    const { user, profile, signOut, isAdmin, isOwner } = useAuth();
    const [showAccountModal, setShowAccountModal] = useState(false);

    const isEditorPage = location.pathname === '/';
    const isAppPage = isEditorPage || location.pathname === '/my-workflow';

    // Sync Tenant and Load Workflow
    useEffect(() => {
        const initWorkflow = async () => {
            if (!user) return;

            // 1. Get Tenant ID from Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            // Cast profile to avoid 'never' type issue if inference fails
            const tenantIdFromProfile = (profile as { tenant_id: string | null } | null)?.tenant_id;

            if (tenantIdFromProfile) {
                // Set tenant in store
                useStore.setState({ tenantId: tenantIdFromProfile });

                // Try to find an existing workflow
                const { data: workflows } = await supabase
                    .from('workflows')
                    .select('id')
                    .eq('tenant_id', tenantIdFromProfile)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                const existingWorkflows = workflows as any[];

                if (existingWorkflows && existingWorkflows.length > 0) {
                    await loadWorkflow(existingWorkflows[0].id);
                }
            }
        };

        if (user && !tenantId) {
            initWorkflow();
        }
    }, [user, tenantId, loadWorkflow]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-gray-900">
            <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center gap-3 flex-shrink-0 z-30 shadow-sm">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Layers size={24} />
                </div>

                <div className="flex flex-col">
                    <span className="text-lg text-blue-600 font-bold uppercase tracking-wider">{t('app_name')}</span>
                </div>
                {isOwner && (
                    <nav className="ml-8 flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                        <Link
                            to="/dashboard"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/dashboard'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Layers size={16} />
                            Dashboard
                        </Link>
                        <Link
                            to="/owner/users"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/owner/users'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Users size={16} />
                            Users
                        </Link>
                        <Link
                            to="/my-workflow"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/my-workflow'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <WorkflowIcon size={16} />
                            Workflows
                        </Link>
                    </nav>
                )}

                {isAdmin && (
                    <nav className="ml-8 flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                        <Link
                            to="/admin/dashboard"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/admin/dashboard'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutIcon size={16} />
                            Dashboard
                        </Link>
                        <Link
                            to="/admin/users"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/admin/users'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Users size={16} />
                            Users
                        </Link>
                        <Link
                            to="/admin/flows"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/admin/flows'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <WorkflowIcon size={16} />
                            Flows
                        </Link>
                    </nav>
                )}

                <div className="ml-auto flex items-center gap-4">
                    {isEditorPage && (
                        <>
                            <button
                                onClick={() => useStore.getState().resetWorkflow()}
                                className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition font-medium"
                            >
                                + {t('new_workflow')}
                            </button>
                            <button
                                onClick={() => saveWorkflow()}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                            >
                                <Save size={18} />
                                <span className="font-medium">{t('save_workflow')}</span>
                            </button>
                        </>
                    )}

                    <div className="h-6 w-px bg-gray-200 mx-2" />

                    <LanguageSwitcher />

                    <div className="h-6 w-px bg-gray-200 mx-2" />

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAccountModal(true)}
                            className="flex items-center gap-3 p-1.5 hover:bg-gray-50 rounded-xl transition-all group border border-transparent hover:border-gray-100"
                        >
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-sm font-bold text-gray-900 leading-none">
                                    {profile?.full_name || user?.email?.split('@')[0]}
                                </span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                    {profile?.role || 'User'}
                                </span>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm group-hover:shadow-md transition-all">
                                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Account Details Modal */}
            <AnimatePresence>
                {showAccountModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAccountModal(false)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100"
                        >
                            <div className="p-8 pb-4 relative">
                                <button
                                    onClick={() => setShowAccountModal(false)}
                                    className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                <div className="flex flex-col items-center">
                                    <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-100 mb-6">
                                        {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">{profile?.full_name || 'Organization User'}</h3>
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-2 px-3 py-1 bg-blue-50 rounded-full">
                                        {profile?.role} Role
                                    </span>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 group">
                                        <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</span>
                                            <span className="text-sm font-medium text-gray-700">{user?.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 group">
                                        <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                            <Shield size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Type</span>
                                            <span className="text-sm font-medium text-gray-700">{profile?.role} Access</span>
                                        </div>
                                    </div>

                                    {tenantId && (
                                        <div className="flex items-center gap-4 group">
                                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                                <Globe size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization ID</span>
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">{tenantId}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            setShowAccountModal(false);
                                            signOut();
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all group"
                                    >
                                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                                        Sign Out Account
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className={`flex-1 relative ${isAppPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {isAppPage ? (
                    children
                ) : (
                    <div className="flex flex-col min-h-full">
                        <div className="flex-1">
                            {children}
                        </div>

                        {/* Footer Section - Premium & Clean */}
                        <footer className="w-full bg-white border-t border-gray-100 py-6 px-10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4 mt-auto">
                            <div className="flex items-center gap-6">
                                <span className="font-semibold text-gray-400">© 2026 {t('app_name')}</span>
                                <div className="flex items-center gap-4 border-l border-gray-200 pl-4">
                                    <a href="#" className="hover:text-blue-600 transition">Support</a>
                                    <a href="#" className="hover:text-blue-600 transition">Privacy</a>
                                    <a href="#" className="hover:text-blue-600 transition">Terms</a>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-medium tracking-tight">System Operational</span>
                            </div>
                        </footer>
                    </div>
                )}

                {/* Notification Toast - Shared across all pages */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: -50, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: -20, x: '-50%' }}
                            className={`absolute top-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-[100] border ${notification.type === 'success'
                                ? 'bg-green-50 text-green-800 border-green-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                                }`}
                        >
                            {notification.type === 'success' ? (
                                <CheckCircle size={20} className="text-green-600" />
                            ) : (
                                <AlertCircle size={20} className="text-red-600" />
                            )}
                            <span className="font-medium">{notification.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};
