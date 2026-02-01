import { useCallback, useRef } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import ReactFlow, {
    Background,
    Controls,
    ReactFlowProvider,
    type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../../lib/store';
import { Sidebar } from '../Sidebar/Sidebar';
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel';

const Flow = ({ readOnly = false }: { readOnly?: boolean }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setSelectedNode,
    } = useStore();

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow/type');
            const label = event.dataTransfer.getData('application/reactflow/label');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            if (!reactFlowWrapper.current) return;

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = {
                // Project helps translate screen px to flow position, but we need the instance. 
                // For simplicity in this step, we calculate relative to bounds.
                // Ideally use reactFlowInstance.project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top });
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            };

            const newNode: Node = {
                id: crypto.randomUUID(),
                type,
                position,
                data: { label: label || `${type} node` },
            };

            setNodes(nodes.concat(newNode));
        },
        [nodes, setNodes]
    );

    const onNodeClick = useCallback((_event: MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, [setSelectedNode]);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, [setSelectedNode]);

    return (
        <div className="flex h-full w-full">
            {!readOnly && <Sidebar />}
            <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={readOnly ? undefined : onNodesChange}
                    onEdgesChange={readOnly ? undefined : onEdgesChange}
                    onConnect={readOnly ? undefined : onConnect}
                    onInit={(instance) => {
                        console.log('Flow loaded:', instance);
                    }}
                    onDrop={readOnly ? undefined : onDrop}
                    onDragOver={readOnly ? undefined : onDragOver}
                    onNodeClick={readOnly ? undefined : onNodeClick}
                    onPaneClick={readOnly ? undefined : onPaneClick}
                    nodesDraggable={!readOnly}
                    nodesConnectable={!readOnly}
                    elementsSelectable={!readOnly}
                    fitView
                >
                    <Background color="#ccc" gap={20} />
                    <Controls />
                </ReactFlow>
                {!readOnly && <PropertiesPanel />}
            </div>
        </div>
    );
};

export const Canvas = ({ readOnly = false }: { readOnly?: boolean }) => {
    return (
        <ReactFlowProvider>
            <Flow readOnly={readOnly} />
        </ReactFlowProvider>
    );
};
