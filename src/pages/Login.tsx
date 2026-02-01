import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layers, ArrowRight, Workflow, Zap, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const Login = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'password' | 'otp' | 'verify_otp' | 'mfa'>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { signInWithGoogle, signInWithMicrosoft } = useAuth();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // STEP 1: Verify Password
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // STEP 2: Check for standard MFA (TOTP) first
            if (data.session) {
                const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors();
                if (!mfaError && factors && factors.totp.length > 0) {
                    setMode('mfa');
                    setLoading(false);
                    return;
                }
            }

            // STEP 3: If no TOTP, trigger mandatory Email OTP
            const { error: otpError } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                }
            });

            if (otpError) throw otpError;

            // Move to OTP verification mode
            setMode('verify_otp');
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Verification for Email OTP (Login Code)
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email'
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        // Success - Navigate to dashboard
        navigate('/');
    };

    const handleVerifyMFA = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: factorsData, error: mfaError } = await supabase.auth.mfa.listFactors();
            if (mfaError || !factorsData) throw mfaError || new Error('No MFA factors found');

            const factor = factorsData.totp[0];
            if (!factor) throw new Error('No TOTP factor found');

            const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId: factor.id,
                challengeId: challenge.data.id,
                code: otp,
            });

            if (verify.error) throw verify.error;
            navigate('/');
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
        }
    };

    const handleMicrosoftSignIn = async () => {
        setError(null);
        try {
            await signInWithMicrosoft();
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Microsoft');
        }
    };

    return (
        <div className="h-screen flex overflow-hidden" >
            {/* Left Side - BPM Showcase */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-white mb-8">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                            <Layers size={32} />
                        </div>
                        <span className="text-2xl font-bold">{t('app_name')}</span>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                        {t('streamline')}
                    </h1>
                    <p className="text-xl text-blue-100 mb-8 max-w-lg">
                        {t('streamline_desc')}
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Workflow size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">{t('visual_designer')}</h3>
                                <p className="text-blue-100 text-sm">{t('visual_designer_desc')}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <Zap size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">{t('collaboration')}</h3>
                                <p className="text-blue-100 text-sm">{t('collaboration_desc')}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="p-2 bg-pink-500 rounded-lg">
                                <Users size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">{t('security')}</h3>
                                <p className="text-blue-100 text-sm">{t('security_desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-blue-100 text-sm flex justify-between items-center">
                    <span>© 2026 {t('app_name')}. All rights reserved.</span>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
                <div className="w-full max-w-md py-8">
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg text-white">
                                <Layers size={28} />
                            </div>
                            <span className="text-xl font-bold text-gray-900">{t('app_name')}</span>
                        </div>
                    </div>

                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                {mode === 'mfa' ? t('mfa_required') : t('login_welcome')}
                            </h2>
                            <p className="text-gray-600">
                                {mode === 'mfa' ? t('mfa_desc') : t('sign_in_to_your_account')}
                            </p>
                        </div>
                        <div className="p-2">
                            <LanguageSwitcher />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 transform transition-all duration-300">
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                <Zap size={16} />
                                {error}
                            </div>
                        )}

                        {mode === 'password' ? (
                            <>
                                <div className="flex gap-3 mb-6">
                                    <button
                                        onClick={handleGoogleSignIn}
                                        type="button"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-bold"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Google
                                    </button>
                                    <button
                                        onClick={handleMicrosoftSignIn}
                                        type="button"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-bold"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 23 23">
                                            <path fill="#f35325" d="M1 1h10v10H1z" />
                                            <path fill="#81bc06" d="M12 1h10v10H12z" />
                                            <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                            <path fill="#ffba08" d="M12 12h10v10H12z" />
                                        </svg>
                                        Microsoft
                                    </button>
                                </div>

                                <div className="mb-6 relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-3 bg-white text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('or_continue_with')}</span>
                                    </div>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('email')}</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                            placeholder="you@email.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-gray-700">{t('password')}</label>
                                            <Link to="/forgot-password" virtual-link-id="forgot-password" className="text-xs font-bold text-blue-600 hover:underline">
                                                {t('forgot_password_link')}
                                            </Link>
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {loading ? t('signing_in') : t('sign_in')}
                                        {!loading && <ArrowRight size={18} />}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <form onSubmit={mode === 'mfa' ? handleVerifyMFA : handleVerifyOTP} className="space-y-6">
                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">{t('enter_otp')}</h3>
                                    {mode === 'verify_otp' && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            {t('otp_sent_to', { email })}
                                        </p>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    maxLength={6}
                                    autoFocus
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    placeholder="000000"
                                />

                                <div className="flex flex-col gap-3">
                                    <button
                                        type="submit"
                                        disabled={loading || otp.length < 6}
                                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {loading ? t('verifying_otp') : t('verify_and_login')}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setMode('password'); setOtp(''); }}
                                        className="w-full py-2 text-sm text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition-all"
                                    >
                                        {t('back_to_login')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
