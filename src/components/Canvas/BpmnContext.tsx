import { createContext, useContext } from 'react';

interface BpmnContextType {
    modeler: any;
}

export const BpmnContext = createContext<BpmnContextType | null>(null);

export const useBpmn = () => {
    const context = useContext(BpmnContext);
    if (!context) {
        // Return null or throw error. For our case, null is fine if we check.
        return null;
    }
    return context.modeler;
};
