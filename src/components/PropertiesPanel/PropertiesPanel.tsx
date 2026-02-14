import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CommentsPanel } from '../CommentsPanel/CommentsPanel';

const tabs = ["Properties", "Comments"];

export const PropertiesPanel = ({ canAddComments = false, readOnly = false }: { canAddComments?: boolean, readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { selectedNode, setSelectedNode, updateNodeData, deleteNode, workflowId } = useStore();
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [activeTab, setActiveTab] = useState('Properties');

    const handleDelete = () => {
        if (selectedNode && !readOnly) {
            deleteNode(selectedNode.id);
        }
    };

    // Sync local state when selected node changes
    useEffect(() => {
        if (selectedNode) {
            setLabel(selectedNode.data.label || '');
            setDescription(selectedNode.data.description || '');
        }
    }, [selectedNode]);

    const handleLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        const newLabel = e.target.value;
        setLabel(newLabel);
        if (selectedNode) {
            updateNodeData(selectedNode.id, { label: newLabel });
        }
    };

    const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (readOnly) return;
        const newDesc = e.target.value;
        setDescription(newDesc);
        if (selectedNode) {
            updateNodeData(selectedNode.id, { description: newDesc });
        }
    };

    return (
        <AnimatePresence>
            {selectedNode && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedNode(null)}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl z-50 border-l border-gray-200 flex flex-col"
                    >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative px-4 py-2 text-sm font-medium outline-none transition-colors ${activeTab === tab ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {/* This is the magic element */}
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                                        />
                                    )}
                                    <span className="relative z-10">{tab}</span>
                                </button>

                            ))}
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {activeTab === "Properties" && <>
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">{t('label')}</label>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={handleLabelChange}
                                        readOnly={readOnly}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${readOnly ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                                        placeholder={t('placeholder_label')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">{t('description')}</label>
                                    <textarea
                                        value={description}
                                        onChange={handleDescriptionChange}
                                        readOnly={readOnly}
                                        rows={4}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none ${readOnly ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                                        placeholder={t('placeholder_desc')}
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <div className="text-xs text-gray-400">
                                        ID: {selectedNode.id}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Type: {selectedNode.type}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                                >
                                    <Save size={16} />
                                    <span>{readOnly ? t('close') || 'Close' : t('done')}</span>
                                </button>
                                {!readOnly && (
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 py-2 px-4 rounded-md hover:bg-red-50 transition"
                                    >
                                        <Trash2 size={16} />
                                        <span>{t('delete_node')}</span>
                                    </button>
                                )}
                            </div>
                        </>}
                        {activeTab === "Comments" && (
                            <div className="flex-1 overflow-hidden">
                                <CommentsPanel
                                    workflowId={workflowId}
                                    nodeId={selectedNode.id}
                                    readOnly={!canAddComments}
                                />
                            </div>
                        )}
                    </motion.div>
                </>
            )}

        </AnimatePresence>
    );
};
