import { useRef, useEffect, useState } from 'react';
import Modeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import { useStore } from '../../lib/store';
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel';
import { INITIAL_BPMN_XML } from '../../lib/bpmn-constants';
import { BpmnContext } from './BpmnContext';

// bpmn-js styles
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

export const Canvas = ({ readOnly = false, canAddComments = false }: { readOnly?: boolean, canAddComments?: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [modeler, setModeler] = useState<any>(null);
    const isInternalChange = useRef(false);
    const lastImportedId = useRef<string | null>(null);

    const {
        bpmnXml,
        workflowId
    } = useStore();

    // Initialize/Destroy Modeler
    useEffect(() => {
        if (!containerRef.current) return;

        const BpmnClass = readOnly ? NavigatedViewer : Modeler;
        const instance = new BpmnClass({
            container: containerRef.current,
            keyboard: {
                bindTo: window
            }
        });

        setModeler(instance);

        // Selection handling - clear panel if selection changes (unless it's the current node)
        instance.on('selection.changed', (e: any) => {
            const selection = e.newSelection[0];
            const currentSelectedNode = useStore.getState().selectedNode;

            if (!selection || (currentSelectedNode && selection.id !== currentSelectedNode.id)) {
                useStore.setState({ selectedNode: null });
            }
        });

        // Open properties/comments on double-click
        instance.on('element.dblclick', (e: any) => {
            const element = e.element;
            if (element && element.type !== 'label' && element.type !== 'bpmn:Label') {
                useStore.setState({
                    selectedNode: {
                        id: element.id,
                        type: element.type,
                        data: {
                            label: element.businessObject.name || '',
                            description: element.businessObject.get('description') || ''
                        }
                    } as any
                });
            }
        });

        // Auto-select on creation
        instance.on('shape.added', (e: any) => {
            const element = e.element;
            if (element && element.type !== 'label' && !element.waypoints) {
                setTimeout(() => {
                    try {
                        const selection = instance.get('selection') as any;
                        if (selection) {
                            selection.select(element);
                        }
                    } catch (err) {
                        console.warn('Selection failed', err);
                    }
                }, 100);
            }
        });

        // Content changed handling
        if (!readOnly) {
            instance.on('commandStack.changed', async () => {
                try {
                    isInternalChange.current = true;
                    const { xml } = await instance.saveXML({ format: true });
                    useStore.setState({ bpmnXml: xml });
                } catch (err) {
                    console.error('Error saving XML:', err);
                } finally {
                    setTimeout(() => { isInternalChange.current = false; }, 200);
                }
            });
        }

        return () => {
            instance.destroy();
        };
    }, [readOnly]);

    // Initial Load / Workflow Switch
    useEffect(() => {
        if (!modeler) return;
        if (isInternalChange.current) return;
        if (lastImportedId.current === workflowId && bpmnXml) return;

        const xmlToLoad = bpmnXml || INITIAL_BPMN_XML;

        const load = async () => {
            try {
                await modeler.importXML(xmlToLoad);
                lastImportedId.current = workflowId;
                const canvas = modeler.get('canvas');
                canvas.zoom('fit-viewport');
            } catch (err) {
                console.error('Error importing XML:', err);
            }
        };

        load();
    }, [workflowId, modeler, bpmnXml]);

    return (
        <BpmnContext.Provider value={{ modeler }}>
            <div className="flex h-full w-full relative overflow-hidden bg-gray-50">
                <div
                    ref={containerRef}
                    className="bpmn-container flex-1 h-full"
                />
                <PropertiesPanel readOnly={readOnly} canAddComments={canAddComments} />

                <div className="absolute bottom-6 left-6 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl pointer-events-none z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Standard BPMN 2.0 Engine</span>
                    </div>
                    <div className="text-xs font-medium text-gray-400">
                        {readOnly ? "View Mode • Navigation Enabled" : "Design Mode • Full Modeling Tools"}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-blue-400/80 italic">
                        <span className="w-1 h-1 rounded-full bg-blue-300" />
                        Double click an element to edit properties & comments
                    </div>
                </div>
            </div>
        </BpmnContext.Provider>
    );
};
