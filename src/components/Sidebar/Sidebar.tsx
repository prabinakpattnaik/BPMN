import type { DragEvent } from 'react';
import { Circle, Square, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const Sidebar = () => {
    const { t } = useTranslation();
    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        event.dataTransfer.setData('application/reactflow/type', nodeType);
        event.dataTransfer.setData('application/reactflow/label', label);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-64 h-full bg-white border-r border-gray-200 p-4 flex flex-col gap-4">
            <div className="text-xl font-bold mb-4 text-gray-800">{t('components')}</div>

            <div className="space-y-3">
                <div
                    className={clsx(
                        "flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white cursor-grab hover:shadow-md transition-all select-none",
                        "active:cursor-grabbing"
                    )}
                    onDragStart={(event) => onDragStart(event, 'input', t('start'))}
                    draggable
                >
                    <div className="p-2 bg-blue-100 rounded text-blue-600">
                        <Circle size={20} />
                    </div>
                    <span className="font-medium text-gray-700">{t('start')}</span>
                </div>

                <div
                    className={clsx(
                        "flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white cursor-grab hover:shadow-md transition-all select-none",
                        "active:cursor-grabbing"
                    )}
                    onDragStart={(event) => onDragStart(event, 'default', t('task'))}
                    draggable
                >
                    <div className="p-2 bg-purple-100 rounded text-purple-600">
                        <Square size={20} />
                    </div>
                    <span className="font-medium text-gray-700">{t('task')}</span>
                </div>

                <div
                    className={clsx(
                        "flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white cursor-grab hover:shadow-md transition-all select-none",
                        "active:cursor-grabbing"
                    )}
                    onDragStart={(event) => onDragStart(event, 'output', t('end'))}
                    draggable
                >
                    <div className="p-2 bg-red-100 rounded text-red-600">
                        <MessageSquare size={20} />
                    </div>
                    <span className="font-medium text-gray-700">{t('end')}</span>
                </div>
            </div>

            <div className="mt-auto text-xs text-gray-400">
                {t('drag_hint')}
            </div>
        </aside>
    );
};
