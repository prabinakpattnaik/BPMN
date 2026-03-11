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
    d: string;
    variant?: 'positive' | 'negative' | string;
}

const SVGProcessDynamic = () => {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [edges, setEdges] = useState<EdgeData[]>([]);
    const [coords, setCoords] = useState({ x: 0, y: 0, show: false, px: 0, py: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProcessData = async () => {
            try {
                // In a real application, you'd filter by client_id and process_id
                // e.g. .eq('client_id', 800).eq('l4_process_id', 4000001)
                const { data: shapesData, error: shapesError } = await supabase
                    .from('sp_shapes')
                    .select('*');

                const { data: textsData, error: textsError } = await supabase
                    .from('sp_texts')
                    .select('*');

                const { data: arrowsData, error: arrowsError } = await supabase
                    .from('sp_arrows')
                    .select('*');

                if (shapesError) console.error("Error fetching shapes:", shapesError);
                if (textsError) console.error("Error fetching texts:", textsError);
                if (arrowsError) console.error("Error fetching arrows:", arrowsError);

                if (shapesData && textsData && arrowsData) {
                    // Map the retrieved data into our node format
                    const mappedNodes: NodeData[] = shapesData.map((shape: SpShape) => {
                        const matchingText: SpText | undefined = textsData.find((t: SpText) => t.sh_no === shape.sh_no);

                        // Collect icons into an array, ignoring nulls
                        const icons = [
                            shape.icon_url,
                            shape.icon_opt,
                            shape.icon_br,
                            shape.icon_rpa,
                            shape.icon_acct,
                            shape.icon_help
                        ].filter(Boolean) as string[];

                        const subLabels = [
                            matchingText?.inside_line2,
                            matchingText?.inside_line3
                        ].filter(Boolean) as string[];

                        return {
                            id: `node-${shape.sh_no}`,
                            type: shape.shape_type === 'GWIX_1' ? 'ix' : shape.shape_type, // Normalize your specific shape types
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

                    // Map the retrieved arrows into our edge format
                    const mappedEdges: EdgeData[] = arrowsData.map((arrow: SpArrow) => {
                        // Concatenate the Path commands. The user DB specifies them individually.
                        // E.g.: "M<X> <Y> <Direction> <Head>"
                        const d = `M${arrow.x} ${arrow.y} ${arrow.arrow_direction1} ${arrow.arrow_head}`;

                        // Logic to detect positive/negative path from your DB columns
                        // (You can use top_text, bottom_text, or status_text depending on your data)
                        const text = `${arrow.top_text || ''} ${arrow.bottom_text || ''} ${arrow.status_text || ''}`.toLowerCase();
                        let variant = 'default';

                        if (text.includes('positive') || text.includes('yes') || text.includes('approve')) {
                            variant = 'positive';
                        } else if (text.includes('negative') || text.includes('no') || text.includes('reject')) {
                            variant = 'negative';
                        }

                        return {
                            id: `edge-${arrow.arrow_no}`,
                            d: d,
                            variant: variant
                        };
                    });

                    setNodes(mappedNodes);
                    setEdges(mappedEdges);
                    console.log(mappedEdges, "------mapped edges")
                }
            } catch (err) {
                console.error("Failed to load process data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProcessData();
    }, []);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        setCoords({ x, y, show: true, px: e.clientX, py: e.clientY });
    };

    const renderIcons = (icons: string[] | undefined) => {
        if (!icons) return null;

        let rightBarIdx = 0;
        let bottomIdx = 0;

        return icons.map((icon, idx) => {
            let iconX = 0;
            let iconY = 0;
            let width = 15;
            let height = 15;

            // Logic to position icons correctly
            if (['URL_2', 'BATCH_2', 'ROBO_2', 'AACT_2'].includes(icon)) {
                iconX = 105;
                iconY = rightBarIdx * 20;
                rightBarIdx++;
            } else if (icon === 'SOPTM' || icon === 'OPTM') {
                iconX = 1;
                iconY = 0;
                width = 4;
                height = 20;
            } else if (icon === 'HELP_2') {
                iconX = bottomIdx * 15;
                iconY = 54;
                bottomIdx++;
                width = 15;
                height = 18;
            }

            return (
                <use
                    key={`${icon}-${idx}`}
                    href={`#${icon}`}
                    x={iconX}
                    y={iconY}
                    width={width}
                    height={height}
                    className={icon}
                />
            );
        });
    };

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-slate-50 flex items-center justify-center overflow-auto p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden relative"
            >
                <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1 text-xs font-mono text-slate-500 shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live Data Simulation
                </div>

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
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                        </pattern>

                        <symbol id="HELP_2" viewBox="0 0 24 24">
                            <rect x="4" y="4" width="16" height="16" fill="#1e40af" stroke="white" strokeWidth="1.5" rx="8" />
                            <text x="9" y="16" fontSize="12" fontFamily="sans-serif" fill="white" fontWeight="bold">?</text>
                        </symbol>

                        <symbol id="EVNT_1" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" stroke="#ef4444" strokeWidth="2" fill="#fee2e2" r="22" />
                            <text x="11" y="30" className="text-xs font-bold fill-red-800" style={{ fontSize: '10px' }}>STOP</text>
                        </symbol>

                        <symbol id="SVNT_1" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" stroke="#22c55e" strokeWidth="2" fill="#dcfce7" r="22" />
                            <text x="8" y="30" className="text-xs font-semibold fill-green-800" style={{ fontSize: '9px' }}>START</text>
                        </symbol>

                        <symbol id="TASK_2" viewBox="0 0 120 64">
                            <rect x="0" y="0" rx="4" width="120" height="64" strokeWidth="1.5" />
                            <rect x="105" y="0" rx="0" fill="black" opacity="0.05" width="15" height="64" />
                        </symbol>

                        <symbol id="ex" viewBox="0 0 100 100">
                            <polygon points="50,8 92,50 50,92 8,50" fill="white" stroke="currentColor" strokeWidth="4" />
                            <path d="M38 38 L62 62 M62 38 L38 62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </symbol>

                        <symbol id="ix" viewBox="0 0 100 100">
                            <polygon points="50,8 92,50 50,92 8,50" fill="white" stroke="#64748b" strokeWidth="2" />
                            <circle cx="50" cy="50" r="12" fill="none" stroke="#64748b" strokeWidth="2" />
                        </symbol>

                        <symbol id="OPTM" viewBox="0 0 2 20">
                            <path d="m0 3 v20" stroke="#22c55e" strokeWidth="4" />
                        </symbol>

                        <symbol id="SOPTM" viewBox="0 0 2 20">
                            <path d="m0 3 v20" stroke="#ef4444" strokeWidth="4" />
                        </symbol>

                        <symbol id="URL_2" viewBox="0 0 24 24">
                            <path d="M14 4 H21 V10 H19 V6.41 L10.41 15 L9 13.59 L17.59 5 H14 Z M5 4 H11 V7 H7 V17 H17 V13 H19 V19 H5 Z" fill="#64748b" />
                        </symbol>

                        <symbol id="BATCH_2" viewBox="0 0 24 24">
                            <rect x="2" y="2" width="20" height="20" rx="2" fill="#e2e8f0" stroke="#64748b" />
                            <path d="M7 8h10M7 12h10M7 16h5" stroke="#64748b" strokeWidth="2" />
                        </symbol>

                        <symbol id="ROBO_2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="8" fill="#e2e8f0" stroke="#64748b" />
                            <circle cx="9" cy="10" r="1" fill="#64748b" />
                            <circle cx="15" cy="10" r="1" fill="#64748b" />
                            <path d="M9 15c1 1 2 1 3 1s2 0 3-1" stroke="#64748b" strokeLinecap="round" />
                        </symbol>

                        <symbol id="AACT_2" viewBox="0 0 24 24">
                            <rect x="2" y="4" width="20" height="16" rx="2" fill="#e2e8f0" stroke="#64748b" />
                            <circle cx="12" cy="12" r="4" fill="none" stroke="#64748b" strokeWidth="2" />
                        </symbol>
                    </defs>

                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Edges */}
                    <g>
                        {edges.map(edge => {
                            let strokeColor = "stroke-slate-400";
                            let hoverColor = "hover:stroke-blue-500";

                            // Apply Green/Red coloring for Positive/Negative paths
                            if (edge.variant === 'positive') {
                                strokeColor = "stroke-green-500";
                                hoverColor = "hover:stroke-green-600";
                            } else if (edge.variant === 'negative') {
                                strokeColor = "stroke-red-500";
                                hoverColor = "hover:stroke-red-600";
                            }

                            return (
                                <path
                                    key={edge.id}
                                    d={edge.d}
                                    className={`${strokeColor} fill-none transition-all duration-300 ${hoverColor} hover:stroke-[2px]`}
                                    strokeWidth="1.5"
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
                                    width={node.type === 'TASK_2' ? 120 : (node.type === 'ix' || node.type === 'ex' ? 50 : 50)}
                                    height={node.type === 'TASK_2' ? 64 : 50}
                                    style={{
                                        fill: node.variant?.includes('AUTO') ? '#f0fdf4' : node.variant === 'MANL' ? '#fff1f2' : 'white',
                                        stroke: node.variant?.includes('AUTO') ? '#22c55e' : node.variant === 'MANL' ? '#f43f5e' : '#64748b'
                                    }}
                                    className="transition-all duration-200 group-hover:filter group-hover:drop-shadow-md"
                                />

                                {node.type === 'TASK_2' && (
                                    <>
                                        {renderIcons(node.icons)}
                                        <text x="10" y="0" className="select-none pointer-events-none">
                                            {node.topText && (
                                                <tspan className="fill-slate-400 text-[10px]" x="10" dy="-.5em">{node.topText}</tspan>
                                            )}
                                            {node.label && (
                                                <tspan className="fill-slate-800 font-medium text-[11px]" x="10" dy="2.2em">{node.label}</tspan>
                                            )}
                                            {(node.subLabels || []).map((sub, i) => (
                                                <tspan key={i} className="fill-slate-600 text-[10px]" x="10" dy="1.2em">{sub}</tspan>
                                            ))}
                                            {node.bottomText && (
                                                <tspan className="fill-slate-400 text-[10px]" x="10" dy="3.0em">{node.bottomText}</tspan>
                                            )}
                                        </text>
                                    </>
                                )}

                                {(node.type === 'ix' || node.type === 'ex') && node.label && (
                                    <text x="0" y="65" className="select-none pointer-events-none">
                                        <tspan className="fill-slate-700 font-medium text-[10px]" x="0" textAnchor="middle" dx="25">{node.label}</tspan>
                                        {(node.subLabels || []).map((sub, i) => (
                                            <tspan key={i} className="fill-slate-500 text-[9px]" x="0" textAnchor="middle" dx="25" dy="1.2em">{sub}</tspan>
                                        ))}
                                    </text>
                                )}
                            </g>
                        ))}
                    </g>
                </svg>

                {/* Hover Coordinates Tooltip */}
                {coords.show && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            position: 'fixed',
                            left: coords.px + 15,
                            top: coords.py + 15,
                            pointerEvents: 'none',
                        }}
                        className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 font-mono"
                    >
                        X: {coords.x} Y: {coords.y}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default SVGProcessDynamic;
