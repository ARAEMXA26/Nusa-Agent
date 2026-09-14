import React, { useState } from 'react';
import { 
  RotateCw, 
  ExternalLink, 
  ChevronDown, 
  Users, 
  Calendar, 
  Activity, 
  BarChart2, 
  Layers, 
  Settings as SettingsIcon,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Globe
} from 'lucide-react';

interface WebPreviewProps {
  initialUrl?: string;
}

export const WebPreview: React.FC<WebPreviewProps> = ({ initialUrl = 'http://localhost:3000/analytics' }) => {
  const [url, setUrl] = useState(initialUrl);
  const [activeTab, setActiveTab] = useState<'mockup' | 'live'>('mockup');
  const [liveUrl, setLiveUrl] = useState('http://localhost:3000');
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [activeNav, setActiveNav] = useState('overview');

  return (
    <div className="flex flex-col h-full bg-[#111317] text-neutral-100 select-none overflow-y-auto">
      {/* Browser Bar with URL input */}
      <div className="bg-[#181B20] border-b border-neutral-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        {/* macOS traffic dots */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] inline-block" />
        </div>

        {/* Address Bar */}
        <div className="flex-1 max-w-sm flex items-center bg-[#0F1115] border border-neutral-700/80 rounded px-2.5 py-1 text-xs">
          <Globe className="w-3 h-3 stroke-white mr-1.5 shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setActiveTab('live');
                setLiveUrl(url);
              }
            }}
            placeholder="http://localhost:3000"
            className="w-full bg-transparent text-neutral-200 outline-none text-[11px] font-mono"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab(activeTab === 'mockup' ? 'live' : 'mockup')}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              activeTab === 'live'
                ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title="Toggle Live Webframe / Built-in Dashboard"
          >
            {activeTab === 'live' ? 'Live URL' : 'Preview App'}
          </button>
          <button
            onClick={() => {
              if (activeTab === 'live') {
                const el = document.getElementById('preview-live-frame') as HTMLIFrameElement;
                if (el) el.src = liveUrl;
              }
            }}
            className="p-1 rounded hover:bg-neutral-800 text-white transition-colors"
            title="Reload Preview"
          >
            <RotateCw className="w-3.5 h-3.5 stroke-white" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded hover:bg-neutral-800 text-white transition-colors"
            title="Open in external browser"
          >
            <ExternalLink className="w-3.5 h-3.5 stroke-white" />
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'live' ? (
        <div className="flex-1 w-full h-full min-h-[500px] bg-white">
          <iframe
            id="preview-live-frame"
            src={liveUrl}
            title="Live Web Preview"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      ) : (
        /* Built-in Interactive Product Analytics Dashboard matching Gambar 1 */
        <div className="p-4 space-y-4 bg-white text-neutral-900 rounded-b min-h-[550px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-3.5 h-3.5 stroke-white" />
              </div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">Product Analytics</h2>
            </div>

            <div 
              onClick={() => setTimeRange(timeRange === 'Last 30 days' ? 'Last 7 days' : 'Last 30 days')}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer shadow-xs"
            >
              <Calendar className="w-3 h-3 stroke-neutral-700 mr-1" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3 h-3 stroke-neutral-700 ml-1" />
            </div>
          </div>

          <div className="flex gap-4">
            {/* Mini sidebar nav from Gambar 1 */}
            <div className="w-28 shrink-0 space-y-1 border-r border-neutral-200 pr-2">
              {[
                { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
                { id: 'users', label: 'Users', icon: <Users className="w-3.5 h-3.5" /> },
                { id: 'retention', label: 'Retention', icon: <Layers className="w-3.5 h-3.5" /> },
                { id: 'conversion', label: 'Conversion', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                { id: 'events', label: 'Events', icon: <BarChart2 className="w-3.5 h-3.5" /> },
                { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-3.5 h-3.5" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    activeNav === item.id
                      ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <span className="w-3.5 h-3.5">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Main Metrics and Charts */}
            <div className="flex-1 space-y-4 min-w-0">
              {/* 3 Top Cards from Gambar 1 */}
              <div className="grid grid-cols-3 gap-3">
                {/* WAU */}
                <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/60 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 block">Weekly Active Users</span>
                  <div className="text-lg font-bold text-neutral-900 mt-0.5">24,532</div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
                    <ArrowUpRight className="w-3 h-3 stroke-emerald-600" />
                    <span>12% vs. previous period</span>
                  </div>
                </div>

                {/* Retention */}
                <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/60 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 block">Retention (Week 2)</span>
                  <div className="text-lg font-bold text-neutral-900 mt-0.5">42.8%</div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
                    <ArrowUpRight className="w-3 h-3 stroke-emerald-600" />
                    <span>5% vs. previous period</span>
                  </div>
                </div>

                {/* Conversion */}
                <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/60 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 block">Conversion Rate</span>
                  <div className="text-lg font-bold text-neutral-900 mt-0.5">3.6%</div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
                    <ArrowUpRight className="w-3 h-3 stroke-emerald-600" />
                    <span>0.8% vs. previous period</span>
                  </div>
                </div>
              </div>

              {/* Area Chart from Gambar 1 */}
              <div className="p-3.5 rounded-lg border border-neutral-200 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-neutral-900">Weekly Active Users</h4>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-600 px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50">
                    <span>Weekly</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </div>
                </div>

                <div className="relative h-28 w-full mt-2">
                  {/* SVG Chart */}
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="50" x2="500" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="110" x2="500" y2="110" stroke="#E2E8F0" strokeWidth="1" />

                    {/* Area under curve */}
                    <path
                      d="M 0 95 Q 60 85, 120 70 T 240 75 T 360 45 T 480 30 L 500 24 L 500 110 L 0 110 Z"
                      fill="url(#areaGradient)"
                    />

                    {/* Line curve */}
                    <path
                      d="M 0 95 Q 60 85, 120 70 T 240 75 T 360 45 T 480 30 L 500 24"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                    />

                    {/* End glowing dot */}
                    <circle cx="500" cy="24" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between text-[10px] text-neutral-400 font-medium mt-2 px-1">
                  <span>Apr 1</span>
                  <span>Apr 8</span>
                  <span>Apr 15</span>
                  <span>Apr 22</span>
                  <span>Apr 29</span>
                </div>
              </div>

              {/* Bottom Dual Grid: Retention Cohorts & Conversion Funnel */}
              <div className="grid grid-cols-2 gap-3">
                {/* User Retention Cohorts */}
                <div className="p-3 rounded-lg border border-neutral-200 bg-white shadow-xs">
                  <h4 className="text-[11px] font-bold text-neutral-900 mb-2">User Retention Cohorts</h4>
                  <div className="text-[9px] font-mono">
                    <div className="grid grid-cols-8 gap-1 mb-1 text-neutral-400 text-center">
                      <span className="text-left"></span>
                      <span>W0</span>
                      <span>W1</span>
                      <span>W2</span>
                      <span>W3</span>
                      <span>W4</span>
                      <span>W5</span>
                      <span>W6</span>
                    </div>

                    {[
                      { week: 'Week 0', opacity: [1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2] },
                      { week: 'Week 1', opacity: [1.0, 0.7, 0.6, 0.4, 0.3, 0.2] },
                      { week: 'Week 2', opacity: [1.0, 0.8, 0.5, 0.4, 0.3] },
                      { week: 'Week 3', opacity: [1.0, 0.7, 0.5, 0.4] },
                      { week: 'Week 4', opacity: [1.0, 0.8, 0.6] },
                    ].map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-8 gap-1 items-center mb-1">
                        <span className="text-[8px] text-neutral-500 font-medium truncate">{row.week}</span>
                        {row.opacity.map((op, cIdx) => (
                          <div
                            key={cIdx}
                            className="h-3 rounded-[2px] bg-blue-600"
                            style={{ opacity: op }}
                            title={`${(op * 100).toFixed(0)}% retention`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div className="p-3 rounded-lg border border-neutral-200 bg-white shadow-xs">
                  <h4 className="text-[11px] font-bold text-neutral-900 mb-2">Conversion Funnel</h4>
                  <div className="space-y-2 text-[10px]">
                    {[
                      { stage: 'Page View', rate: '100%', count: '52,340', width: '100%' },
                      { stage: 'Sign Up', rate: '28.4%', count: '14,857', width: '28.4%' },
                      { stage: 'Activate', rate: '12.1%', count: '6,340', width: '12.1%' },
                      { stage: 'Purchase', rate: '3.6%', count: '1,885', width: '6.5%' },
                    ].map((step, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-neutral-700 font-medium">
                          <span>{step.stage}</span>
                          <div className="flex gap-2 text-neutral-500">
                            <span className="font-semibold text-neutral-900">{step.rate}</span>
                            <span>{step.count}</span>
                          </div>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: step.width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
