import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Data types aligned with the Supabase schema
interface SpShape {
    sh_no: number;
    shape_type: string;
    variant: string | null;
    x: number;
    y: number;
    icon_opt: string | null;
    icon_url: string | null;
    icon_br: string | null;
    icon_rpa: string | null;
    icon_help: string | null;
    icon_acct: string | null;
    icon1_link: string | null;
}

interface SpText {
    sh_no: number;
    inside_line1: string | null;
    inside_line2: string | null;
    inside_line3: string | null;
    top_text: string | null;
    bottom_text1: string | null;
}

interface SpArrow {
    arrow_no: number;
    x: number;
    y: number;
    arrow_direction1: string;
    arrow_head: string;
    top_text?: string | null;
    bottom_text?: string | null;
    status_text?: string | null;
}

interface GroupFlow {
    flowId: number;
    text: string;
    type: 'Group1' | 'Group2';
}

interface GroupArrowLink {
    flowId: number;
    arrowId: number;
}

// Resulting component structure
interface NodeData {
    id: string;
    type: string;
    variant?: string;
    x: number;
    y: number;
    label?: string;
    subLabels?: string[];
    topText?: string;
    bottomText?: string;
    icons?: string[];
    link?: string;
}

interface EdgeData {
    id: string;
    arrowNo: number;
    d: string;
    variant?: 'positive' | 'negative' | string;
}

interface SVGProcessDynamicProps {
    clientId?: string;
    processId?: number;
}

