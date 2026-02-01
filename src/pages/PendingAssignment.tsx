import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, LogOut, Building2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PendingAssignment = () => {
    const { user, profile, signOut, refreshProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [checking, setChecking] = useState(false);

    // Auto-redirect if profile becomes valid
    useEffect(() => {
        if (profile?.tenant_id) {
            navigate('/');
        }
    }, [profile, navigate]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleCheckStatus = async () => {
        setChecking(true);
        await refreshProfile();

        // Short delay to show the "checking" state for better UX
        setTimeout(() => {
            setChecking(false);
            if (profile?.tenant_id) {
                navigate('/');
            }
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 border border-gray-100 overflow-hidden transform transition-all hover:scale-[1.01]">
                    {/* Header with Icon */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-10 flex flex-col items-center gap-4">
                        <div className="h-20 w-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center text-white ring-4 ring-white/10">
                            {checking || authLoading ? (
                                <div className="h-10 w-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Building2 size={40} />
                            )}
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-white leading-tight">
                                {checking ? t('checking_status', 'Verifying...') : t('pending_assignment_title', 'Account Pending')}
                            </h1>
                            <p className="text-blue-100 text-sm mt-1 opacity-90">
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-10 space-y-8">
                        <div className="space-y-4 text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                                <Shield size={12} />
                                {t('assignment_status', 'Action Required')}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                {t('not_linked_to_org', 'Organization Link Required')}
                            </h2>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {t('pending_assignment_msg', 'Your account is not yet linked to an organization. Please contact your administrator to assign you to a tenant.')}
                            </p>
                        </div>

                        {/* Info Boxes */}
                        <div className="grid gap-3">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-colors hover:bg-blue-50/50">
                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm transition-transform group-hover:scale-110">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('contact_admin', 'Support Contact')}</p>
                                    <p className="text-sm font-semibold text-gray-700">admin@bpmtool.com</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                onClick={handleCheckStatus}
                                disabled={checking || authLoading}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {checking ? t('checking', 'Checking...') : t('refresh_status', 'Check Status')}
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="w-full py-4 bg-white text-gray-600 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} />
                                {t('sign_out')}
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50/50 px-10 py-4 border-t border-gray-100 flex justify-center italic">
                        <p className="text-[10px] text-gray-400 font-medium">
                            © 2026 BPMTool. Secure Onboarding Protocol.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
