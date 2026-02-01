import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ResetPassword = () => {
    const { t } = useTranslation();
    const { signOut } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError(t('passwords_dont_match'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: resetError } = await supabase.auth.updateUser({
                password: password,
                data: { needs_password_reset: false }
            });

            if (resetError) throw resetError;

            // Mark success and sign out to force fresh login
            setSuccess(true);
            await signOut();

            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
                    <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('password_updated')}</h2>
                    <p className="text-gray-500">{t('password_updated_success_msg')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-2xl font-bold text-gray-900">{t('reset_password')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('force_reset_msg')}</p>
                </div>

                <form onSubmit={handleReset} className="p-8 space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center gap-3 animate-shake">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 ml-1">{t('new_password')}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 ml-1">{t('confirm_new_password')}</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Lock size={18} />
                                    {t('update_password')}
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => signOut()}
                            className="w-full py-3 text-gray-500 font-bold hover:bg-gray-50 transition rounded-xl"
                        >
                            {t('cancel_and_sign_out')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// CheckPlane is missing in lucide-react, I used CheckCircle instead but I will use Check.
// Actually let's use CheckCircle.
