import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { 
  Undo2, 
  Redo2, 
  Plus, 
  Download, 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  FileText, 
  Settings, 
  Sun, 
  Moon,
  Trash2,
  RefreshCw,
  FileCheck,
  Sparkles
} from "lucide-react";

export const WorkspaceMockup: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [activeDoc, setActiveDoc] = useState("Contract.pdf");
  const [hoveredPage, setHoveredPage] = useState<number | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const [isDesktop, setIsDesktop] = useState(false);

  // Monitor window resize to safely disable rotation on mobile/tablet
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle parallax hover on desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !isDesktop) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Clamp to maximum 1.2 degrees rotation and 8px shift
    const rotateX = -(y / (rect.height / 2)) * 1.2;
    const rotateY = (x / (rect.width / 2)) * 1.2;
    const posX = (x / (rect.width / 2)) * 8;
    const posY = (y / (rect.height / 2)) * 8;

    setParallax({ x: posX, y: posY, rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  };

  const documents = [
    { name: "Contract.pdf", pages: 12, color: "#0891B2" },
    { name: "Invoice.pdf", pages: 8, color: "#16A34A" },
    { name: "Attachments.pdf", pages: 22, color: "#D97706" },
    { name: "Reports.pdf", pages: 16, color: "#E11D48" },
  ];

  return (
    <div 
      className="w-full max-w-[650px] sm:max-w-[680px] lg:max-w-[820px] xl:max-w-[900px] aspect-[1.42] select-none z-10 pointer-events-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={shouldReduceMotion ? {} : {
          x: parallax.x,
          y: parallax.y,
          rotateX: parallax.rotateX,
          rotateY: parallax.rotateY,
        }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="w-full h-full rounded-2xl bg-panel-bg/95 backdrop-blur-xl border border-border-strong shadow-[0_30px_70px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col relative z-10"
        style={{ 
          transformStyle: "preserve-3d",
          transform: isDesktop ? `rotateZ(1.5deg)` : `rotateZ(0deg)`
        }}
      >
        {/* Glowing atmospheric reflection outline */}
        <div className="absolute inset-0 rounded-2xl border border-blue-accent/10 pointer-events-none z-30" />

        {/* Top Header/Toolbar - Improved Spacing & Contrast */}
        <div className="h-14 lg:h-15 bg-panel-elevated/90 border-b border-border-main px-4 lg:px-5 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-accent/20 border border-blue-accent/40 flex items-center justify-center shadow-[0_0_12px_rgba(49,92,255,0.25)]">
              <Layers className="w-4.5 h-4.5 text-blue-bright animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13.5px] lg:text-[14.5px] font-extrabold text-primary-text tracking-wide">Client Document Pack</span>
              <span className="text-[10px] lg:text-[10.5px] text-blue-bright font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-bright animate-pulse" />
                Local workspace active
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className="p-1.5 rounded-lg text-muted-text hover:bg-white/5 hover:text-primary-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright" 
              title="Undo"
              aria-label="Undo"
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" focusable="false" />
            </button>
            <button 
              className="p-1.5 rounded-lg text-muted-text hover:bg-white/5 hover:text-primary-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright" 
              title="Redo"
              aria-label="Redo"
            >
              <Redo2 className="w-4 h-4" aria-hidden="true" focusable="false" />
            </button>
            <div className="w-px h-5 bg-border-main mx-1" />
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[11.5px] lg:text-[12px] font-bold text-secondary-text border border-white/5 hover:bg-white/10 hover:text-primary-text transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" focusable="false" /> Add Files
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-accent text-[11.5px] lg:text-[12px] font-extrabold text-white hover:bg-blue-bright transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright">
              <Download className="w-3.5 h-3.5" aria-hidden="true" focusable="false" /> Export
            </button>
          </div>
        </div>

        {/* Main Interface Layout */}
        <div className="flex flex-1 overflow-hidden z-20">
          
          {/* ZONE 1: Left Documents Sidebar (18%) - Larger filename text */}
          <div className="w-[18%] min-w-[115px] lg:min-w-[125px] bg-secondary-bg/25 border-r border-border-main flex flex-col p-2.5">
            <div className="pb-2 border-b border-white/5 mb-3 flex items-center justify-between">
              <span className="text-[10px] lg:text-[10.5px] font-extrabold text-muted-text uppercase tracking-widest">Documents</span>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
              {documents.map((doc) => (
                <button
                  key={doc.name}
                  onClick={() => setActiveDoc(doc.name)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-left border ${
                    activeDoc === doc.name 
                      ? 'bg-blue-accent/15 border-blue-accent/45 text-primary-text shadow-sm' 
                      : 'hover:bg-white/5 border-transparent text-secondary-text'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: doc.color }} />
                    <span className="text-[11.5px] lg:text-[12px] font-bold truncate">{doc.name}</span>
                  </div>
                  <span className="text-[9px] lg:text-[9.5px] text-muted-text font-bold font-mono bg-white/5 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
                    {doc.pages}
                  </span>
                </button>
              ))}
              
              <button className="w-full mt-2.5 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border-main border-dashed text-[10px] lg:text-[10.5px] font-bold text-muted-text hover:bg-white/5 hover:text-secondary-text transition-all">
                <Plus className="w-3 h-3" /> Add Doc
              </button>
            </div>
          </div>

          {/* ZONE 2: Center Main Page Workspace (57%) - Larger thumbnails and better spacing */}
          <div className="w-[57%] bg-main-bg/40 p-4 lg:p-5 flex flex-col relative overflow-hidden">
            <div className="text-[13px] lg:text-[13.5px] font-bold text-secondary-text mb-4 flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg self-start border border-white/5">
              <ChevronRight className="w-4 h-4 text-blue-bright" /> 
              <span>{activeDoc}</span>
            </div>
            
            <div className="flex-1 grid grid-cols-4 gap-3.5 lg:gap-4 overflow-y-auto pr-1 pb-16">
              {[1, 2, 3, 4].map(i => (
                <PageThumbnail 
                  key={i} 
                  index={i} 
                  color={documents.find(d => d.name === activeDoc)?.color || "#0891B2"} 
                  isHovered={hoveredPage === i}
                  onHover={() => setHoveredPage(i)}
                  onLeave={() => setHoveredPage(null)}
                />
              ))}
              {[5, 6, 7, 8].map(i => (
                <PageThumbnail 
                  key={i} 
                  index={i} 
                  color={documents.find(d => d.name === activeDoc)?.color || "#0891B2"} 
                  selected={i === 6}
                  isHovered={hoveredPage === i}
                  onHover={() => setHoveredPage(i)}
                  onLeave={() => setHoveredPage(null)}
                />
              ))}
            </div>

            {/* Glowing drag-insertion path indicator - crisp & visible */}
            <div className="absolute top-[35%] left-[58%] w-[3.5px] h-[100px] bg-blue-bright shadow-[0_0_18px_rgba(49,92,255,1)] z-30 rounded-full" />
            
            {/* Visual Mouse Cursor pointer simulation */}
            {!shouldReduceMotion && (
              <motion.div 
                animate={{
                  x: [40, 80, 40],
                  y: [-10, -50, -10]
                }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-[52%] left-[46%] z-40 pointer-events-none"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="#000" strokeWidth="2.5" className="filter drop-shadow-lg">
                  <path d="M4 4l16 7-6 3-3 6z" />
                </svg>
              </motion.div>
            )}

            {/* Float context quick actions bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-panel-elevated/95 border border-border-strong rounded-xl p-2 shadow-2xl backdrop-blur-md z-30">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] lg:text-[11.5px] font-bold text-secondary-text hover:bg-white/10 rounded-lg transition-all">
                <RefreshCw className="w-3.5 h-3.5 text-blue-bright" /> Rotate
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] lg:text-[11.5px] font-bold text-secondary-text hover:bg-white/10 rounded-lg transition-all">
                <Layers className="w-3.5 h-3.5 text-violet-accent" /> Copy
              </button>
              <div className="w-px h-3 bg-border-main mx-1" />
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] lg:text-[11.5px] font-bold text-pdf-red hover:bg-pdf-red/10 rounded-lg transition-all">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>

          {/* ZONE 3: Right Inspector Summary (25%) - Improved layout & size */}
          <div className="w-[25%] bg-secondary-bg/25 border-l border-border-main flex flex-col p-3.5 lg:p-4 justify-between">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-[10px] lg:text-[11px] font-extrabold text-muted-text uppercase tracking-widest">Workspace summary</h3>
                <div className="h-[2px] w-8 bg-blue-bright rounded-full mt-1" />
              </div>
              
              <div className="space-y-2.5 pt-1">
                <StatRow label="Documents" value="4 Groups" />
                <StatRow label="Total Pages" value="58 Pages" />
                <div className="h-px w-full bg-white/5 my-1" />
                <StatRow label="Reordered" value="6 Pages" />
                <StatRow label="Duplicated" value="3 Pages" />
              </div>

              {/* Smart Restore Indicator Card - highly visible, readable */}
              <div className="rounded-xl border border-blue-accent/25 bg-blue-accent/10 p-3 lg:p-3.5 relative overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-4 h-4 text-blue-bright animate-pulse" />
                  <span className="text-[11px] lg:text-[11.5px] font-extrabold text-blue-bright tracking-wide uppercase">Smart Restore</span>
                </div>
                <p className="text-[11px] lg:text-[11.5px] text-blue-bright/80 leading-relaxed font-bold">
                  Workspace metadata is embedded inside standard PDF. Restore full project state instantly.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/5">
              <button className="w-full bg-blue-accent hover:bg-blue-bright text-white text-[12px] lg:text-[12.5px] font-extrabold py-2.5 rounded-xl shadow-[0_4px_12px_rgba(49,92,255,0.25)] transition-all flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                <FileCheck className="w-4 h-4" /> Export Smart PDF
              </button>
              <button className="w-full bg-transparent border border-border-strong text-secondary-text hover:text-primary-text text-[11.5px] lg:text-[12px] font-bold py-2 rounded-xl hover:bg-white/5 transition-all">
                Export Normal PDF
              </button>

              {/* Bottom Quick Control Bar */}
              <div className="flex justify-center gap-3.5 text-muted-text border-t border-white/5 pt-2.5 mt-1.5">
                <button 
                  aria-label="Switch to Light Mode" 
                  className="p-1 text-muted-text hover:text-primary-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright rounded-lg cursor-pointer"
                >
                  <Sun className="w-4 h-4" aria-hidden="true" focusable="false" />
                </button>
                <button 
                  aria-label="Switch to Dark Mode (Active)" 
                  className="p-1 text-primary-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright rounded-lg cursor-pointer"
                >
                  <Moon className="w-4 h-4" aria-hidden="true" focusable="false" />
                </button>
                <button 
                  aria-label="Workspace Settings" 
                  className="p-1 text-muted-text hover:text-primary-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright rounded-lg cursor-pointer"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" focusable="false" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

const PageThumbnail: React.FC<{ 
  index: number; 
  color: string; 
  selected?: boolean; 
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}> = ({ index, color, selected, isHovered, onHover, onLeave }) => (
  <div 
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    className={`relative aspect-[1/1.38] rounded-lg bg-[#0F1423] border flex flex-col p-2.5 transition-all duration-300 cursor-pointer ${
      selected 
        ? 'border-blue-bright ring-2 ring-blue-bright/50 scale-[1.03] shadow-lg' 
        : isHovered 
        ? 'border-white/20 bg-[#141C34] scale-[1.03] shadow-md' 
        : 'border-white/5 hover:border-white/10'
    }`}
  >
    {/* Page Header */}
    <div className="flex items-center justify-between mb-2">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-extrabold text-muted-text font-mono">{index}</span>
    </div>
    
    {/* Simulated layout bars inside page thumbnail */}
    <div className="flex-1 flex flex-col justify-center gap-2 px-1 opacity-25">
      <div className="w-full h-[4px] bg-white rounded-full" />
      <div className="w-5/6 h-[4px] bg-white rounded-full" />
      <div className="w-4/6 h-[4px] bg-white rounded-full" />
    </div>

    {selected && (
      <div className="absolute inset-0 bg-blue-accent/20 rounded-lg flex items-center justify-center backdrop-blur-[0.5px]">
        <CheckCircle2 className="w-6 h-6 text-blue-bright filter drop-shadow" />
      </div>
    )}
  </div>
);

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-[12px] lg:text-[12.5px]">
    <span className="text-muted-text font-bold">{label}</span>
    <span className="text-primary-text font-extrabold font-mono">{value}</span>
  </div>
);
