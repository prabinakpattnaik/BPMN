import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    value: string | number;
    label: string;
    icon?: React.ReactNode;
    color?: string;
}

interface CustomSelectProps {
    value: string | number;
    onChange: (value: any) => void;
    options: Option[];
    label?: string;
    className?: string;
    placeholder?: string;
}

export const CustomSelect = ({ value, onChange, options, label, className = '', placeholder = 'Select option' }: CustomSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, dropUp: false });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const updateCoords = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const menuHeight = Math.min(options.length * 44 + 16, 260); // Est height

            // Drop up if not enough space below AND more space above
            const shouldDropUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                dropUp: shouldDropUp
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();

            const handleScroll = () => {
                // For small scrolls, update position, for large ones just close
                updateCoords();
            };

            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', updateCoords);

            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', updateCoords);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // Also check if click is inside portal using ID
                const portalEl = document.getElementById('select-portal-root');
                if (portalEl && portalEl.contains(event.target as Node)) return;
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 shadow-sm ml-1 block">{label}</label>}

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium text-gray-700 shadow-sm ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : ''}`}
            >
                <div className="flex items-center gap-2">
                    {selectedOption?.icon && <span className="text-blue-500">{selectedOption.icon}</span>}
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] pointer-events-none">
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: coords.dropUp ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: coords.dropUp ? 10 : -10 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            style={{
                                position: 'absolute',
                                left: coords.left,
                                width: coords.width,
                                ...(coords.dropUp
                                    ? { bottom: (window.innerHeight - coords.top) + 8 }
                                    : { top: coords.top + buttonRef.current!.offsetHeight + 8 }),
                                pointerEvents: 'auto'
                            }}
                            id="select-portal-root"
                            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-2 overflow-hidden ring-1 ring-black/5"
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all hover:bg-blue-50 text-left ${value === option.value ? 'bg-blue-50/50 text-blue-600 font-bold' : 'text-gray-700 hover:pl-6'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {option.icon && (
                                                <div className={`p-1.5 rounded-lg ${value === option.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-100'}`}>
                                                    {option.icon}
                                                </div>
                                            )}
                                            <span className="truncate">{option.label}</span>
                                        </div>
                                        {value === option.value && <Check size={16} className="text-blue-600 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </div>
    );
};
