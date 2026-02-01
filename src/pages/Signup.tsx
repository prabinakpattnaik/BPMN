import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layers, ArrowRight, Workflow, Zap, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const Signup = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Sign up user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (authError || !authData.user) {
            setError(authError?.message || 'Signup failed');
            setLoading(false);
            return;
        }

        try {
            // 2. Create Tenant & Link Profile via RPC (Atomic & Secure)
            const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const uniqueSlug = `${slug}-${Math.floor(Math.random() * 10000)}`;

            const { error: rpcError } = await (supabase.rpc as any)('create_tenant_and_link_profile', {
                org_name: orgName,
                org_slug: uniqueSlug,
                user_full_name: fullName
            });

            if (rpcError) throw rpcError;

            // Success (RPC handles profile update)
            navigate('/');

        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to complete registration setup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Left Side - BPM Showcase */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-white mb-8">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                            <Layers size={32} />
                        </div>
                        <span className="text-2xl font-bold">{t('app_name')}</span>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                        {t('start_journey')}
                    </h1>
                    <p className="text-md text-blue-100 mb-8 max-w-lg">
                        {t('start_journey_desc')}
                    </p>

                    {/* Feature Cards */}
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

                {/* Footer */}
                <div className="relative z-10 text-blue-100 text-sm flex justify-between items-center">
                    <span>© 2026 {t('app_name')}. All rights reserved.</span>

                </div>
            </div>

            {/* Right Side - Signup Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
                <div className="w-full max-w-md py-8">
                    {/* Mobile Logo */}
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
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('signup_title')}</h2>
                            <p className="text-gray-600">
                                {t('already_have_account')}{' '}
                                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                    {t('sign_in')}
                                </Link>
                            </p>
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <LanguageSwitcher />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSignup}>
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('full_name')}
                                </label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('org_name')}
                                </label>
                                <input
                                    id="orgName"
                                    name="orgName"
                                    type="text"
                                    required
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Acme Corp"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('email')}
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('password')}
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? t('creating_account') : t('create_account')}
                                {!loading && <ArrowRight size={16} />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
