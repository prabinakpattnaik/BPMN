import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, Save, CheckCircle, AlertCircle, Users, Workflow as WorkflowIcon } from 'lucide-react';
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
    const { user, signOut, isAdmin, isOwner } = useAuth();

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
                        <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-medium text-xs" title={user?.email}>
                            {user?.email?.substring(0, 2).toUpperCase()}
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                            {t('sign_out')}
                        </button>
                    </div>
                </div>
            </header>

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
