import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Layout as LayoutIcon, Eye, Search, ArrowLeft, X } from 'lucide-react';
import SVGProcessDynamic from '../SVGProcessDynamic';

export const MyWorkflow = () => {
    const { profile, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);

    // For rendering the SVG
    const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Role Checks (Case-Insensitive)
    const role = (profile?.role || 'Guest').toLowerCase();
    const isSuperAdmin = role === 'super admin' || role === 'super_admin';
    const isAdmin = role === 'admin' || isSuperAdmin;
    const isOwner = role === 'owner' || role === 'tenant';
    const isAnalyst = role === 'analyst';

    const userAccessLevel = (isOwner || isAdmin || isAnalyst) ? 0 : (profile?.hierarchy_level ?? 4);

    useEffect(() => {
        if (!authLoading && profile && selectedLevel === null) {
            setSelectedLevel(userAccessLevel);
        }
    }, [authLoading, profile, selectedLevel, userAccessLevel]);

    const fetchLevelData = async (level: number) => {
        setLoading(true);
        setSelectedProcessId(null);
        setSelectedClientId(null);
        try {
            const tableName = `l${level}_process`;
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('client_id', profile?.tenant_id || "")
                .order(`l${level}_process_id`, { ascending: true });

            if (error) throw error;
            setTableData(data || []);
        } catch (err) {
            console.error(`Error fetching L${level} data:`, err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedLevel !== null) {
            fetchLevelData(selectedLevel);
        }
    }, [selectedLevel]);

    if (authLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-500 font-medium">Authenticating...</span>
            </div>
        );
    }

    const renderTable = () => {
        if (loading) return <div className="p-12 text-center text-gray-500">Loading process database...</div>;
        if (tableData.length === 0) return <div className="p-12 text-center text-gray-500 font-medium">No processes found for this level.</div>;

        if (selectedLevel === 4) {
            return (
                <div className="overflow-x-auto w-full h-full custom-scrollbar">
                    <table className="w-full text-left text-sm text-gray-600 border-collapse">
                        <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 text-xs shadow-sm">
                            <tr>
                                <th className="p-4 border-b">L4 Process ID</th>
                                <th className="p-4 border-b">Description</th>
                                <th className="p-4 border-b">L3 Process</th>
                                <th className="p-4 border-b">L2 Process</th>
                                <th className="p-4 border-b">Business Owner</th>
                                <th className="p-4 border-b">IT Owner</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tableData.map(row => (
                                <tr key={row.l4_process_id}
                                    onClick={() => {
                                        setSelectedProcessId(row.l4_process_id);
                                        setSelectedClientId(row.client_id);
                                    }}
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                                    <td className="p-4 font-bold text-blue-600 group-hover:underline flex items-center gap-2">
                                        <Eye size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                        {row.l4_process_id}
                                    </td>
                                    <td className="p-4 text-gray-900 font-medium">{row.l4_description}</td>
                                    <td className="p-4">{row.l3_description || `[ID: ${row.l3_process_id}]`}</td>
                                    <td className="p-4">{row.l2_description || `[ID: ${row.l2_process_id}]`}</td>
                                    <td className="p-4 font-medium">{row.business_owner_role}</td>
                                    <td className="p-4 font-medium">{row.it_owner_role}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // Generic table for L0-L3
        const idKey = `l${selectedLevel}_process_id`;
        return (
            <div className="overflow-x-auto w-full h-full custom-scrollbar">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                    <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 text-xs uppercase tracking-wider shadow-sm">
                        <tr>
                            <th className="p-4 border-b">Process ID</th>
                            <th className="p-4 border-b">Description / English Text</th>
                            <th className="p-4 border-b">Client ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tableData.map(row => (
                            <tr key={row[idKey]} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-bold text-gray-900">{row[idKey]}</td>
                                <td className="p-4 text-gray-800 font-medium">{row.text_in_english || row.description || 'N/A'}</td>
                                <td className="p-4">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                                        Client: {row.client_id}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">

            <div className="flex-1 relative overflow-hidden flex">
                {/* Process Hierarchy Sidebar (Navigator) */}
                <aside className="w-72 bg-gray-50 border-r border-gray-100 flex flex-col z-20 shadow-sm flex-shrink-0">
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <LayoutIcon size={16} className="text-blue-600" />
                            Access Levels
                        </h2>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                            L{userAccessLevel} Clearance Given
                        </p>
                    </div>

                    <div className="p-4 space-y-1 bg-white/50 border-b border-gray-100 flex-1">
                        {[0, 1, 2, 3, 4].filter(l => l >= userAccessLevel).map(level => {
                            const levelConfig = {
                                0: { label: 'L0 Enterprise', text: 'text-gray-700', bg: 'bg-gray-50', active: 'bg-gray-200 border-gray-300 ring-4 ring-gray-50 shadow-sm' },
                                1: { label: 'L1 Restricted', text: 'text-blue-700', bg: 'bg-blue-50', active: 'bg-blue-200 border-blue-300 ring-4 ring-blue-50 shadow-sm' },
                                2: { label: 'L2 Confidential', text: 'text-green-700', bg: 'bg-green-50', active: 'bg-green-200 border-green-300 ring-4 ring-green-50 shadow-sm' },
                                3: { label: 'L3 Internal', text: 'text-yellow-700', bg: 'bg-yellow-50', active: 'bg-yellow-200 border-yellow-300 ring-4 ring-yellow-50 shadow-sm' },
                                4: { label: 'L4 Public', text: 'text-purple-700', bg: 'bg-purple-50', active: 'bg-purple-200 border-purple-300 ring-4 ring-purple-50 shadow-sm' }
                            }[level as 0 | 1 | 2 | 3 | 4];

                            const isLvlSelected = selectedLevel === level;

                            return (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border border-transparent transition-all duration-200 group ${isLvlSelected && !selectedProcessId ? levelConfig.active + ' shadow-sm' : 'hover:bg-white hover:border-gray-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-2 w-2 rounded-full ${isLvlSelected && !selectedProcessId ? 'bg-current pulse' : 'bg-gray-300'} ${levelConfig.text}`} />
                                        <span className={`text-sm font-bold tracking-wide ${isLvlSelected && !selectedProcessId ? levelConfig.text : 'text-gray-500 group-hover:text-gray-700'}`}>
                                            {levelConfig.label}
                                        </span>
                                    </div>
                                    <Eye size={14} className={isLvlSelected && !selectedProcessId ? levelConfig.text : 'text-gray-300'} />
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 bg-white relative flex flex-col overflow-hidden">
                    <div className="p-8 h-full flex flex-col bg-slate-50">
                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">L{selectedLevel} Process Database</h2>
                                <p className="text-gray-500 mt-1">Found {tableData.length} records in Database.</p>
                            </div>
                            {selectedLevel === 4 && tableData.length > 0 && (
                                <div className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg font-bold border border-blue-100 flex items-center gap-2 shadow-sm animate-pulse-slow">
                                    <Search size={16} /> Select a process row below to open its dynamic diagram.
                                </div>
                            )}
                        </div>

                        <div className="flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm relative flex flex-col overflow-hidden">
                            {renderTable()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Screen Dialog for SVG Process */}
            {selectedProcessId && selectedClientId && (
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-h-full flex flex-col overflow-hidden">
                        {/* Dialog Header */}
                        <div className="h-16 px-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedProcessId(null)}
                                    className="text-sm font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white transition flex items-center gap-2 shadow-sm bg-gray-50"
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                                <div className="h-6 border-r border-gray-300"></div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 leading-tight">
                                        Dynamic Process Flow
                                    </h2>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">
                                        Process ID: {selectedProcessId}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedProcessId(null)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Dialog Content */}
                        <div className="flex-1 overflow-auto bg-slate-50 relative flex">
                            <SVGProcessDynamic processId={selectedProcessId} clientId={selectedClientId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
