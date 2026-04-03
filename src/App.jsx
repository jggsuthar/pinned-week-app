import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from 'react';
import {
    Clock, Layers, Plus, Trash2, ArrowRight, ArrowLeft, Info, CalendarDays,
    Copy, Scissors, CheckSquare, Square, ChevronDown, Rocket, Sparkles, Sun, Grid,
    AlertCircle, Lightbulb, Search, FileText, Camera, Mic, Send, Database, Download, 
    Minus, ChevronsUp, ChevronsUpDown, Loader2, Video, MonitorPlay, Smartphone, 
    Radio, PlaySquare, Film, Tv, Gamepad2, SlidersHorizontal, PenTool, Eye, Music,
    Youtube, Clapperboard, Monitor, RadioReceiver, Pen, Image as ImageIcon, Mail,
    XCircle, Maximize, Minimize
} from 'lucide-react';

// --- Global Styles ---
const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --card: 0 0% 100%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 0 0% 100%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 199 73% 58%; 
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 47.4% 11.2%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 47.4% 11.2%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 199 73% 58%;
            --radius: 0.75rem;
        }
        
        /* Force Poppins universally, overriding Tailwind defaults */
        html, body, button, input, textarea, select, .font-sans {
            font-family: 'Poppins', sans-serif !important;
        }
        
        /* Mobile Scaling: ~19% smaller elements (13px baseline vs 16px) */
        html {
            font-size: 13px;
        }
        /* Restore standard sizing for Tablets/Desktop */
        @media (min-width: 640px) {
            html {
                font-size: 16px;
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: none; }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        
        @keyframes slide-up-fade {
            0% { transform: translateY(100%); opacity: 0; }
            15% { transform: translateY(0); opacity: 1; }
            85% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-100%); opacity: 0; }
        }
        .animate-slide-text { animation: slide-up-fade 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `}</style>
);

// --- UI Components ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
        default: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90",
        destructive: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:opacity-90",
        outline: "border border-[hsl(var(--input))] bg-transparent hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        secondary: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:opacity-80",
        ghost: "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
    };
    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    };
    return (
        <button ref={ref} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />
    );
});

const Card = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn("rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-sm", className)} {...props} />));
const CardHeader = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn("flex flex-col space-y-1.5 p-4 md:p-6", className)} {...props} />));
const CardTitle = React.forwardRef(({ className, ...props }, ref) => (<h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />));
const CardDescription = React.forwardRef(({ className, ...props }, ref) => (<p ref={ref} className={cn("text-sm text-[hsl(var(--muted-foreground))]", className)} {...props} />));
const CardContent = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn("p-4 md:p-6 pt-0", className)} {...props} />));
const Input = React.forwardRef(({ className, type, ...props }, ref) => (<input type={type} className={cn("flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-[16px] md:text-sm placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />));
const Label = React.forwardRef(({ className, ...props }, ref) => (<label ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />));
const Checkbox = React.forwardRef(({ className, ...props }, ref) => (<input type="checkbox" className={cn("peer h-4 w-4 shrink-0 rounded-sm border border-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50 accent-[hsl(var(--primary))]", className)} ref={ref} {...props} />));
const Progress = React.forwardRef(({ className, value, ...props }, ref) => (<div ref={ref} className={cn("relative h-4 w-full overflow-hidden rounded-full bg-[hsl(var(--secondary))]", className)} {...props}><div className="h-full w-full flex-1 bg-[hsl(var(--primary))] transition-all duration-300" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} /></div>));
const Slider = React.forwardRef(({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => (<input type="range" min={min} max={max} step={step} value={value[0]} onChange={(e) => onValueChange([parseFloat(e.target.value)])} className={cn("w-full accent-[hsl(var(--primary))] h-2 bg-[hsl(var(--secondary))] rounded-lg appearance-none cursor-pointer", className)} ref={ref} {...props} />));

// Accordion
const AccordionContext = createContext({});
const AccordionItemContext = createContext({});
const Accordion = ({ children, type, collapsible, defaultValue, className }) => {
    const [value, setValue] = useState(defaultValue || "");
    const handleTrigger = (itemValue) => { if (type === 'single' && collapsible && value === itemValue) { setValue(""); } else { setValue(itemValue); } };
    return (<AccordionContext.Provider value={{ activeValue: value, onTrigger: handleTrigger }}><div className={className}>{children}</div></AccordionContext.Provider>);
};
const AccordionItem = ({ children, value, className }) => (<AccordionItemContext.Provider value={{ value }}><div className={cn("border-b border-[hsl(var(--border))]", className)}>{children}</div></AccordionItemContext.Provider>);
const AccordionTrigger = ({ children, className }) => {
    const { activeValue, onTrigger } = useContext(AccordionContext);
    const { value } = useContext(AccordionItemContext);
    const isOpen = activeValue === value;
    return (<div className="flex"><button onClick={() => onTrigger(value)} className={cn("flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline", className)} type="button">{children}<ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} /></button></div>);
};
const AccordionContent = ({ children, className }) => {
    const { activeValue } = useContext(AccordionContext);
    const { value } = useContext(AccordionItemContext);
    const isOpen = activeValue === value;
    return (<div className={cn("overflow-hidden text-sm transition-all", isOpen ? "block animate-fadeIn" : "hidden", className)}><div className="pb-4 pt-0">{children}</div></div>);
};

// Select Component
const SelectContext = createContext({});
const Select = ({ children, value, onValueChange }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (containerRef.current && !containerRef.current.contains(event.target)) { setOpen(false); } };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    return (<div className="relative" ref={containerRef}><SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>{children}</SelectContext.Provider></div>);
};
const SelectTrigger = ({ children, className }) => {
    const { setOpen, open } = useContext(SelectContext);
    return (<button type="button" onClick={() => setOpen(!open)} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-[16px] md:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50", className)}>{children}<ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" /></button>);
};
const SelectValue = ({ placeholder }) => {
    const { value } = useContext(SelectContext);
    return <span className="truncate">{value || placeholder}</span>;
};
const SelectContent = ({ children }) => {
    const { open, setOpen, onValueChange } = useContext(SelectContext);
    if (!open) return null;
    return (<div className="absolute z-50 min-w-[8rem] w-full mt-1 overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] shadow-md animate-fadeIn"><div className="p-2 max-h-96 overflow-auto flex flex-col gap-1">{React.Children.map(children, child => React.cloneElement(child, { onSelect: (val) => { onValueChange(val); setOpen(false); } }))}</div></div>);
};
const SelectItem = ({ value, children, onSelect, className }) => (
    <div 
        onClick={() => onSelect(value)} 
        className={cn("relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 px-3 text-sm outline-none transition-all", className || "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]")}
    >
        {children}
    </div>
);

const TooltipProvider = ({ children }) => <>{children}</>;

// --- Constants & Data ---

const SERIES_ICONS = {
    'Video': Video, 'MonitorPlay': MonitorPlay, 'Smartphone': Smartphone,
    'Tv': Tv, 'Film': Film, 'Youtube': Youtube, 'Clapperboard': Clapperboard, 'PlaySquare': PlaySquare
};

const TASK_ICONS = {
    'Search': Search, 'FileText': FileText, 'Camera': Camera, 'Monitor': Monitor,
    'Gamepad2': Gamepad2, 'Mic': Mic, 'SlidersHorizontal': SlidersHorizontal,
    'PenTool': PenTool, 'Eye': Eye, 'Music': Music, 'Scissors': Scissors,
    'CalendarDays': CalendarDays, 'Lightbulb': Lightbulb, 'Database': Database,
    'Pen': Pen, 'ImageIcon': ImageIcon, 'Sparkles': Sparkles, 'RadioReceiver': RadioReceiver
};

const PRESET_ZONES = [
    { id: 'z1', name: 'Office', weeklyCapacity: [60, 60, 60, 60, 60, 0, 0] },
    { id: 'z2', name: 'Bus', weeklyCapacity: [90, 90, 90, 90, 90, 0, 0] },
    { id: 'z3', name: 'Home', weeklyCapacity: [120, 120, 120, 120, 120, 120, 120] }
];

const WORKFLOW_PRESETS = [
    {
        id: 'custom',
        name: 'Custom Workflow',
        recommended: 'Design your own unique 4-step process. You will be able to edit task names and icons.',
        isCustom: true,
        isLive: false,
        tasks: [
            { name: 'Phase 1', iconName: 'Search', defaultWeeks: 4, inertia: 'minor', splitable: true, isEditable: true },
            { name: 'Phase 2', iconName: 'Camera', defaultWeeks: 3, inertia: 'medium', splitable: false, isEditable: true },
            { name: 'Phase 3', iconName: 'Scissors', defaultWeeks: 2, inertia: 'high', splitable: true, isEditable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false, isEditable: false }
        ]
    },
    {
        id: 'live',
        name: 'Live Stream',
        recommended: 'Live Q&A, Webinars, Live Gaming, Real-time Events',
        isCustom: false,
        isLive: true,
        tasks: [
            { name: 'Plan', iconName: 'FileText', defaultWeeks: 1, inertia: 'medium', splitable: true },
            { name: 'Go Live', iconName: 'RadioReceiver', defaultWeeks: 0, inertia: 'high', splitable: false }
        ]
    },
    {
        id: 'filmed',
        name: 'Filmed Original Content',
        recommended: 'News / Journalism, Documentary, Educational, Travel Vlogs, Science & Tech Reviews, Sketch Comedy, Narrative Storytelling, Lifestyle Vlogs, Family Channels, Fitness / Workout, Cooking',
        isCustom: false,
        isLive: false,
        tasks: [
            { name: 'Research', iconName: 'Search', defaultWeeks: 4, inertia: 'minor', splitable: true },
            { name: 'Film', iconName: 'Camera', defaultWeeks: 3, inertia: 'high', splitable: false },
            { name: 'Edit', iconName: 'Scissors', defaultWeeks: 2, inertia: 'high', splitable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false }
        ]
    },
    {
        id: 'screen',
        name: 'Screen Recording',
        recommended: 'Educational (Explainer), Finance / Crypto, Current Events Commentary, Video Essays, Software Tutorials, Productivity / Study Tips, Tech Reviews (Screen Recording), Stock Market Analysis, Programming / Coding Tutorials',
        isCustom: false,
        isLive: false,
        tasks: [
            { name: 'Plan', iconName: 'FileText', defaultWeeks: 4, inertia: 'medium', splitable: true },
            { name: 'Record Screen', iconName: 'Monitor', defaultWeeks: 3, inertia: 'high', splitable: false },
            { name: 'Edit', iconName: 'Scissors', defaultWeeks: 2, inertia: 'high', splitable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false }
        ]
    },
    {
        id: 'gaming',
        name: 'Gaming',
        recommended: "Let's Play / Walkthroughs, Gaming Guides, Challenge Runs, Commentary Gaming, Montage / Highlight Channels, Competitive Gaming Breakdowns",
        isCustom: false,
        isLive: false,
        tasks: [
            { name: 'Record Gameplay', iconName: 'Gamepad2', defaultWeeks: 4, inertia: 'minor', splitable: true },
            { name: 'Voiceover', iconName: 'Mic', defaultWeeks: 3, inertia: 'medium', splitable: false },
            { name: 'Edit', iconName: 'Scissors', defaultWeeks: 2, inertia: 'high', splitable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false }
        ]
    },
    {
        id: 'audio',
        name: 'Audio-First',
        recommended: 'Music (Covers / Originals), Podcasts, Audiobooks / Poetry, Beat Making, Storytelling / Monologue, ASMR, True Crime (Audio Focus), History (Narration Style)',
        isCustom: false,
        isLive: false,
        tasks: [
            { name: 'Research', iconName: 'Search', defaultWeeks: 4, inertia: 'minor', splitable: true },
            { name: 'Record Audio', iconName: 'Mic', defaultWeeks: 3, inertia: 'medium', splitable: false },
            { name: 'Edit / Mix', iconName: 'SlidersHorizontal', defaultWeeks: 2, inertia: 'high', splitable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false }
        ]
    },
    {
        id: 'animation',
        name: 'Animation',
        recommended: 'Animation, Whiteboard Explainer, Motion Graphics Channels, Animated Stories',
        isCustom: false,
        isLive: false,
        tasks: [
            { name: 'Storyboard', iconName: 'PenTool', defaultWeeks: 4, inertia: 'medium', splitable: true },
            { name: 'Animate', iconName: 'Sparkles', defaultWeeks: 3, inertia: 'high', splitable: true },
            { name: 'Edit', iconName: 'Scissors', defaultWeeks: 2, inertia: 'minor', splitable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false }
        ]
    },
    {
        id: 'reaction',
        name: 'Reaction',
        recommended: 'Reaction Channels, First-Time Watching, Commentary on Existing Media, Live Stream Highlights',
        isCustom: false,
        isLive: false,
        tasks: [
            { name: 'Watch', iconName: 'Eye', defaultWeeks: 4, inertia: 'minor', splitable: true },
            { name: 'React / Record', iconName: 'Camera', defaultWeeks: 3, inertia: 'high', splitable: false },
            { name: 'Edit', iconName: 'Scissors', defaultWeeks: 2, inertia: 'medium', splitable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false }
        ]
    },
    {
        id: 'music',
        name: 'Music Performance',
        recommended: 'Music Videos, Performance Bands, Live Session Recordings, Cover Songs (Video Focus)',
        isCustom: false,
        isLive: false,
        tasks: [
            { name: 'Compose', iconName: 'Music', defaultWeeks: 4, inertia: 'high', splitable: true },
            { name: 'Shoot Video', iconName: 'Camera', defaultWeeks: 3, inertia: 'high', splitable: false },
            { name: 'Edit', iconName: 'Scissors', defaultWeeks: 2, inertia: 'medium', splitable: true },
            { name: 'Schedule', iconName: 'CalendarDays', defaultWeeks: 1, inertia: 'minor', splitable: false }
        ]
    }
];


// --- Pickers ---

const SeriesIconPicker = ({ value, onValueChange, usedIcons = [] }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const SelectedIcon = SERIES_ICONS[value] || Video;

    return (
        <div className="relative" ref={containerRef}>
            <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] px-1">Series Icon</Label>
                <button 
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex h-12 w-16 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    title="Choose Series Icon"
                >
                    <SelectedIcon size={24} />
                </button>
            </div>

            {open && (
                <div className="absolute z-50 top-full left-0 sm:left-auto sm:right-0 mt-2 w-[220px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-3 shadow-xl animate-fadeIn">
                    <div className="grid grid-cols-4 gap-2">
                        {Object.keys(SERIES_ICONS).map(key => {
                            const IconComp = SERIES_ICONS[key];
                            const isSelected = value === key;
                            const isDisabled = usedIcons.includes(key) && !isSelected;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => { onValueChange(key); setOpen(false); }}
                                    className={cn(
                                        "flex items-center justify-center p-3 rounded-xl transition-all",
                                        isSelected ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm scale-105" 
                                        : isDisabled ? "opacity-20 cursor-not-allowed text-[hsl(var(--muted-foreground))]" 
                                        : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary))]/20 hover:text-[hsl(var(--primary))]"
                                    )}
                                >
                                    <IconComp size={20} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const TaskIconPicker = ({ value, onValueChange, usedIcons = [] }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const SelectedIcon = TASK_ICONS[value] || Search;

    return (
        <div className="relative" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setOpen(!open)}
                className="bg-[hsl(var(--muted))] p-2 rounded-full hover:bg-[hsl(var(--accent))] transition-colors border border-[hsl(var(--border))] flex items-center justify-center"
                title="Choose Task Icon"
            >
                <SelectedIcon size={16} className="text-[hsl(var(--primary))]" />
            </button>
            {open && (
                <div className="absolute z-50 top-full left-0 mt-2 w-[240px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-2 shadow-xl animate-fadeIn grid grid-cols-5 gap-1">
                    {Object.keys(TASK_ICONS).map(key => {
                        const IconComp = TASK_ICONS[key];
                        const isDisabled = usedIcons.includes(key) && value !== key;
                        const isSelected = value === key;
                        return (
                            <button 
                                key={key} 
                                type="button" 
                                disabled={isDisabled} 
                                onClick={() => { onValueChange(key); setOpen(false); }} 
                                className={cn(
                                    "flex items-center justify-center p-2 rounded-lg transition-all",
                                    isSelected ? "bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]" 
                                    : isDisabled ? "opacity-20 cursor-not-allowed text-[hsl(var(--muted-foreground))]" 
                                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                                )}
                            >
                                <IconComp size={18} />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    )
}

const Header = () => {
    const [index, setIndex] = useState(0);
    const phrases = ["Fast-track your YouTube Growth", "Grow like pro", "Unlock your potential", "Build your dream channel"];
    useEffect(() => {
        const interval = setInterval(() => setIndex((prev) => (prev + 1) % phrases.length), 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full flex flex-col md:flex-row justify-center md:justify-between items-center gap-4 p-4 sticky top-0 z-50 pointer-events-none">
            <a href="http://jaiminsuthar.com/" className="pointer-events-auto transition-transform hover:scale-105">
                <img src="https://static.wixstatic.com/media/23b1fb_d6a6db5d16ef47bcb9e209773d7b964a~mv2.png" alt="Jaimin Suthar" className="h-8 md:h-10 object-contain drop-shadow-md" />
            </a>
            <a 
                href="https://www.jaiminsuthar.com/grow" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#facc15] pointer-events-auto text-black px-6 md:px-8 py-2.5 rounded-full font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer flex items-center justify-center min-w-[280px] md:min-w-[350px] no-underline"
            >
                <div className="h-4 md:h-5 overflow-hidden relative w-full">
                    <div key={index} className="absolute w-full text-center animate-slide-text text-[10px] md:text-xs tracking-wide uppercase font-sans left-0 top-0 flex items-center justify-center h-full whitespace-nowrap">
                        {phrases[index]}
                    </div>
                </div>
            </a>
        </div>
    );
};

const FeedbackTag = () => {
    const [copied, setCopied] = useState(false);
    const email = "jaimin@jaiminsuthar.com";
    
    const handleCopy = () => {
        navigator.clipboard.writeText(email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/30 py-4 px-6 rounded-2xl border border-[hsl(var(--border))] max-w-2xl mx-auto my-6 animate-fadeIn">
            <span className="font-medium text-center">For Feedback and Suggestions, reachout to</span>
            <div className="flex items-center gap-1 bg-[hsl(var(--background))] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] shadow-sm">
                <Mail size={16} className="text-[hsl(var(--primary))] mr-1 opacity-70" />
                <span className="font-bold text-[hsl(var(--foreground))] select-all">{email}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 hover:bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" onClick={handleCopy} title="Copy email">
                    {copied ? <CheckSquare size={16} className="text-green-500" /> : <Copy size={16} />}
                </Button>
            </div>
        </div>
    );
};

const CalendarTable = ({ weekDays, zones, dailySchedule, scheduledCounts, contentTypes, isCalculating, calendarView }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const printRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (isFullscreen && containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [isFullscreen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const handleDownload = async () => {
        if (!printRef.current) return;
        setIsDownloading(true);
        try {
            if (!window.htmlToImage) {
                console.error("html-to-image not loaded yet");
                return;
            }
            if (document.fonts?.ready) await document.fonts.ready;
            
            const node = printRef.current;
            const scrollContainer = node.querySelector('.overflow-x-auto');
            
            // 1. Save original styles to revert later
            const originalNodeCssText = node.style.cssText;
            const originalScrollCssText = scrollContainer ? scrollContainer.style.cssText : '';

            // 2. Force the container and scroll area to completely expand horizontally
            node.style.setProperty('overflow', 'visible', 'important');
            node.style.setProperty('width', 'max-content', 'important');
            node.style.setProperty('min-width', '100%', 'important');
            
            if (scrollContainer) {
                scrollContainer.style.setProperty('overflow', 'visible', 'important');
                scrollContainer.style.setProperty('width', 'max-content', 'important');
                scrollContainer.style.setProperty('min-width', '100%', 'important');
            }

            // 3. Add the requested watermark text at the bottom
            const watermark = document.createElement('div');
            watermark.id = "temp-watermark";
            watermark.style.textAlign = 'center';
            watermark.style.paddingTop = '16px';
            watermark.style.paddingBottom = '8px';
            watermark.style.fontSize = '14px';
            watermark.style.fontWeight = '600';
            watermark.style.color = '#64748b'; // slate-500
            watermark.innerHTML = 'Explore more Growth hacks on <strong style="color: #0f172a;">jaiminsuthar.com</strong>';
            
            const cardContent = node.querySelector('[data-id="calendar-card-content"]');
            if (cardContent) cardContent.appendChild(watermark);

            // Wait a moment to let the browser apply the fully expanded layout
            await new Promise(r => setTimeout(r, 150));

            // 4. Measure the full unclipped dimensions
            const targetWidth = node.scrollWidth;
            const targetHeight = node.scrollHeight;

            const dataUrl = await window.htmlToImage.toJpeg(node, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                width: targetWidth,
                height: targetHeight,
                style: {
                    width: `${targetWidth}px`,
                    height: `${targetHeight}px`,
                    margin: '0'
                },
                // Ignore the buttons so they don't show up in the downloaded JPG
                filter: (child) => !child.dataset?.hideOnExport
            });
            
            // 5. Revert DOM changes back to normal
            node.style.cssText = originalNodeCssText;
            if (scrollContainer) scrollContainer.style.cssText = originalScrollCssText;
            if (watermark.parentNode) watermark.parentNode.removeChild(watermark);

            const link = document.createElement('a');
            link.download = `pinned-week-${new Date().toISOString().slice(0, 10)}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error("Failed to download image", error);
            
            // Fail-safe cleanup
            const node = printRef.current;
            if (node) node.style.cssText = '';
            const scrollContainer = node?.querySelector('.overflow-x-auto');
            if (scrollContainer) scrollContainer.style.cssText = '';
            const watermark = document.getElementById("temp-watermark");
            if (watermark) watermark.remove();
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div ref={containerRef} className={isFullscreen ? "fixed inset-0 z- bg-[hsl(var(--background))] p-4 md:p-8 overflow-auto animate-fadeIn" : "mt-12 relative"}>
        <Card ref={printRef} className={cn("overflow-hidden border-2 bg-[hsl(var(--background))]", isFullscreen ? "min-h-full shadow-2xl" : "")}>
            <CardHeader className="bg-[hsl(var(--muted))]/20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                <CardTitle className="text-xl md:text-2xl">Your Printable Default Week to pin</CardTitle>
                <CardDescription className="mt-1 text-[hsl(var(--foreground))] font-medium">
                    Scheduling {' '}
                    {contentTypes.filter(ct => scheduledCounts[ct.id] > 0).map((ct, index, arr) => (
                        <span key={ct.id}>
                            <span className="font-bold text-[hsl(var(--primary))]">{scheduledCounts[ct.id]} {ct.name}</span>
                            {index < arr.length - 1 && ' & '}
                        </span>
                    ))} this week.
                </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2" data-hide-on-export="true">
                    {isFullscreen && (
                        <Button variant="default" size="sm" onClick={handleDownload} disabled={isDownloading}>
                            {isDownloading ? <Loader2 size={16} className="sm:mr-2 animate-spin" /> : <Download size={16} className="sm:mr-2" />}
                            <span className="hidden sm:inline">{isDownloading ? "Downloading..." : "Download Calendar"}</span>
                        </Button>
                    )}
                    <Button 
                        variant={isFullscreen ? "outline" : "default"} 
                        size="sm" 
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className={!isFullscreen ? "font-bold shadow-md hover:-translate-y-0.5 transition-transform" : ""}
                    >
                        {isFullscreen ? (
                            <><Minimize size={16} className="sm:mr-2" /> <span className="hidden sm:inline">Exit Full Screen</span></>
                        ) : (
                            <><Maximize size={16} className="sm:mr-2" /> <span className="hidden sm:inline">Full Screen</span></>
                        )}
                    </Button>
                </div>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] pt-2">This schedule accurately represents the dependency timeline. Prerequisite tasks are mapped sequentially before dependent tasks.</p>
            </CardHeader>
            <CardContent data-id="calendar-card-content" className="relative min-h-[300px] pt-4">
            {isCalculating && (
                <div className="absolute inset-0 z-10 bg-[hsl(var(--background))]/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl animate-fadeIn">
                    <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))] mb-2" />
                    <span className="text-sm font-bold text-[hsl(var(--foreground))]">Calculating Scenarios...</span>
                </div>
            )}
            <div className="overflow-x-auto pb-4">
                <table className="w-full text-left border-collapse border border-[hsl(var(--border))]">
                <thead>
                    <tr className="bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]">
                    <th className="p-4 font-bold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">Zone</th>
                    {weekDays.map((day) => (
                        <th key={day} className="p-4 font-bold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider border-l border-[hsl(var(--border))] text-center">{day}</th>
                    ))}
                    </tr>
                </thead>
                <tbody>
                    {zones.map((zone, idx) => (
                    <tr key={zone.id} className={idx % 2 === 0 ? "bg-[hsl(var(--background))]" : "bg-[hsl(var(--muted))]/30"}>
                        <td className="p-4 font-semibold text-[hsl(var(--foreground))] border-b border-r border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                        {zone.name}
                        <div className="text-xs text-[hsl(var(--muted-foreground))] font-normal mt-1">
                            {Math.round(zone.weeklyCapacity.reduce((a, b) => a + b, 0) / 7)}m avg/day
                        </div>
                        </td>
                        {dailySchedule[zone.id].map((dayTasks, dayIdx) => (
                        <td key={dayIdx} className="p-2 border-l border-b border-[hsl(var(--border))] align-top min-w-[140px]">
                            {dayTasks.length > 0 ? (
                            <div className="space-y-2">
                                {dayTasks.map((entry, eIdx) => {
                                const seriesName = entry.seriesName || entry.label.split(": ")[0];
                                const taskName = entry.taskName || (entry.label.split(": ")[1] || "").split(" (")[0];
                                const weekNum = entry.targetWeek || null;

                                const displayValue = entry.isSplitable ? `${entry.minutes}m` : `x${entry.count}`;
                                const SeriesIcon = SERIES_ICONS[entry.seriesIcon] || Video;
                                const TaskIcon = TASK_ICONS[entry.taskIcon] || Clock;

                                if (calendarView === 'icons') {
                                    return (
                                        <div key={eIdx} className="bg-[hsl(var(--accent))]/50 rounded-lg p-2 border border-[hsl(var(--primary))]/20 shadow-sm transition-shadow flex flex-col gap-1.5 items-center justify-center" title={`For Wk ${weekNum}: ${seriesName} (${taskName})`}>
                                            <div className="text-[9px] uppercase font-extrabold text-[hsl(var(--primary))] leading-none">
                                                Wk {weekNum}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[hsl(var(--primary))]">
                                                <SeriesIcon size={16} />
                                                <TaskIcon size={16} className="text-[hsl(var(--foreground))]" />
                                            </div>
                                            <span className="text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-1.5 py-1 rounded text-[9px] shrink-0 font-bold leading-none inline-flex items-center justify-center min-w-[24px]" data-export-badge>{displayValue}</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={eIdx} className="bg-[hsl(var(--accent))]/50 rounded-xl p-3 border border-[hsl(var(--primary))]/20 shadow-sm transition-shadow break-inside-avoid">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-[10px] uppercase font-extrabold text-[hsl(var(--primary))] leading-normal flex items-start gap-1.5" title={`For Wk ${weekNum}: ${seriesName}`}>
                                                {(calendarView === 'both') && <SeriesIcon size={12} className="shrink-0 mt-0.5" />}
                                                <span className="break-words">For Wk {weekNum}: {seriesName}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-[hsl(var(--foreground))] leading-normal flex items-start justify-between gap-2">
                                            <span className="break-words flex items-center gap-1.5 flex-1">
                                                {(calendarView === 'both') && <TaskIcon size={14} className="text-[hsl(var(--muted-foreground))] shrink-0" />}
                                                <span>{taskName}</span>
                                            </span>
                                            <span className="text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-1.5 py-1 rounded-md text-[10px] shrink-0 leading-none inline-flex items-center justify-center min-w-[24px]" data-export-badge>{displayValue}</span>
                                        </div>
                                    </div>
                                );
                                })}
                            </div>
                            ) : (
                            <div className="h-full w-full flex items-center justify-center opacity-10">
                                <div className="w-1 h-1 bg-[hsl(var(--muted-foreground))] rounded-full"></div>
                            </div>
                            )}
                        </td>
                        ))}
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            {calendarView === 'icons' && (
                <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
                    <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase mb-3">Legend</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="col-span-1">
                            <h5 className="text-[10px] font-bold text-[hsl(var(--foreground))] mb-2 uppercase tracking-wider bg-[hsl(var(--muted))]/50 px-2 py-1 rounded">Series</h5>
                            <div className="flex flex-col gap-2 px-1">
                                {contentTypes.filter(ct => scheduledCounts[ct.id] > 0).map(ct => {
                                    const SIcon = SERIES_ICONS[ct.iconName] || Video;
                                    return <div key={ct.id} className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))] legend-item"><span className="flex shrink-0 items-center justify-center"><SIcon size={16} className="text-[hsl(var(--primary))]" /></span> <span>{ct.name}</span></div>
                                })}
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <h5 className="text-[10px] font-bold text-[hsl(var(--foreground))] mb-2 uppercase tracking-wider bg-[hsl(var(--muted))]/50 px-2 py-1 rounded">Tasks</h5>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 px-1">
                                {Array.from(new Set(contentTypes.filter(ct => scheduledCounts[ct.id] > 0).flatMap(ct => ct.tasks.map(t => JSON.stringify({name: t.name, icon: t.iconName}))))).map(tStr => {
                                    const t = JSON.parse(tStr);
                                    const TIcon = TASK_ICONS[t.icon] || Clock;
                                    return <div key={t.name} className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))] legend-item"><span className="flex shrink-0 items-center justify-center"><TIcon size={16} className="text-[hsl(var(--muted-foreground))]" /></span> <span>{t.name}</span></div>
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center mt-2 opacity-70">
                * Tasks marked as splitable may be distributed across multiple slots.
            </p>
            </CardContent>
        </Card>
        </div>
    );
};

export default function App() {
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
        if (!window.htmlToImage) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    const [step, setStep] = useState(0);
    const totalSteps = 5;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);
    
    const [zones, setZones] = useState([]);
    const [zoneMode, setZoneMode] = useState('advance');
    const [savedState, setSavedState] = useState(null);

    const [contentTypes, setContentTypes] = useState([]);
    const [expandedTypeId, setExpandedTypeId] = useState(null);
    const [expandedInfoId, setExpandedInfoId] = useState(null);
    
    const [newSeriesName, setNewSeriesName] = useState('');
    const [newSeriesIcon, setNewSeriesIcon] = useState('Video');
    const [newSeriesPreset, setNewSeriesPreset] = useState('custom');

    const [scheduledCounts, setScheduledCounts] = useState({});
    const [seriesWeights, setSeriesWeights] = useState({});
    const [capacityMode, setCapacityMode] = useState('maximum'); // 'maximum' or 'recommended'
    const [calendarView, setCalendarView] = useState('both'); // 'names', 'icons', 'both'
    
    const [isCalculating, setIsCalculating] = useState(false);
    const [showRecommendedInfo, setShowRecommendedInfo] = useState(false);

    // Ensure icon selection stays unique across series dynamically
    useEffect(() => {
        const used = contentTypes.map(c => c.iconName);
        if (used.includes(newSeriesIcon)) {
            const nextAvailable = Object.keys(SERIES_ICONS).find(icon => !used.includes(icon));
            if (nextAvailable) setNewSeriesIcon(nextAvailable);
        }
    }, [contentTypes, newSeriesIcon]);

    const idCounter = useRef(0);
    const getUniqueId = (prefix = 'id') => {
        idCounter.current += 1;
        return `${prefix}-${idCounter.current}`;
    };

    const StepHeader = ({ currentStep }) => (
        <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-800">
            {["Welcome", "Define Your Zones", "Set Your Weekly Schedule", "Design Your Workflows", "Configure Your Tasks", "Your Results"][currentStep]}
        </h2>
        </div>
    );

    const JaiminSuggestion = ({ children }) => (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 max-w-3xl mx-auto mb-8 shadow-sm">
            <div className="bg-[#fef3c7] p-2 rounded-xl shrink-0">
                <Lightbulb size={20} className="text-[#d97706]" />
            </div>
            <div>
                <h4 className="font-bold text-[#b45309] text-sm uppercase tracking-wider mb-1">Jaimin's Suggestion</h4>
                <div className="text-sm text-[#92400e] leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    );

    const buildPresetSeries = (id, name, icon, presetId, defaultZones) => {
        const preset = WORKFLOW_PRESETS.find(p => p.id === presetId);
        return {
            id, name, iconName: icon, isCustom: preset.isCustom, isLive: preset.isLive || false,
            color: 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]',
            tasks: preset.tasks.map(t => ({
                id: getUniqueId('task'),
                name: t.name,
                iconName: t.iconName,
                minutes: 30, 
                advanceWeeks: t.defaultWeeks,
                isSplitable: t.splitable,
                minChunkSize: t.splitable ? 15 : 30,
                inertia: t.inertia,
                allowedZones: defaultZones,
                isEditable: t.isEditable
            }))
        };
    };

    const handleStartPreset = () => {
        setZoneMode('advance');
        const initialZones = JSON.parse(JSON.stringify(PRESET_ZONES));
        setZones(initialZones); 
        const defaultZones = initialZones.map(z => z.id);
        const ctLong = buildPresetSeries('ct-longform', 'Long Form', 'MonitorPlay', 'filmed', defaultZones);
        const ctShorts = buildPresetSeries('ct-shorts', 'Shorts', 'Smartphone', 'filmed', defaultZones);
        const presetCt = [ctLong, ctShorts];
        setContentTypes(presetCt);
        
        const initialWeights = {};
        const initialCounts = {};
        presetCt.forEach(ct => { initialWeights[ct.id] = 50; initialCounts[ct.id] = 0; });
        setSeriesWeights(initialWeights);
        setScheduledCounts(initialCounts);
        setCapacityMode('maximum');
        setSavedState(null);
        setExpandedTypeId(presetCt[0].id);
        setStep(1);
    };

    const handleStartBlank = () => {
        setZoneMode('advance');
        setZones([]); 
        setContentTypes([]);
        setSeriesWeights({});
        setScheduledCounts({});
        setCapacityMode('maximum');
        setSavedState(null);
        setExpandedTypeId(null);
        setStep(1);
    };

    const handleModeSwitch = (mode) => {
        if (mode === zoneMode) return;
        if (mode === 'normal') {
            setSavedState({ zones: JSON.parse(JSON.stringify(zones)), contentTypes: JSON.parse(JSON.stringify(contentTypes)) });
            const dayZoneId = 'z_day';
            setZones([{ id: dayZoneId, name: 'Day', weeklyCapacity: [0,0,0,0,0,0,0] }]);
            setContentTypes(prev => prev.map(ct => ({ ...ct, tasks: ct.tasks.map(t => ({ ...t, allowedZones: [dayZoneId] })) })));
        } else { 
            if (savedState) { setZones(savedState.zones); setContentTypes(savedState.contentTypes); } 
            else { setZones([]); }
        }
        setZoneMode(mode);
    };

    const handleNextStep = () => {
        if (step === 1 && zoneMode === 'advance' && zones.length === 0) handleModeSwitch('normal');
        if ((step === 2 || step === 3) && contentTypes.length > 0) setExpandedTypeId(contentTypes[0].id);
        if (step === 4) calculateOptimalPinnedWeek(seriesWeights, capacityMode); 
        setStep(s => Math.min(s + 1, totalSteps));
    };

    const addZone = () => setZones([...zones, { id: getUniqueId('zone'), name: '', weeklyCapacity: [0,0,0,0,0,0,0] }]);
    const updateZoneName = (id, value) => setZones(zones.map(z => z.id === id ? { ...z, name: value } : z));
    const updateZoneCapacity = (id, dayIndex, value) => setZones(zones.map(z => { if (z.id === id) { const newCap = [...z.weeklyCapacity]; newCap[dayIndex] = parseInt(value) || 0; return { ...z, weeklyCapacity: newCap }; } return z; }));
    const copyMondayToAll = (id) => setZones(zones.map(z => { if (z.id === id) { const monVal = z.weeklyCapacity[0]; return { ...z, weeklyCapacity: Array(7).fill(monVal) }; } return z; }));
    const removeZone = (id) => setZones(zones.filter(z => z.id !== id));

    const addNewSeries = () => {
        const isIconUsed = contentTypes.some(c => c.iconName === newSeriesIcon);
        if (!newSeriesName.trim() || contentTypes.length >= 3 || isIconUsed) return;
        const newId = getUniqueId('ct');
        const defaultZones = zones.map(z => z.id);
        const newType = buildPresetSeries(newId, newSeriesName, newSeriesIcon, newSeriesPreset, defaultZones);
        setContentTypes([...contentTypes, newType]);
        setSeriesWeights(prev => ({ ...prev, [newId]: contentTypes.length === 0 ? 100 : 0 })); 
        setScheduledCounts(prev => ({ ...prev, [newId]: 0 }));
        setNewSeriesName('');
        setExpandedTypeId(newId);
    };

    const removeSeries = (typeId) => {
        setContentTypes(contentTypes.filter(c => c.id !== typeId));
        const newWeights = { ...seriesWeights }; delete newWeights[typeId]; setSeriesWeights(newWeights);
        const newCounts = { ...scheduledCounts }; delete newCounts[typeId]; setScheduledCounts(newCounts);
        if (expandedTypeId === typeId) setExpandedTypeId(null);
    };

    // Custom Workflow Task Add/Remove Logic
    const addCustomTask = (ctId) => {
        setContentTypes(prev => prev.map(ct => {
            if (ct.id !== ctId || !ct.isCustom || ct.tasks.length >= 4) return ct;
            const newTasks = [...ct.tasks];
            const scheduleTask = newTasks.pop(); 

            const newTask = {
                id: getUniqueId('task'),
                name: `Phase ${newTasks.length + 1}`,
                iconName: 'Search',
                minutes: 30,
                advanceWeeks: scheduleTask.advanceWeeks + 1,
                isSplitable: true,
                minChunkSize: 15,
                inertia: 'medium',
                allowedZones: ct.tasks[0].allowedZones || zones.map(z => z.id),
                isEditable: true
            };
            
            newTasks.push(newTask);
            newTasks.push(scheduleTask);

            const baseMin = ct.isLive ? 0 : 1;
            newTasks[newTasks.length - 1].advanceWeeks = Math.max(newTasks[newTasks.length - 1].advanceWeeks, baseMin);
            
            for (let i = newTasks.length - 2; i >= 0; i--) {
                newTasks[i].advanceWeeks = Math.max(newTasks[i].advanceWeeks, newTasks[i+1].advanceWeeks + 1);
            }
            
            return { ...ct, tasks: newTasks };
        }));
    };

    const removeCustomTask = (ctId, taskId) => {
        setContentTypes(prev => prev.map(ct => {
            if (ct.id !== ctId || !ct.isCustom || ct.tasks.length <= 2) return ct;
            const newTasks = ct.tasks.filter(t => t.id !== taskId);
            
            const baseMin = ct.isLive ? 0 : 1;
            newTasks[newTasks.length - 1].advanceWeeks = Math.max(newTasks[newTasks.length - 1].advanceWeeks, baseMin);
            
            for (let i = newTasks.length - 2; i >= 0; i--) {
                newTasks[i].advanceWeeks = Math.max(newTasks[i].advanceWeeks, newTasks[i+1].advanceWeeks + 1);
            }

            return { ...ct, tasks: newTasks };
        }));
    };

    const handleLeadTimeChange = (ctId, taskIdx, newValue) => {
        setContentTypes(prev => prev.map(ct => {
            if (ct.id !== ctId) return ct;
            let newTasks = [...ct.tasks];
            
            const baseMin = ct.isLive ? 0 : 1;
            const minAllowed = newTasks.length - 1 - taskIdx + baseMin;
            
            let val = Math.max(minAllowed, newValue);
            newTasks[taskIdx] = { ...newTasks[taskIdx], advanceWeeks: val };
            
            for (let i = taskIdx - 1; i >= 0; i--) {
                if (newTasks[i].advanceWeeks <= newTasks[i+1].advanceWeeks) {
                    newTasks[i] = { ...newTasks[i], advanceWeeks: newTasks[i+1].advanceWeeks + 1 };
                }
            }
            
            for (let i = taskIdx + 1; i < newTasks.length; i++) {
                if (newTasks[i].advanceWeeks >= newTasks[i-1].advanceWeeks) {
                    newTasks[i] = { ...newTasks[i], advanceWeeks: newTasks[i-1].advanceWeeks - 1 };
                }
            }
            
            return { ...ct, tasks: newTasks };
        }));
    };

    const updateTask = (contentId, taskId, field, value) => {
        setContentTypes(contentTypes.map(c => {
        if (c.id === contentId) {
            const updatedTasks = c.tasks.map(t => {
            if (t.id === taskId) {
                let newVal = value;
                if (field === 'minChunkSize' && value > t.minutes) newVal = t.minutes;
                if (field === 'minutes' && t.minChunkSize > value) return { ...t, [field]: newVal, minChunkSize: newVal };
                return { ...t, [field]: newVal };
            }
            return t;
            });
            return { ...c, tasks: updatedTasks };
        }
        return c;
        }));
    };

    const toggleTaskZone = (contentId, taskId, zoneId) => {
        setContentTypes(contentTypes.map(c => {
        if (c.id === contentId) {
            const updatedTasks = c.tasks.map(t => {
            if (t.id === taskId) {
                const currentZones = t.allowedZones || [];
                const newZones = currentZones.includes(zoneId) ? currentZones.filter(z => z !== zoneId) : [...currentZones, zoneId];
                return { ...t, allowedZones: newZones };
            }
            return t;
            });
            return { ...c, tasks: updatedTasks };
        }
        return c;
        }));
    };

    const toggleExpanded = (typeId) => {
        if (expandedTypeId === typeId) setExpandedTypeId(null);
        else setExpandedTypeId(typeId);
    };

    const runStakingProtocol = useCallback((countsObj, currentZones = zones, currentContentTypes = contentTypes, capLimit = 100) => {
        if (!currentZones || !currentContentTypes) return { dailySchedule: {}, wasSuccessful: true, zoneUsage: {}, unscheduled: [] };
        const dailySchedule = {};
        const dailyLimit = {}; 
        const remaining = {};
        currentZones.forEach(z => {
            dailySchedule[z.id] = Array.from({ length: 7 }, () => []);
            dailyLimit[z.id] = [...z.weeklyCapacity];
            remaining[z.id] = [...dailyLimit[z.id]];
        });

        const addEntry = (zoneId, dayIdx, label, minutes, isSplitable, extraData) => {
            const list = dailySchedule[zoneId][dayIdx];
            const existing = list.find(e => e.label === label);
            if (existing) { existing.minutes += minutes; if (!isSplitable) existing.count += 1; } 
            else { list.push({ label, minutes, isSplitable, count: isSplitable ? 0 : 1, ...extraData }); }
        };

        const allTasks = [];
        currentContentTypes.forEach(ct => {
            const count = countsObj[ct.id] || 0;
            for (let i = 0; i < count; i++) {
                const videoId = `${ct.id}-${i}`; 
                ct.tasks.forEach((task, wIdx) => {
                    const minutes = parseInt(task.minutes) || 0;
                    if (minutes <= 0) return;
                    const weeksAhead = parseInt(task.advanceWeeks) || 0;
                    allTasks.push({
                        ...task, typeId: ct.id, typeName: ct.name, targetWeek: 1 + weeksAhead,
                        seriesIcon: ct.iconName, taskIcon: task.iconName,
                        label: `${ct.name}: ${task.name} (Week ${1 + weeksAhead})`,
                        minutesNeeded: minutes, videoId, workflowIdx: wIdx,
                        totalSteps: ct.tasks.length, inertia: task.inertia || 'minor', isScheduled: false 
                    });
                });
            }
        });

        const bounds = {};
        allTasks.forEach(t => {
            if (!bounds[t.videoId]) bounds[t.videoId] = {};
            if (!bounds[t.videoId][t.targetWeek]) bounds[t.videoId][t.targetWeek] = { minDay: 0, maxDay: 6 };
        });

        const updateBounds = (videoId, targetWeek, workflowIdx, scheduledDays) => {
            if (!scheduledDays || scheduledDays.length === 0) return;
            const startDay = Math.min(...scheduledDays);
            const endDay = Math.max(...scheduledDays);
            allTasks.forEach(t => {
                if (t.videoId === videoId && t.targetWeek === targetWeek) {
                    const b = bounds[videoId][targetWeek];
                    if (t.workflowIdx < workflowIdx) b.maxDay = Math.min(b.maxDay, startDay); 
                    else if (t.workflowIdx > workflowIdx) b.minDay = Math.max(b.minDay, endDay);
                }
            });
        };

        const inertiaOrder = { 'high': 3, 'medium': 2, 'minor': 1 };
        allTasks.sort((a, b) => {
            if (inertiaOrder[a.inertia] !== inertiaOrder[b.inertia]) return inertiaOrder[b.inertia] - inertiaOrder[a.inertia];
            const aZones = a.allowedZones?.length || 0;
            const bZones = b.allowedZones?.length || 0;
            if (aZones !== bZones) return aZones - bZones;
            if (a.workflowIdx !== b.workflowIdx) return a.workflowIdx - b.workflowIdx;
            return 0;
        });

        const zoneDemand = {};
        currentZones.forEach(z => zoneDemand[z.id] = 0);
        allTasks.forEach(task => {
            if (!task.allowedZones) return;
            task.allowedZones.forEach(zid => { if (zoneDemand[zid] !== undefined) zoneDemand[zid] += task.minutesNeeded; });
        });

        const unscheduled = [];
        const preferred = {}; 

        allTasks.forEach(task => {
            const b = bounds[task.videoId][task.targetWeek];
            const allowedZones = task.allowedZones || [];
            const minDay = b.minDay;
            const maxDay = b.maxDay;

            if (minDay > maxDay) { unscheduled.push({task}); return; }

            const extraData = {
                seriesName: task.typeName, taskName: task.name,
                targetWeek: task.targetWeek, seriesIcon: task.seriesIcon, taskIcon: task.taskIcon
            };

            if (!task.isSplitable) {
                let best = null;
                let bestScore = -100000; 

                for (let d = minDay; d <= maxDay; d++) {
                    let availBefore = 0;
                    for(let i=0; i<=d; i++) currentZones.forEach(z => availBefore += remaining[z.id][i]);
                    const reqBefore = allTasks.filter(t => t.videoId === task.videoId && t.workflowIdx < task.workflowIdx && !t.isScheduled).reduce((s,t)=>s+t.minutesNeeded, 0);
                    if (availBefore - task.minutesNeeded < reqBefore) continue; 

                    let availAfter = 0;
                    for(let i=d; i<=6; i++) currentZones.forEach(z => availAfter += remaining[z.id][i]);
                    const reqAfter = allTasks.filter(t => t.videoId === task.videoId && t.workflowIdx > task.workflowIdx && !t.isScheduled).reduce((s,t)=>s+t.minutesNeeded, 0);
                    if (availAfter - task.minutesNeeded < reqAfter) continue;

                    for (const zid of allowedZones) {
                        const rem = remaining[zid][d];
                        if (rem >= task.minutesNeeded) {
                            let score = rem;
                            score += (6 - d) * 100; 
                            score -= (zoneDemand[zid] || 0); 
                            const pref = preferred[task.name];
                            if (pref) {
                                if (pref.day === d) score += 10000; 
                                if (pref.zoneId === zid) score += 5000; 
                            }
                            if (score > bestScore) { bestScore = score; best = { zid, d }; }
                        }
                    }
                }

                if (best) {
                    remaining[best.zid][best.d] -= task.minutesNeeded;
                    addEntry(best.zid, best.d, task.label, task.minutesNeeded, false, extraData);
                    if (!preferred[task.name]) preferred[task.name] = { day: best.d, zoneId: best.zid };
                    updateBounds(task.videoId, task.targetWeek, task.workflowIdx, [best.d]);
                    task.isScheduled = true;
                } else { unscheduled.push({task}); }
            } else {
                let remNeed = task.minutesNeeded;
                const minChunk = Math.max(1, parseInt(task.minChunkSize)||1);
                const scheduledDays = [];
                let stuck = false;

                while (remNeed > 0 && !stuck) {
                    let best = null;
                    let bestScore = -100000;
                    const requireAtLeast = remNeed >= minChunk ? minChunk : remNeed;

                    for (let d = minDay; d <= maxDay; d++) {
                        let availBefore = 0;
                        for(let i=0; i<=d; i++) currentZones.forEach(z => availBefore += remaining[z.id][i]);
                        const reqBefore = allTasks.filter(t => t.videoId === task.videoId && t.workflowIdx < task.workflowIdx && !t.isScheduled).reduce((s,t)=>s+t.minutesNeeded, 0);
                        if (availBefore - requireAtLeast < reqBefore) continue; 

                        let availAfter = 0;
                        for(let i=d; i<=6; i++) currentZones.forEach(z => availAfter += remaining[z.id][i]);
                        const reqAfter = allTasks.filter(t => t.videoId === task.videoId && t.workflowIdx > task.workflowIdx && !t.isScheduled).reduce((s,t)=>s+t.minutesNeeded, 0);
                        if (availAfter - requireAtLeast < reqAfter) continue;

                        for (const zid of allowedZones) {
                            const rem = remaining[zid][d];
                            if (rem >= requireAtLeast) {
                                let score = rem;
                                score += (6 - d) * 100;
                                score -= (zoneDemand[zid] || 0);
                                const pref = preferred[task.name];
                                if (pref) {
                                    if (pref.day === d) score += 10000; 
                                    if (pref.zoneId === zid) score += 5000; 
                                }
                                if (score > bestScore) { bestScore = score; best = { zid, d, rem }; }
                            }
                        }
                    }

                    if (!best) { stuck = true; break; }

                    let alloc = Math.min(remNeed, best.rem);
                    remaining[best.zid][best.d] -= alloc;
                    addEntry(best.zid, best.d, task.label, alloc, true, extraData);
                    remNeed -= alloc;
                    scheduledDays.push(best.d);

                    if (!preferred[task.name]) preferred[task.name] = { day: best.d, zoneId: best.zid };
                }

                if (remNeed <= 0) task.isScheduled = true;
                if (remNeed > 0) unscheduled.push({task});
                if (scheduledDays.length > 0) updateBounds(task.videoId, task.targetWeek, task.workflowIdx, scheduledDays);
            }
        });

        const zoneUsage = {};
        let capacityExceeded = false;
        
        currentZones.forEach(z => {
            const initialTotal = dailyLimit[z.id].reduce((a,b)=>a+b,0);
            const remainingTotal = remaining[z.id].reduce((a,b)=>a+b,0);
            const used = initialTotal - remainingTotal;
            const percentage = initialTotal > 0 ? Math.round((used/initialTotal) * 100) : 0;
            if (percentage > capLimit) capacityExceeded = true;
            zoneUsage[z.id] = { used, total: initialTotal, percentage };
        });

        return { dailySchedule, wasSuccessful: unscheduled.length === 0 && !capacityExceeded, zoneUsage, unscheduled };
    }, [zones, contentTypes]);

    const calculateOptimalPinnedWeek = useCallback((weights = seriesWeights, currentCapMode = capacityMode) => {
        let workingWeights = { ...weights };
        // Force 100% weight if there is only 1 series
        if (contentTypes.length === 1) {
            workingWeights = { [contentTypes[0].id]: 100 };
        }

        setIsCalculating(true);
        setSeriesWeights(workingWeights);

        setTimeout(() => {
            const activeTypes = contentTypes.filter(ct => workingWeights[ct.id] > 0);
            if (activeTypes.length === 0) {
                const zeros = {}; contentTypes.forEach(c => zeros[c.id] = 0);
                setScheduledCounts(zeros); setIsCalculating(false); return;
            }

            const totalTime = zones.reduce((acc, z) => acc + z.weeklyCapacity.reduce((a, b) => a + b, 0), 0);
            const totalWeight = activeTypes.reduce((acc, ct) => acc + workingWeights[ct.id], 0);

            const costs = {};
            activeTypes.forEach(ct => { costs[ct.id] = ct.tasks.reduce((acc, t) => acc + parseInt(t.minutes || 0), 0); });

            const rawCounts = {};
            let minRaw = Infinity;

            activeTypes.forEach(ct => {
                if (costs[ct.id] > 0) {
                    const allocatedTime = totalTime * (workingWeights[ct.id] / totalWeight);
                    rawCounts[ct.id] = allocatedTime / costs[ct.id];
                    if (rawCounts[ct.id] > 0 && rawCounts[ct.id] < minRaw) minRaw = rawCounts[ct.id];
                } else { rawCounts[ct.id] = 0; }
            });

            const setDefinition = {};
            contentTypes.forEach(ct => {
                if (rawCounts[ct.id] > 0) setDefinition[ct.id] = Math.max(1, Math.round(rawCounts[ct.id] / minRaw));
                else setDefinition[ct.id] = 0;
            });

            let bestCounts = {};
            contentTypes.forEach(c => bestCounts[c.id] = 0);
            let sets = 1;
            const capLimit = currentCapMode === 'recommended' ? 70 : 100;

            while (sets <= 100) {
                const testCounts = {};
                contentTypes.forEach(ct => testCounts[ct.id] = sets * setDefinition[ct.id]);
                const result = runStakingProtocol(testCounts, zones, contentTypes, capLimit);
                if (result.wasSuccessful) { bestCounts = testCounts; sets++; } 
                else { break; }
            }

            const sortedActiveTypes = [...activeTypes].sort((a, b) => workingWeights[b.id] - workingWeights[a.id]);
            let addedInPhase2 = true;
            let phase2Safety = 0;

            while (addedInPhase2 && phase2Safety < 200) {
                addedInPhase2 = false;
                phase2Safety++;
                for (const ct of sortedActiveTypes) {
                    const testCounts = { ...bestCounts };
                    testCounts[ct.id] += 1;
                    const result = runStakingProtocol(testCounts, zones, contentTypes, capLimit);
                    if (result.wasSuccessful) { bestCounts = testCounts; addedInPhase2 = true; break; }
                }
            }

            setScheduledCounts(bestCounts);
            setIsCalculating(false);
        }, 50);
    }, [contentTypes, zones, runStakingProtocol, capacityMode]);

    const handleCapacityModeChange = (mode) => { setCapacityMode(mode); calculateOptimalPinnedWeek(seriesWeights, mode); };

    const updateScheduledCount = (typeId, value) => {
        setIsCalculating(true);
        setTimeout(() => { setScheduledCounts(prev => ({ ...prev, [typeId]: Math.max(0, value) })); setIsCalculating(false); }, 50);
    };

    const setMax = (typeId) => {
        setIsCalculating(true);
        setTimeout(() => {
            setScheduledCounts(prev => {
                let maxFound = prev[typeId] || 0;
                let testVal = maxFound + 1;
                const capLimit = capacityMode === 'recommended' ? 70 : 100;
                while (testVal <= 100) {
                    const testCounts = { ...prev, [typeId]: testVal };
                    const result = runStakingProtocol(testCounts, zones, contentTypes, capLimit);
                    if (result.wasSuccessful) { maxFound = testVal; testVal++; } 
                    else { break; }
                }
                return { ...prev, [typeId]: maxFound };
            });
            setIsCalculating(false);
        }, 50);
    };
    
    const schedule = useMemo(() => {
        if (step !== 5) return { dailySchedule: {}, zoneUsage: {}, wasSuccessful: true, unscheduled: [] };
        const capLimit = capacityMode === 'recommended' ? 70 : 100;
        return runStakingProtocol(scheduledCounts, zones, contentTypes, capLimit);
    }, [step, scheduledCounts, runStakingProtocol, capacityMode, zones, contentTypes]);

    const currentValidation = useMemo(() => {
        if (step === 3 && contentTypes.length === 0) return { isValid: false, message: 'Please create at least one video series.' };
        if (step === 3) {
            for (const ct of contentTypes) {
                if (ct.tasks.some(t => !t.name.trim())) return { isValid: false, message: `All tasks in "${ct.name}" must have a name.` };
            }
        }
        if (step === 4) {
            for (const ct of contentTypes) {
                for (const task of ct.tasks) {
                    if (!task.allowedZones || task.allowedZones.length === 0) return { isValid: false, message: `Please assign at least one zone for each task.` };
                }
            }
        }
        return { isValid: true, message: '' };
    }, [contentTypes, step]);

    const progress = step > 0 ? ((step) / totalSteps) * 100 : 0;

    if (!isClient) return (<div className="flex w-full h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]" /></div>);
    
    const isNewSeriesIconUsed = contentTypes.some(c => c.iconName === newSeriesIcon);

    return (
        <TooltipProvider>
        <GlobalStyles />
        <div className="min-h-screen bg-[hsl(var(--background))] selection:bg-[hsl(var(--primary))]/20 selection:text-[hsl(var(--primary))] pb-20 font-sans">
        
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
            {step === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fadeIn px-4 py-12">
                <div className="max-w-3xl w-full text-center">
                <h1 className="text-4xl md:text-6xl font-black text-[hsl(var(--foreground))] mb-4">
                    Pinned <span className="text-[hsl(var(--primary))]">Week</span> Designer
                </h1>
                <p className="text-xl md:text-2xl text-[hsl(var(--muted-foreground))] mb-10 font-headline">
                    Unlock sustainable growth with the <span className="font-bold text-[hsl(var(--foreground))]">Pinned Week System</span>.
                </p>
                <div className="bg-[hsl(var(--card))]/50 backdrop-blur-sm rounded-3xl border border-[hsl(var(--border))] shadow-lg text-left mb-12">
                    <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="p-8 text-lg font-bold text-[hsl(var(--primary))] hover:no-underline">
                        What is the Pinned Week System?
                        </AccordionTrigger>
                        <AccordionContent className="px-8 pb-8 pt-0">
                        <p className="text-[hsl(var(--foreground))]/80 leading-relaxed">
                            The <strong>Pinned Week System</strong> turns content creation into a predictable routine. Instead of relying on motivation, you lock in a single, repeatable weekly schedule that fits your real life. By assigning specific days or time blocks to tasks like scripting, shooting, and editing, you build a resilient pipeline. This system creates stability, reduces burnout, and makes consistency automatic.
                        </p>
                        </AccordionContent>
                    </AccordionItem>
                    </Accordion>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div onClick={handleStartBlank} className="group bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center h-full border-2 border-transparent hover:-translate-y-1">
                        <div className="bg-black/10 p-4 rounded-2xl mb-4"><Sparkles size={32} className="text-white" /></div>
                        <h2 className="text-xl font-bold mb-1">Start from Scratch</h2>
                        <p className="opacity-80 text-sm">Build your custom production schedule.</p>
                    </div>
                    <div onClick={handleStartPreset} className="group bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] p-6 rounded-3xl shadow-lg border-2 border-transparent hover:border-[hsl(var(--primary))]/50 hover:shadow-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center h-full hover:-translate-y-1">
                        <div className="bg-[hsl(var(--muted))] p-4 rounded-2xl mb-4"><Rocket size={32} className="text-[hsl(var(--muted-foreground))]" /></div>
                        <h2 className="text-xl font-bold mb-1">Use an Example</h2>
                        <p className="text-[hsl(var(--muted-foreground))] text-sm">Load Jaimin's default workflows.</p>
                    </div>
                </div>
                
                <FeedbackTag />

                </div>
            </div>
            )}
            
            {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
                <StepHeader currentStep={1} />
                <JaiminSuggestion>
                    Keep it simple. Do not over-complicate your zones. Divide your day into 2 or a maximum of 3 meaningful zones (e.g., Home, Office, Commute).
                </JaiminSuggestion>
                <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
                    <AccordionItem value="item-1" className="border-b-0">
                        <Card className="bg-blue-50 border-blue-200 overflow-hidden">
                            <AccordionTrigger className="p-6 text-left w-full hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Layers size={22} /></div>
                                    <CardTitle className="text-blue-900">What are Zones?</CardTitle>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-0">
                                <p className="text-blue-800/80">Zones represent the different environments where you work, each with its own constraints. For example, you can't shoot a high-quality video while commuting on a bus, but you might be able to script.</p>
                                <p className="mt-2 text-blue-800/80">By defining zones (like <strong>Office</strong>, <strong>Home</strong>, or <strong>Commute</strong>) and later telling the system which tasks can be done in each, the algorithm can create a much more realistic and achievable schedule for your Pinned Week.</p>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                </Accordion>
                <div className="flex justify-center pt-8">
                <div className="bg-[hsl(var(--muted))] p-1 rounded-xl flex gap-1">
                    <Button onClick={() => handleModeSwitch('normal')} variant={zoneMode === 'normal' ? 'default' : 'ghost'} className={`rounded-lg px-6 py-2 h-auto flex items-center gap-2 transition-all ${zoneMode === 'normal' ? 'shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]/50'}`}><Sun size={16} /> Normal</Button>
                    <Button onClick={() => handleModeSwitch('advance')} variant={zoneMode === 'advance' ? 'default' : 'ghost'} className={`rounded-lg px-6 py-2 h-auto flex items-center gap-2 transition-all ${zoneMode === 'advance' ? 'shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]/50'}`}><Grid size={16} /> Advance</Button>
                </div>
                </div>
                <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
                {zoneMode === 'normal' ? (
                    <Card className="text-center flex flex-col items-center p-8">
                        <div className="bg-[hsl(var(--primary))]/10 p-6 rounded-full mb-4"><Sun size={48} className="text-[hsl(var(--primary))]" /></div>
                        <CardTitle className="text-2xl mb-2">Single Zone: "Day"</CardTitle>
                        <CardDescription>In Normal mode, all your available time is grouped into one simple bucket per day.</CardDescription>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {zones.map((zone) => (
                        <Card key={zone.id} className="flex gap-3 items-center p-4 hover:border-[hsl(var(--primary))]/50 transition-colors">
                            <div className="bg-[hsl(var(--primary))]/10 p-3 rounded-xl text-[hsl(var(--primary))]"><Clock size={20} /></div>
                            <div className="flex-1"><Input value={zone.name} onChange={(e) => updateZoneName(zone.id, e.target.value)} placeholder="Zone Name" className="font-medium text-[hsl(var(--foreground))] bg-transparent outline-none border-0 text-base" /></div>
                            <Button variant="ghost" size="icon" onClick={() => removeZone(zone.id)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"><Trash2 size={18} /></Button>
                        </Card>
                        ))}
                        <Button variant="outline" onClick={addZone} className="w-full py-6 border-dashed border-2"><Plus size={20} className="mr-2" /> Add Another Zone</Button>
                    </div>
                )}
                </div>
            </div>
            )}

            {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
                <StepHeader currentStep={2} />
                <div className="space-y-6">
                {zones.map((zone) => (
                    <Card key={zone.id} className="overflow-visible">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <CardTitle className="text-xl flex items-center gap-3"><div className="w-2 h-8 bg-[hsl(var(--primary))] rounded-full"></div>{zone.name}</CardTitle>
                                <Button variant="ghost" onClick={() => copyMondayToAll(zone.id)} size="sm"><Copy size={14} className="mr-2" /> Copy Mon to All</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                                <div key={day} className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase text-center">{day}</Label>
                                    <div className="relative">
                                        <Input type="number" min="0" value={zone.weeklyCapacity[idx]} onChange={(e) => updateZoneCapacity(zone.id, idx, e.target.value)} className="bg-[hsl(var(--muted))]/50 text-center font-bold text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] pr-8" />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))] pointer-events-none">min</span>
                                    </div>
                                </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                </div>
            </div>
            )}

            {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
                <StepHeader currentStep={3} />
                <JaiminSuggestion>
                    If you don't know where to start, begin with just <strong>1 video series</strong>. It is highly recommended not to take on more than 2 at once to maintain consistency and avoid burnout.
                </JaiminSuggestion>
                
                <Card className="max-w-2xl mx-auto border-t-4 border-t-[hsl(var(--primary))] shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg">Create a Video Series</CardTitle>
                            <CardDescription>e.g., Long Form, Shorts, Podcast, Live Stream</CardDescription>
                        </div>
                        {contentTypes.length >= 3 && (
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-2 py-1 rounded-md mt-1">
                                Max 3 Series Limit
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                            <Input 
                                placeholder={contentTypes.length >= 3 ? "Maximum 3 series allowed" : "Series Name..."} 
                                value={newSeriesName} 
                                onChange={e => setNewSeriesName(e.target.value)} 
                                className="flex-1 h-12 text-base font-medium"
                                disabled={contentTypes.length >= 3}
                            />
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className={contentTypes.length >= 3 ? "pointer-events-none opacity-50" : ""}>
                                    <SeriesIconPicker 
                                        value={newSeriesIcon} 
                                        onValueChange={setNewSeriesIcon} 
                                        usedIcons={contentTypes.map(c => c.iconName)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start gap-3">
                            <div className="w-full sm:flex-1">
                                <Select value={newSeriesPreset} onValueChange={setNewSeriesPreset}>
                                    <SelectTrigger className="h-auto min-h-12 py-3 bg-[hsl(var(--muted))]/30">
                                        <span className="font-semibold text-left">
                                            {WORKFLOW_PRESETS.find(p => p.id === newSeriesPreset)?.name || "Select Workflow"}
                                        </span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WORKFLOW_PRESETS.map(preset => {
                                            let itemClass = "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] border-2 border-transparent mb-1";
                                            if (preset.id === 'custom') {
                                                itemClass = "border-2 border-[hsl(var(--primary))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--primary))]/5 mb-2";
                                            } else if (preset.id === 'live') {
                                                itemClass = "border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90 mb-2";
                                            }
                                            
                                            return (
                                                <SelectItem key={preset.id} value={preset.id} className={itemClass}>
                                                    <div className="flex flex-col w-full text-left gap-0.5 py-1">
                                                        <span className={cn("font-bold text-sm", preset.id === 'live' ? "text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--primary))]")}>{preset.name}</span>
                                                        <span className={cn("text-[11px] font-bold opacity-90", preset.id === 'live' ? "text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--foreground))]")}>
                                                            {preset.tasks.map(t => t.name).join(' ➔ ')}
                                                        </span>
                                                        <span className={cn("text-[10px] whitespace-normal leading-tight mt-1 pr-2 max-w-sm", preset.id === 'live' ? "text-[hsl(var(--primary-foreground))]/90" : "text-[hsl(var(--muted-foreground))]")}>
                                                            <span className={cn("font-semibold opacity-80", preset.id === 'live' ? "text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--foreground))]")}>Best for:</span> {preset.recommended}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={addNewSeries} disabled={!newSeriesName.trim() || contentTypes.length >= 3 || isNewSeriesIconUsed} className="w-full sm:w-auto h-auto min-h-12 px-6 font-bold shadow-md">
                                <Plus size={18} className="mr-2" /> Add Series
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto mt-8">
                    {contentTypes.map(ct => {
                    const isExpanded = expandedTypeId === ct.id;
                    const SeriesIcon = SERIES_ICONS[ct.iconName] || Video;
                    
                    return (
                        <Card key={ct.id} className={`${!isExpanded && 'cursor-pointer hover:bg-[hsl(var(--muted))]/30 transition-colors'}`} onClick={!isExpanded ? () => toggleExpanded(ct.id) : undefined}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md">
                                        <SeriesIcon size={24} />
                                    </div>
                                    <CardTitle className="text-2xl md:text-3xl text-[hsl(var(--foreground))] font-black">{ct.name}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeSeries(ct.id); }} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"><Trash2 size={20}/></Button>
                                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); toggleExpanded(ct.id); }} className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">{isExpanded ? <ChevronsUp size={24} /> : <ChevronsUpDown size={24} />}</Button>
                                </div>
                            </CardHeader>
                        {isExpanded && (
                            <CardContent className="animate-fadeIn mt-4">
                                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-6 max-w-2xl mx-auto text-center bg-[hsl(var(--background))] p-3 rounded-lg border border-[hsl(var(--border))] shadow-sm">
                                    <Info size={14} className="inline mr-2 text-[hsl(var(--primary))] relative -top-0.5" />
                                    {ct.isCustom ? "Customize your tasks below." : "Adjust the Lead Time (Weeks) below."} The timeline mathematically enforces a minimum 1-week gap between sequential tasks.
                                </p>
                                <div className="flex flex-col max-w-2xl mx-auto">
                                    <div className="bg-[hsl(var(--muted))]/30 p-4 sm:p-6 rounded-3xl border border-[hsl(var(--border))] relative shadow-inner">
                                        <div className="absolute top-10 bottom-10 left-9 sm:left-11 w-0.5 bg-[hsl(var(--border))] z-0"></div>
                                        <div className="space-y-4 relative z-10">
                                        {ct.tasks.map((task, idx) => {
                                            const Icon = TASK_ICONS[task.iconName] || Clock;
                                            return (
                                                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-[hsl(var(--card))] p-3 pl-4 sm:pl-5 rounded-2xl border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-shadow gap-4 sm:gap-2 relative">
                                                    
                                                    {task.isEditable ? (
                                                        <div className="flex items-center gap-3 flex-1 pr-2">
                                                            <TaskIconPicker 
                                                                value={task.iconName} 
                                                                onValueChange={(val) => updateTask(ct.id, task.id, 'iconName', val)}
                                                                usedIcons={ct.tasks.map(t => t.iconName).filter(i => i !== task.iconName)}
                                                            />
                                                            <Input 
                                                                value={task.name} 
                                                                onChange={(e) => updateTask(ct.id, task.id, 'name', e.target.value)}
                                                                className="h-10 text-base font-bold flex-1 border-[hsl(var(--input))] focus:ring-[hsl(var(--primary))]"
                                                                placeholder="Task Name"
                                                            />
                                                            {ct.isCustom && ct.tasks.length > 2 && (
                                                                <Button variant="ghost" size="icon" onClick={() => removeCustomTask(ct.id, task.id)} className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 shrink-0">
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className='flex items-center gap-4 flex-1'>
                                                            <div className="bg-[hsl(var(--muted))] p-2 rounded-full border border-[hsl(var(--border))] shadow-sm">
                                                                <Icon size={18} className="text-[hsl(var(--primary))]" />
                                                            </div>
                                                            <span className='text-lg font-bold text-[hsl(var(--foreground))]'>{task.name}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col items-start sm:items-end gap-1.5 ml-14 sm:ml-0">
                                                        <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Lead Time</Label>
                                                        <div className="flex items-center gap-1 bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] rounded-xl p-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[hsl(var(--background))]" onClick={() => handleLeadTimeChange(ct.id, idx, task.advanceWeeks - 1)}><Minus size={14}/></Button>
                                                            <span className="text-base font-black w-10 text-center text-[hsl(var(--foreground))]">{task.advanceWeeks} w</span>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-[hsl(var(--primary))] hover:bg-[hsl(var(--background))]" onClick={() => handleLeadTimeChange(ct.id, idx, task.advanceWeeks + 1)}><Plus size={14}/></Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        </div>
                                        {ct.isCustom && ct.tasks.length < 4 && (
                                            <div className="flex justify-center mt-6">
                                                <Button variant="outline" size="sm" onClick={() => addCustomTask(ct.id)} className="border-dashed border-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))]/50">
                                                    <Plus size={16} className="mr-2" /> Add Custom Task
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        )}
                        </Card>
                    )
                    })}
                </div>
            </div>
            )}

            {step === 4 && (
            <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
                <StepHeader currentStep={4} />
                <JaiminSuggestion>
                    <ul className="list-disc pl-4 space-y-1.5">
                        <li>Use the <strong>Splitable</strong> feature only if it's meaningful, and avoid making the minimum chunk size too small (recommended: no less than 20 mins).</li>
                        <li>For tasks that require the most mental energy to get into the mood or start working, give them the <strong>High Inertia</strong> ranking.</li>
                    </ul>
                </JaiminSuggestion>
                <div className="space-y-8">
                {contentTypes.map((ct) => {
                    if (ct.tasks.length === 0) return null;
                    const isExpanded = expandedTypeId === ct.id;
                    const SeriesIcon = SERIES_ICONS[ct.iconName] || Video;
                    return (
                    <Card key={ct.id} className={`relative overflow-hidden ${!isExpanded && 'cursor-pointer hover:bg-[hsl(var(--muted))]/30 transition-colors'}`} onClick={!isExpanded ? () => toggleExpanded(ct.id) : undefined}>
                        <CardHeader className="flex-row items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md">
                                    <SeriesIcon size={24} />
                                </div>
                                <CardTitle className="text-2xl md:text-3xl text-[hsl(var(--foreground))] font-black">{ct.name}</CardTitle>
                            </div>
                            <Button variant="ghost" onClick={() => toggleExpanded(ct.id)} className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">{isExpanded ? <ChevronsUp size={24} /> : <ChevronsUpDown size={24} />}</Button>
                        </CardHeader>
                        {isExpanded && (
                            <CardContent className="space-y-5 animate-fadeIn mt-6">
                            {ct.tasks.map((task, index) => {
                                const TaskIcon = TASK_ICONS[task.iconName] || Clock;
                                return (
                                <Card key={task.id} className="p-5 flex flex-col gap-5 relative shadow-sm bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-[hsl(var(--background))] p-2.5 rounded-xl border border-[hsl(var(--border))] shadow-sm">
                                                <TaskIcon size={20} className="text-[hsl(var(--muted-foreground))]" />
                                            </div>
                                            <span className="font-bold text-[hsl(var(--foreground))] text-xl tracking-tight">{task.name}</span>
                                        </div>
                                        <span className="text-xs font-bold bg-[hsl(var(--muted))] px-3 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] shadow-inner">Lead Time: {task.advanceWeeks}w</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[hsl(var(--background))] rounded-2xl p-4 sm:p-5 border border-[hsl(var(--border))] shadow-sm items-start">
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Duration</Label>
                                            <div className="flex items-center gap-2 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-xl px-3 py-2 h-11">
                                                <Clock size={16} className="text-[hsl(var(--primary))]" />
                                                <Input type="number" value={task.minutes} onChange={(e) => updateTask(ct.id, task.id, 'minutes', parseInt(e.target.value)||0)} className="text-base font-bold text-[hsl(var(--foreground))] w-full outline-none bg-transparent border-0 h-auto p-0" />
                                                <span className="text-sm text-[hsl(var(--muted-foreground))] font-bold">min</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col justify-start pt-6 h-full">
                                            <label className="flex items-center gap-3 cursor-pointer h-11 px-2 rounded-xl hover:bg-[hsl(var(--muted))]/50 transition-colors border border-transparent hover:border-[hsl(var(--border))]">
                                                <Checkbox checked={task.isSplitable} onChange={(e) => updateTask(ct.id, task.id, 'isSplitable', e.target.checked)} className="w-5 h-5 rounded-md" />
                                                <span className="text-sm font-bold text-[hsl(var(--foreground))]">Splitable?</span>
                                            </label>
                                        </div>
                                        
                                        {task.isSplitable && (
                                        <div className="flex flex-col gap-1.5 animate-fadeIn">
                                            <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Min Chunk</Label>
                                            <div className="flex items-center gap-2 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-xl px-3 py-2 h-11">
                                                <Scissors size={16} className="text-[hsl(var(--muted-foreground))]" />
                                                <Input type="number" value={task.minChunkSize} onChange={(e) => updateTask(ct.id, task.id, 'minChunkSize', parseInt(e.target.value)||1)} className="text-base font-bold text-[hsl(var(--foreground))] w-full outline-none bg-transparent border-0 h-auto p-0" />
                                                <span className="text-sm text-[hsl(var(--muted-foreground))] font-bold">min</span>
                                            </div>
                                        </div>
                                        )}
                                        
                                        <div className="flex flex-col gap-1.5 lg:col-span-1 sm:col-span-2 relative">
                                            <div className="flex items-center gap-1">
                                                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Inertia</Label>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedInfoId(expandedInfoId === task.id ? null : task.id); }} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] p-1 transition-colors"><Info size={14} /></button>
                                            </div>
                                            <div className="flex bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-xl overflow-hidden h-11 p-1 gap-1">
                                                {['minor', 'medium', 'high'].map(level => (
                                                    <button
                                                        key={level}
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); updateTask(ct.id, task.id, 'inertia', level); }}
                                                        className={cn("text-xs font-bold flex-1 capitalize transition-all rounded-lg", task.inertia === level || (!task.inertia && level === 'minor') ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm scale-100" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))] hover:shadow-sm scale-95 opacity-70")}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                            {expandedInfoId === task.id && (
                                                <div className="absolute z-20 w-[250px] right-0 top-[calc(100%+8px)] mt-1 text-[11px] leading-relaxed text-[hsl(var(--foreground))] bg-[hsl(var(--background))] p-3 rounded-xl border border-[hsl(var(--border))] shadow-xl animate-fadeIn">
                                                    Select how much brain energy this task requires to get into the working zone. High inertia tasks will be prioritized and batched by the brain.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {zoneMode === 'advance' && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider ml-1">Allowed Zones</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {zones.map(z => (
                                                <Button key={z.id} onClick={() => toggleTaskZone(ct.id, task.id, z.id)} variant={task.allowedZones.includes(z.id) ? 'default' : 'outline'} size="sm" className="rounded-xl text-xs h-9 px-4 font-bold tracking-wide">
                                                    {z.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    )}
                                </Card>
                                );
                            })}
                            </CardContent>
                        )}
                    </Card>
                    );
                })}
                </div>
            </div>
            )}

            {step === 5 && (() => {
                const actualTimeCosts = {};
                let totalActualTime = 0;
                contentTypes.forEach(ct => {
                    const count = scheduledCounts[ct.id] || 0;
                    const costPerSet = ct.tasks.reduce((a, t) => a + parseInt(t.minutes || 0), 0);
                    const totalCost = count * costPerSet;
                    actualTimeCosts[ct.id] = totalCost;
                    totalActualTime += totalCost;
                });
                
                const totalDesiredWeight = contentTypes.reduce((acc, ct) => acc + (parseInt(seriesWeights[ct.id]) || 0), 0);

                return (
                <div className="space-y-8 animate-fadeIn relative">
                    
                    <FeedbackTag />

                    {contentTypes.length > 1 && (
                        <Card className="mb-6 border-t-4 border-t-blue-500 relative shadow-md">
                            {isCalculating && (
                                <div className="absolute inset-0 z-10 bg-[hsl(var(--background))]/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl"></div>
                            )}
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xl">Time Split Control</CardTitle>
                                <CardDescription className="text-sm font-medium">Set your desired percentage of time for each video series.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-4 max-w-4xl mx-auto py-2">
                                    <div className="grid grid-cols-1 gap-4">
                                        {contentTypes.map(ct => {
                                            const SeriesIcon = SERIES_ICONS[ct.iconName] || Video;
                                            const actualPct = totalActualTime > 0 ? Math.round((actualTimeCosts[ct.id] / totalActualTime) * 100) : 0;
                                            const val = seriesWeights[ct.id] === 0 ? '0' : (seriesWeights[ct.id] || '');

                                            return (
                                                <div key={ct.id} className="flex items-center justify-between gap-4 p-4 sm:p-5 bg-[hsl(var(--muted))]/20 rounded-2xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/30 transition-colors">
                                                    <div className="flex items-center gap-4 flex-1 font-bold text-[hsl(var(--foreground))] text-base sm:text-lg">
                                                        <div className="p-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl shadow-md">
                                                            <SeriesIcon size={20} /> 
                                                        </div>
                                                        <span className="truncate">{ct.name}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-8">
                                                        <div className="flex flex-col gap-1.5">
                                                            <Label className="text-[10px] uppercase font-black text-[hsl(var(--muted-foreground))] tracking-wider">Desired Split</Label>
                                                            <div className="flex items-center gap-2 bg-[hsl(var(--background))] border-2 border-[hsl(var(--border))] focus-within:border-[hsl(var(--primary))] rounded-xl px-2 py-1 w-24 sm:w-28 transition-colors">
                                                                <Input 
                                                                    type="number" 
                                                                    value={val} 
                                                                    onChange={(e) => {
                                                                        const raw = e.target.value;
                                                                        const newWeights = { ...seriesWeights, [ct.id]: raw === '' ? '' : parseInt(raw) };
                                                                        setSeriesWeights(newWeights);
                                                                    }}
                                                                    className="h-10 w-full border-0 p-0 text-center font-black text-lg focus-visible:ring-0"
                                                                    min="0" max="100" placeholder="0"
                                                                />
                                                                <span className="text-base font-bold text-[hsl(var(--muted-foreground))] pr-2">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 items-end sm:items-start min-w-[120px]">
                                                            <Label className="text-[10px] uppercase font-black text-[hsl(var(--muted-foreground))] tracking-wider">Actual Scheduled</Label>
                                                            <div className="text-2xl font-black text-[hsl(var(--primary))] h-12 flex items-center bg-[hsl(var(--primary))]/10 px-4 rounded-xl">
                                                                {actualPct}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-5 sm:p-6 bg-[hsl(var(--muted))]/50 rounded-2xl border border-[hsl(var(--border))] shadow-inner">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                            <span className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Input:</span>
                                            <div className="flex items-center gap-3">
                                                <span className={cn("text-3xl font-black tracking-tight", totalDesiredWeight === 100 ? "text-green-600" : "text-[hsl(var(--destructive))]")}>
                                                    {totalDesiredWeight}%
                                                </span>
                                                {totalDesiredWeight !== 100 && (
                                                    <span className="text-xs font-bold text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-3 py-1.5 rounded-lg border border-[hsl(var(--destructive))]/20">Must equal 100%</span>
                                                )}
                                                {totalDesiredWeight === 100 && (
                                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-lg border border-green-200">Perfect!</span>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            onClick={() => calculateOptimalPinnedWeek(seriesWeights, capacityMode)} 
                                            disabled={isCalculating || totalDesiredWeight !== 100}
                                            className="w-full sm:w-auto h-14 px-8 text-lg font-bold shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <Sparkles size={20} className="mr-2" /> Reschedule
                                        </Button>
                                    </div>
                                    <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] text-center mt-2 flex items-center justify-center gap-2 bg-[hsl(var(--background))] p-3 rounded-xl border border-[hsl(var(--border))]">
                                        <Info size={16} className="text-[hsl(var(--primary))] shrink-0" />
                                        <span>Note: The software will try to match your desired split as closely as possible while maximizing total zone capacity.</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <Card className="h-full relative overflow-hidden shadow-md">
                        {isCalculating && (
                            <div className="absolute inset-0 z-10 bg-[hsl(var(--background))]/50 backdrop-blur-[1px]"></div>
                        )}
                        <CardHeader className="flex flex-col gap-4 pb-4 border-b border-[hsl(var(--border))]">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-xl">Schedule Controls</CardTitle>
                                    <CardDescription className="text-sm font-medium mt-1">Manually tweak your schedule limits.</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10" onClick={() => setShowRecommendedInfo(true)}>
                                    <Info size={18} />
                                </Button>
                            </div>
                            <div className="flex bg-[hsl(var(--muted))]/50 p-1 rounded-xl border border-[hsl(var(--border))] w-full">
                                <Button 
                                    variant="ghost" 
                                    className={cn("flex-1 h-10 text-xs sm:text-sm font-bold rounded-lg transition-all", capacityMode === 'recommended' ? "bg-[#46b1eb] shadow-sm text-white hover:bg-[#46b1eb] hover:text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]")}
                                    onClick={() => handleCapacityModeChange('recommended')} 
                                    disabled={capacityMode === 'recommended' || isCalculating}
                                >
                                    Recommended (70%)
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className={cn("flex-1 h-10 text-xs sm:text-sm font-bold rounded-lg transition-all", capacityMode === 'maximum' ? "bg-[#46b1eb] shadow-sm text-white hover:bg-[#46b1eb] hover:text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]")}
                                    onClick={() => handleCapacityModeChange('maximum')} 
                                    disabled={capacityMode === 'maximum' || isCalculating}
                                >
                                    Maximum (100%)
                                </Button>
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-2">
                                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Calendar View</Label>
                                <div className="flex bg-[hsl(var(--muted))]/50 p-1 rounded-xl border border-[hsl(var(--border))] w-full">
                                    {['names', 'icons', 'both'].map(view => (
                                        <Button 
                                            key={view}
                                            variant="ghost" 
                                            className={cn("flex-1 h-8 text-xs font-bold rounded-lg transition-all capitalize", calendarView === view ? "bg-[#46b1eb] shadow-sm text-white hover:bg-[#46b1eb] hover:text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]")}
                                            onClick={() => setCalendarView(view)} 
                                        >
                                            {view}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 gap-4">
                            {contentTypes.map(ct => {
                                const count = scheduledCounts[ct.id] || 0;
                                const SeriesIcon = SERIES_ICONS[ct.iconName] || Video;
                                return (
                                    <div key={ct.id} className="flex items-center justify-between gap-3 bg-[hsl(var(--background))] p-3 sm:p-4 rounded-2xl border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-lg shrink-0">
                                                <SeriesIcon size={16} />
                                            </div>
                                            <span className="font-bold text-[hsl(var(--foreground))] text-sm sm:text-base truncate" title={ct.name}>{ct.name}</span>
                                        </div>
                                        <div className="flex items-center bg-[hsl(var(--muted))]/30 rounded-xl p-1 border border-[hsl(var(--border))] shrink-0">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg hover:bg-[hsl(var(--background))]" onClick={() => updateScheduledCount(ct.id, count - 1)} disabled={count <= 0 || isCalculating}><Minus size={16}/></Button>
                                            <span className="font-black text-lg sm:text-xl text-[hsl(var(--foreground))] w-8 sm:w-10 text-center">{count}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg hover:bg-[hsl(var(--background))]" onClick={() => updateScheduledCount(ct.id, count + 1)} disabled={isCalculating}><Plus size={16}/></Button>
                                            <div className="w-px h-6 bg-[hsl(var(--border))] mx-1"></div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10" onClick={() => setMax(ct.id)} disabled={isCalculating} title="Max out this series"><ChevronsUp size={18} /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {!schedule.wasSuccessful && !isCalculating && (
                            <div className="mt-6 text-sm text-[hsl(var(--destructive-foreground))] bg-[hsl(var(--destructive))] border border-[hsl(var(--destructive))]/50 p-4 rounded-xl flex items-start gap-3 animate-fadeIn shadow-sm">
                                <AlertCircle size={20} className="shrink-0 mt-0.5"/>
                                <div>
                                    <span className="font-black block mb-1 text-base tracking-tight">Capacity Exceeded!</span>
                                    <span className="opacity-90 leading-relaxed block">
                                        {schedule.unscheduled.length > 0 
                                            ? `The calendar below has packed as many tasks as physically possible. ${schedule.unscheduled.length} tasks were dropped. To fix this, lower the counts or click Reschedule.`
                                            : `Your schedule currently exceeds the ${capacityMode === 'recommended' ? '70% Recommended' : '100% Maximum'} zone capacity limit. To fix this, lower the counts or click Reschedule.`
                                        }
                                    </span>
                                </div>
                            </div>
                        )}
                        </CardContent>

                        {showRecommendedInfo && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[hsl(var(--background))]/90 backdrop-blur-sm animate-fadeIn">
                                <div className="bg-[hsl(var(--popover))] border border-[hsl(var(--border))] shadow-2xl p-6 rounded-2xl relative text-center max-w-[90%]">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="absolute top-2 right-2 h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" 
                                        onClick={() => setShowRecommendedInfo(false)}
                                    >
                                        <XCircle size={20} />
                                    </Button>
                                    <div className="mx-auto bg-[hsl(var(--primary))]/10 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                                        <Info size={24} className="text-[hsl(var(--primary))]" />
                                    </div>
                                    <h4 className="font-bold text-lg mb-2">Capacity Modes</h4>
                                    <p className="text-sm text-[hsl(var(--popover-foreground))]/80 leading-relaxed text-left">
                                        <strong>Recommended (70%):</strong> The brain strictly prevents any work zone from exceeding 70% saturation. This is the gold standard for sustainable creation, leaving a 30% buffer for life events, edits, or creative block.<br/><br/>
                                        <strong>Maximum (100%):</strong> The brain will ruthlessly pack your week until every single minute is utilized. Warning: Highly susceptible to burnout if maintained long-term!
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="h-full relative overflow-hidden shadow-md">
                        {isCalculating && (
                            <div className="absolute inset-0 z-10 bg-[hsl(var(--background))]/50 backdrop-blur-[1px]"></div>
                        )}
                        <CardHeader className="pb-4 border-b border-[hsl(var(--border))]">
                            <CardTitle className="text-xl">Zone Saturation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            {(() => {
                                const maxPct = Math.max(...zones.map(z => schedule.zoneUsage[z.id]?.percentage || 0));
                                return zones.map(z => {
                                    const usage = schedule.zoneUsage[z.id];
                                    const pct = usage ? usage.percentage : 0;
                                    const isLimitReached = pct > (capacityMode === 'recommended' ? 70 : 90);
                                    const isPrimaryBottleneck = pct === maxPct && pct > 0;
                                    return (
                                        <div key={z.id} className="bg-[hsl(var(--muted))]/20 p-3 rounded-xl border border-[hsl(var(--border))]">
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[hsl(var(--foreground))] truncate max-w-[150px]">{z.name}</span>
                                                    {isPrimaryBottleneck && (
                                                        <span className="text-[9px] uppercase tracking-widest font-black bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] px-1.5 py-0.5 rounded border border-[hsl(var(--destructive))]/20">
                                                            Bottleneck
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={cn("font-black", isLimitReached ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]')}>{pct}%</span>
                                            </div>
                                            <Progress value={pct} className={isLimitReached ? "[&>div]:bg-[hsl(var(--destructive))]" : ""} />
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] mt-2">
                                                <span>{usage ? usage.used : 0}m used</span>
                                                <span>{usage ? usage.total : 0}m total</span>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </CardContent>
                    </Card>
                    </div>
                
                <div>
                    <CalendarTable weekDays={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} zones={zones} dailySchedule={schedule.dailySchedule} scheduledCounts={scheduledCounts} contentTypes={contentTypes} isCalculating={isCalculating} calendarView={calendarView} />
                </div>
                </div>
                );
            })()}
        </main>

            {/* Navigation Footer */}
            {step > 0 && (
            <div className="fixed bottom-0 left-0 w-full bg-[hsl(var(--background))]/95 backdrop-blur-md border-t border-[hsl(var(--border))] p-4 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-3">
                    <Button 
                        variant="ghost" 
                        onClick={() => setStep(step - 1)} 
                        disabled={step < 1 || isCalculating}
                        className="font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    >
                        <ArrowLeft size={18} className="mr-2" /> <span className="hidden sm:inline">Back</span>
                    </Button>

                    <div className="text-center min-h-[20px] flex-1 px-4">
                        {!currentValidation.isValid ? (
                            <div className="text-xs sm:text-sm text-[hsl(var(--destructive))] font-bold animate-fadeIn flex items-center justify-center gap-2">
                                <AlertCircle size={16} />
                                <span className="truncate">{currentValidation.message}</span>
                            </div>
                        ) : (
                            <span className="text-sm font-black text-[hsl(var(--foreground))] tracking-wider uppercase opacity-50">Step {step} of {totalSteps}</span>
                        )}
                    </div>

                    {step < 5 ? (
                        <Button 
                        onClick={handleNextStep} 
                        disabled={!currentValidation.isValid}
                        className="font-bold shadow-md px-6"
                        >
                        <span className="sm:hidden">Next</span>
                        <span className="hidden sm:inline">Next Step</span>
                            <ArrowRight size={18} className="ml-2" />
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => setStep(0)} disabled={isCalculating} className="font-bold border-2">
                        Start Over
                        </Button>
                    )}
                    </div>
                    <Progress value={progress} className="h-2 w-full rounded-full" />
                </div>
            </div>
            )}
        </div>
        </TooltipProvider>
    );
}