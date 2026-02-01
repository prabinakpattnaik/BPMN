import { Handle, Position } from 'reactflow';
import { Circle, Square, MessageSquare } from 'lucide-react';

const nodeBaseStyles = "bg-white border-2 rounded-2xl p-4 shadow-lg min-w-[150px] transition-all hover:shadow-xl hover:border-blue-400";

export const StartNode = ({ data }: any) => (
    <div className={`${nodeBaseStyles} border-blue-500`}>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Circle size={20} />
            </div>
            <div className="font-bold text-gray-800 uppercase tracking-tight text-sm">{data.label}</div>
        </div>
        <Handle
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-blue-500 border-2 border-white !-right-1.5 shadow-sm"
        />
    </div>
);

export const TaskNode = ({ data }: any) => (
    <div className={`${nodeBaseStyles} border-gray-200`}>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Square size={20} />
            </div>
            <div className="font-bold text-gray-800 uppercase tracking-tight text-sm">{data.label}</div>
        </div>
        <Handle
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-gray-400 border-2 border-white !-left-1.5 shadow-sm"
        />
        <Handle
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-blue-500 border-2 border-white !-right-1.5 shadow-sm"
        />
    </div>
);

export const EndNode = ({ data }: any) => (
    <div className={`${nodeBaseStyles} border-red-500`}>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <MessageSquare size={20} />
            </div>
            <div className="font-bold text-gray-800 uppercase tracking-tight text-sm">{data.label}</div>
        </div>
        <Handle
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-gray-400 border-2 border-white !-left-1.5 shadow-sm"
        />
    </div>
);
