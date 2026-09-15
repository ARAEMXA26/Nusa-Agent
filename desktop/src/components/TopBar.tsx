import React from 'react';
import { 
  ChevronDown, 
  ShieldCheck, 
  BarChart2, 
  Pause, 
  Square 
} from 'lucide-react';

interface TopBarProps {
  workspaceName?: string;
  modelName?: string;
  isSandboxed?: boolean;
  tokenCount?: string;
  cost?: string;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onStop?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  workspaceName = 'Workspace / Growth',
  modelName = 'Nusa-1 (Latest)',
  isSandboxed = true,
  tokenCount = '12.4K tokens',
  cost = '$0.03',
  isPaused = false,
  onTogglePause,
  onStop,
}) => {
  return (
    <header 
      style={{ WebkitAppRegion: 'drag' } as any}
      className="h-12 bg-[#0C0E12] border-b border-neutral-800/80 px-4 flex items-center justify-between select-none shrink-0 z-20"
    >
      {/* Left items: macOS window traffic light clearance + Workspace & Model selectors */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className="flex items-center gap-4 pl-20"
      >
        {/* Workspace Dropdown Selector */}
        <div className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-neutral-800/60 transition-colors">
          <span className="font-medium">{workspaceName}</span>
          <ChevronDown className="w-3.5 h-3.5 stroke-white" />
        </div>

        {/* Model Selector Pill */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white cursor-pointer px-3 py-1 rounded-md bg-[#16191F] border border-neutral-700/60 transition-colors">
          <span>{modelName}</span>
          <ChevronDown className="w-3 h-3 stroke-white" />
        </div>

        {/* Sandboxed Badge */}
        {isSandboxed && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-medium">
            <ShieldCheck className="w-3.5 h-3.5 stroke-white" />
            <span>Sandboxed</span>
          </div>
        )}
      </div>

      {/* Right items matching Gambar 1 */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className="flex items-center gap-4 text-xs"
      >
        {/* Token Count */}
        <span className="text-neutral-400 font-medium">{tokenCount}</span>

        {/* Cost with chart icon */}
        <div className="flex items-center gap-1 text-neutral-300 font-medium">
          <span>{cost}</span>
          <BarChart2 className="w-3.5 h-3.5 stroke-white" />
        </div>

        {/* Action Controls: Pause & Stop */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isPaused 
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                : 'bg-[#181B20] text-white hover:bg-neutral-800 border-neutral-700'
            }`}
          >
            <Pause className="w-3.5 h-3.5 stroke-white fill-white" />
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#DC2626] hover:bg-[#EF4444] text-white shadow-sm transition-colors"
          >
            <Square className="w-3 h-3 stroke-white fill-white" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    </header>
  );
};