const SVGProcessDynamic = ({ clientId = '175d4f53-8530-4517-86d0-64f844305551', processId = 40001 }: SVGProcessDynamicProps) => {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [edges, setEdges] = useState<EdgeData[]>([]);
    const [grop, setGrop] = useState<GroupFlow[]>([]);
    const [graw, setGraw] = useState<GroupArrowLink[]>([]);
    const [coords, setCoords] = useState({ x: 0, y: 0, show: false, px: 0, py: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);

    useEffect(() => {
        const fetchProcessData = async () => {
            try {
                // Fetch basic process data
                const { data: shapesData, error: shapesError } = await supabase
                    .from('sp_shapes')
                    .select('*')
                    .eq('l4_process_id', processId);

                const { data: textsData, error: textsError } = await supabase
                    .from('sp_texts')
                    .select('*')
                    .eq('l4_process_id', processId);

                const { data: arrowsData, error: arrowsError } = await supabase
                    .from('sp_arrows')
                    .select('*')
                    .eq('l4_process_id', processId);

                // Fetch grouping data
                const { data: gropData, error: gropError } = await supabase
                    .from('sp_grop')
                    .select('*')
                    .eq('client_id', clientId)
                    .eq('l4_process_id', processId);

                const { data: grawData, error: grawError } = await supabase
                    .from('sp_graw')
                    .select('*')
                    .eq('client_id', clientId)
                    .eq('l4_process_id', processId);

                if (shapesError) console.error("Error fetching shapes:", shapesError);
                if (textsError) console.error("Error fetching texts:", textsError);
                if (arrowsError) console.error("Error fetching arrows:", arrowsError);
                if (gropError) console.error("Error fetching grop:", gropError);
                if (grawError) console.error("Error fetching graw:", grawError);

                if (shapesData && textsData && arrowsData) {
                    const mappedNodes: NodeData[] = shapesData.map((shape: SpShape) => {
                        const matchingText: SpText | undefined | any = textsData.find((t: SpText) => t.sh_no === shape.sh_no);
                        const icons = [
                            shape.icon_url,
                            shape.icon_opt,
                            shape.icon_br,
                            shape.icon_rpa,
                            shape.icon_help,
                            shape.icon_acct
                        ].filter(Boolean) as string[];

                        const subLabels = [
                            matchingText?.inside_line2,
                            matchingText?.inside_line3
                        ].filter(Boolean) as string[];

                        return {
                            id: `node-${shape.sh_no}`,
                            type: shape.shape_type === 'GWIX_1' ? 'ix' : shape.shape_type,
                            variant: shape.variant || undefined,
                            x: shape.x,
                            y: shape.y,
                            label: matchingText?.inside_line1 || undefined,
                            subLabels: subLabels.length > 0 ? subLabels : undefined,
                            topText: matchingText?.top_text || undefined,
                            bottomText: matchingText?.bottom_text1 || undefined,
                            icons: icons.length > 0 ? icons : undefined,
                            link: shape.icon1_link || undefined
                        };
                    });

                    const mappedEdges: EdgeData[] = arrowsData.map((arrow: SpArrow) => {
                        const d = `M${arrow.x} ${arrow.y} ${arrow.arrow_direction1} ${arrow.arrow_head}`;
                        // @ts-ignore
                        const text = `${arrow.top_text || ''} ${arrow.bottom_text || ''} ${arrow.status_text || ''}`.toLowerCase();
                        let variant = 'default';

                        // if (text.includes('positive') || text.includes('yes') || text.includes('approve')) {
                        //     variant = 'positive';
                        // } else if (text.includes('negative') || text.includes('no') || text.includes('reject')) {
                        //     variant = 'negative';
                        // }

                        return {
                            id: `edge-${arrow.arrow_no}`,
                            arrowNo: arrow.arrow_no,
                            d: d,
                            variant: variant
                        };
                    });

                    setNodes(mappedNodes);
                    setEdges(mappedEdges);
                }

                if (gropData) {
                    setGrop(gropData.map((g: any) => ({
                        flowId: g.flow_id,
                        text: g.text,
                        type: g.type
                    })));
                }

                if (grawData) {
                    setGraw(grawData.map((g: any) => ({
                        flowId: g.flow_id,
                        arrowId: g.arrow_id
                    })));
                }

            } catch (err) {
                console.error("Failed to load process data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProcessData();
    }, [processId, clientId]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        setCoords({ x, y, show: true, px: e.clientX, py: e.clientY });
    };

    const renderIcons = (icons: string[] | undefined, link: string | undefined) => {
        if (!icons) return null;
        let rightBarIdx = 0;
        let bottomIdx = 0;

        // Ensure bottom row icons are sorted: HELP_1, HELP_2, then AACT_1, MACT_1 ($ icons)
        const sortedIcons = [...icons].sort((a, b) => {
            const order = ['HELP_1', 'HELP_2', 'AACT_1', 'MACT_1'];
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        });

        return sortedIcons.map((icon, idx) => {
            let iconX = 0;
            let iconY = 0;
            let width = 15;
            let height = 15;
            let URLLink = "";

            if (['URL_2', 'URL_1', 'BATCH_2', 'ROBO_2', 'AACT_2'].includes(icon)) {
                iconX = 105;
                iconY = rightBarIdx * 20;
                URLLink = link || "";
                rightBarIdx++;
            } else if (icon === 'SOPTM' || icon === 'OPTM') {
                iconX = 1;
                iconY = 0;
                width = 4;
                height = 20;
            } else if (['HELP_2', 'HELP_1', 'AACT_1', 'MACT_1'].includes(icon)) {
                iconX = bottomIdx * 15;
                iconY = 54;
                bottomIdx++;
                width = 15;
                height = 18;
            }

            const useElement = (
                <use key={`${icon}-${idx}`} href={`#${icon}`} x={iconX} y={iconY} width={width} height={height} className={icon} />
            );

            if ((icon === 'URL_2' || icon === 'URL_1') && URLLink) {
                const formattedLink = URLLink.startsWith('http://') || URLLink.startsWith('https://')
                    ? URLLink
                    : `https://${URLLink}`;
                console.log("formattedLink--->", formattedLink)
                return (
                    <a key={`${icon}-${idx}`} href={formattedLink} target="_blank" rel="noopener noreferrer" style={{ cursor: 'pointer' }}>
                        {/* Invisible solid hit area to make the entire 15x15 icon box clickable */}
                        <rect x={iconX} y={iconY} width={width} height={height} fill="transparent" pointerEvents="all" />
                        {useElement}
                    </a>
                );
            }

            return useElement;
        });
    };

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    const selectedFlow = grop.find((f: GroupFlow) => f.flowId === selectedFlowId);
    const highlightedArrowIds = selectedFlowId
        ? graw.filter((a: GroupArrowLink) => a.flowId === selectedFlowId).map((a: GroupArrowLink) => a.arrowId)
        : [];

    return (
        <div className="flex w-full h-screen bg-[#f8fafc] overflow-hidden">
            {/* Left Sidebar - Groups */}
            <div className="w-60 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        Flow Groups
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">Select a flow to highlight the path</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Group 1 - Positive */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
                            Group 1 (Positive)
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        </h3>
                        <div className="space-y-1">
                            {grop.filter((f: GroupFlow) => f.type === 'Group1').map((flow: GroupFlow) => (
                                <button
                                    key={flow.flowId}
                                    onClick={() => setSelectedFlowId(selectedFlowId === flow.flowId ? null : flow.flowId)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200 group flex items-center justify-between ${selectedFlowId === flow.flowId
                                        ? 'bg-green-50 text-green-700 font-medium border border-green-100 ring-1 ring-green-100'
                                        : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                                        }`}
                                >
                                    <span>{flow.text}</span>
                                    <span className="text-[10px] opacity-40 group-hover:opacity-100">#{flow.flowId}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Group 2 - Negative */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
                            Group 2 (Negative)
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        </h3>
                        <div className="space-y-1">
                            {grop.filter((f: GroupFlow) => f.type === 'Group2').map((flow: GroupFlow) => (
                                <button
                                    key={flow.flowId}
                                    onClick={() => setSelectedFlowId(selectedFlowId === flow.flowId ? null : flow.flowId)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200 group flex items-center justify-between ${selectedFlowId === flow.flowId
                                        ? 'bg-red-50 text-red-700 font-medium border border-red-100 ring-1 ring-red-100'
                                        : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                                        }`}
                                >
                                    <span>{flow.text}</span>
                                    <span className="text-[10px] opacity-40 group-hover:opacity-100">#{flow.flowId}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-[10px] text-slate-400">
                    Client ID: {clientId.slice(0, 8)}...
                </div>
            </div>

            {/* Main SVG Area */}
            <div className="flex-1 relative overflow-auto bg-slate-50/50">
                <div className="min-w-full min-h-full flex items-center justify-center ">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative"
                        style={{ minWidth: '1200px', minHeight: '800px', marginLeft: "120px" }}
                    >
                        {selectedFlow && (
                            <div className={`absolute top-6 right-6 z-10 px-4 py-1.5 rounded-full text-[10px] font-bold border shadow-sm transition-all duration-300 ${selectedFlow.type === 'Group1' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                ACTIVE FLOW: {selectedFlow.text} ({selectedFlow.type})
                            </div>
                        )}

                        <svg
                            id="mySvg"
                            width="1200"
                            height="800"
                            viewBox="0 0 1200 800"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setCoords(prev => ({ ...prev, show: false }))}
                            className="cursor-crosshair"
                        >
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f8fafc" strokeWidth="1" />
                                </pattern>
                                <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <circle cx="1" cy="1" r="0.5" fill="#e2e8f0" />
                                </pattern>

                                {/* Icons and Symbols */}
                                <symbol id="HELP_2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" strokeWidth="1" />
                                    <text x="12" y="16" fontSize="12" fontFamily="Inter, sans-serif" fill="white" fontWeight="900" textAnchor="middle">?</text>
                                </symbol>

                                <symbol id="HELP_1" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" fill="darkblue" stroke="white" strokeWidth={1.5} rx="8px" />
                                    <text x="9" y="16" fontSize={12} fontFamily="sans-serif" stroke="white" strokeWidth={0.5}>? </text>
                                </symbol>

                                <symbol id="AACT_1" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" fill="HONEYDEW" stroke="HONEYDEW" strokeWidth={1.5} rx="8px" />
                                    <text x="9" y="16" fontSize={12} fontFamily="sans-serif" stroke="none" strokeWidth={0.5}>$ </text>
                                </symbol>

                                <symbol id="MACT_1" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" fill="Orange" stroke="Orange" strokeWidth={1.5} rx="8px" />
                                    <text x="9" y="16" fontSize={12} fontFamily="sans-serif" stroke="none" strokeWidth={0.5}>$ </text>
                                </symbol>

                                <symbol id="EVNT_1" viewBox="0 0 50 50">
                                    <circle cx="25" cy="25" stroke="#ef4444" strokeWidth="2.5" fill="#fee2e2" r="22" />
                                    <text x="25" y="30" className="text-[10px] font-black fill-red-800" textAnchor="middle">END</text>
                                </symbol>

                                <symbol id="SVNT_1" viewBox="0 0 50 50">
                                    <circle cx="25" cy="25" stroke="#22c55e" strokeWidth="2.5" fill="#dcfce7" r="22" />
                                    <text x="25" y="30" className="text-[10px] font-black fill-green-800" textAnchor="middle">START</text>
                                </symbol>

                                <symbol id="TASK_2" viewBox="0 0 120 64">
                                    <rect x="0" y="0" rx="8" width="120" height="64" />
                                    <rect x="105" y="0" rx="0" fill="black" opacity="0.03" width="15" height="64" />
                                </symbol>

                                <symbol id="ex" viewBox="0 0 100 100">
                                    <polygon points="50,8 92,50 50,92 8,50" fill="white" stroke="currentColor" strokeWidth="4" />
                                    <path d="M38 38 L62 62 M62 38 L38 62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </symbol>

                                <symbol id="ix" viewBox="0 0 100 100">
                                    <polygon points="50,8 92,50 50,92 8,50" fill="white" stroke="#94a3b8" strokeWidth="2" />
                                    <circle cx="50" cy="50" r="12" fill="none" stroke="#94a3b8" strokeWidth="2" />
                                </symbol>

                                <symbol id="URL_2" viewBox="0 0 24 24">
                                    <path d="M14 4 H21 V10 H19 V6.41 L10.41 15 L9 13.59 L17.59 5 H14 Z M5 4 H11 V7 H7 V17 H17 V13 H19 V19 H5 Z" fill="#64748b" />
                                </symbol>

                                <symbol id="URL_1" viewBox="0 0 24 24">
                                    <path d="M14 4 H21 V10 H19 V6.41 L10.41 15 L9 13.59 L17.59 5 H14 Z M5 4 H11 V7 H7 V17 H17 V13 H19 V19 H5 Z" fill="#64748b" />
                                </symbol>

                                <symbol id="OPTM" viewBox="0 0 2 20">
                                    <path d="m0 3 v20" stroke="#22c55e" strokeWidth="4" />
                                </symbol>

                                <symbol id="SOPTM" viewBox="0 0 2 20">
                                    <path d="m0 3 v20" stroke="#ef4444" strokeWidth="4" />
                                </symbol>

                                <symbol id="BATCH_2" viewBox="0 0 24 24">
                                    <rect x="2" y="2" width="20" height="20" rx="2" fill="#e2e8f0" stroke="#64748b" />
                                    <path d="M7 8h10M7 12h10M7 16h5" stroke="#64748b" strokeWidth="2" />
                                </symbol>

                                <symbol id="ROBO_2" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z" fill="#64748b" />
                                </symbol>

                                <symbol id="AACT_2" viewBox="0 0 24 24">
                                    <rect x="2" y="4" width="20" height="16" rx="2" fill="#e2e8f0" stroke="#64748b" />
                                    <circle cx="12" cy="12" r="4" fill="none" stroke="#64748b" strokeWidth="2" />
                                </symbol>
                            </defs>

                            <rect width="100%" height="100%" fill="url(#dotGrid)" />

                            {/* Edges */}
                            <g>
                                <style>{`
                                    @keyframes flowLine {
                                        to {
                                            stroke-dashoffset: -20;
                                        }
                                    }
                                    .flow-active {
                                        stroke-dasharray: 8, 4;
                                        animation: flowLine 1s linear infinite;
                                    }
                                `}</style>
                                {edges.map(edge => {
                                    const isHighlighted = highlightedArrowIds.includes(edge.arrowNo);
                                    let strokeColor = "stroke-slate-300";
                                    let strokeWidth = "1.5";
                                    let extraClass = "";

                                    if (selectedFlowId) {
                                        if (isHighlighted) {
                                            strokeColor = selectedFlow?.type === 'Group1' ? "stroke-green-500" : "stroke-red-500";
                                            strokeWidth = "2.5";
                                            extraClass = "flow-active";
                                        } else {
                                            strokeColor = "stroke-slate-200";
                                            strokeWidth = "1";
                                        }
                                    } else {
                                        if (edge.variant === 'positive') strokeColor = "stroke-green-400";
                                        else if (edge.variant === 'negative') strokeColor = "stroke-red-400";
                                    }

                                    return (
                                        <path
                                            key={edge.id}
                                            d={edge.d}
                                            className={`${strokeColor} ${extraClass} fill-none transition-all duration-500`}
                                            strokeWidth={strokeWidth}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    );
                                })}
                            </g>

                            {/* Nodes */}
                            <g>
                                {nodes.map(node => (
                                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="group cursor-pointer">
                                        <use
                                            href={`#${node.type}`}
                                            width={node.type === 'TASK_2' ? 120 : 50}
                                            height={node.type === 'TASK_2' ? 64 : 50}
                                            style={node.type !== "EVNT_1" && node.type !== "SVNT_1" ? {
                                                fill: node.variant?.includes('AUTO') ? '#f0fdf4' : node.variant === 'MANL' ? '#fff1f2' : 'white',
                                                stroke: node.variant?.includes('AUTO') ? '#22c55e' : node.variant === 'MANL' ? '#f43f5e' : '#cbd5e1'
                                            } : {}}
                                            className="transition-all duration-300 group-hover:filter group-hover:drop-shadow-lg"
                                        />

                                        {node.type === 'TASK_2' && (
                                            <>
                                                {renderIcons(node.icons, node.link)}
                                                <text x="10" y="0" className="select-none pointer-events-none">
                                                    {node.topText && (
                                                        <tspan className="fill-slate-400 text-[9px] font-semibold" x="10" dy="-.6em">{node.topText}</tspan>
                                                    )}
                                                    {node.label && (
                                                        <tspan className="fill-slate-800 font-bold text-[11px]" x="10" dy="2.2em">{node.label}</tspan>
                                                    )}
                                                    {(node.subLabels || []).map((sub, i) => (
                                                        <tspan key={i} className="fill-slate-500 text-[10px]" x="10" dy="1.3em">{sub}</tspan>
                                                    ))}
                                                    {node.bottomText && (
                                                        <tspan className="fill-slate-400 text-[10px]" x="10" dy="3.2em">{node.bottomText}</tspan>
                                                    )}
                                                </text>
                                            </>
                                        )}

                                        {(node.type === 'ix' || node.type === 'ex') && node.label && (
                                            <text x="25" y="70" className="select-none pointer-events-none" textAnchor="middle">
                                                <tspan className="fill-slate-700 font-bold text-[10px]">{node.label}</tspan>
                                                {(node.subLabels || []).map((sub, i) => (
                                                    <tspan key={i} className="fill-slate-500 text-[9px]" x="25" dy="1.2em">{sub}</tspan>
                                                ))}
                                            </text>
                                        )}
                                    </g>
                                ))}
                            </g>
                        </svg>

                        {/* Coordinates - Premium Style */}
                        {coords.show && (
                            <div
                                style={{
                                    position: 'fixed',
                                    left: coords.px + 20,
                                    top: coords.py + 20,
                                    pointerEvents: 'none',
                                }}
                                className="bg-slate-900/90 backdrop-blur-sm text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xl z-50 font-mono border border-white/10 flex gap-3"
                            >
                                <span className="opacity-50">X</span> {coords.x}
                                <span className="opacity-50 ml-1">Y</span> {coords.y}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default SVGProcessDynamic;
