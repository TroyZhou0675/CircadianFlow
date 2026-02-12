
import React from 'react';
import { DayData, LogEntry, Tag } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Download, Info } from 'lucide-react';

interface WeeklyStatsProps {
  data: DayData[];
  allEntries: LogEntry[];
  availableTags: Tag[];
  isDarkMode?: boolean;
}

const WeeklyStats: React.FC<WeeklyStatsProps> = ({ data, allEntries, availableTags, isDarkMode = true }) => {
  if (data.length === 0) {
    return (
      <div className={`text-center p-12 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} rounded-3xl border border-dashed`}>
        <div className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-sm mb-2`}>暂无足够数据生成统计图表</div>
        <div className={`${isDarkMode ? 'text-slate-600' : 'text-slate-300'} text-xs`}>请在首页记录几天的能量状态</div>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.slice(-7).map(d => ({
    date: d.dateStr.split('-').slice(1).join('/'),
    avgEnergy: parseFloat(d.averageEnergy.toFixed(1)),
    productivity: d.totalProductivity,
    sleepHours: d.entries.filter(e => e.isSleep).length / 2
  }));

  // Factor vs Energy Analysis using dynamic tags
  const factorAnalysis = availableTags.map(tag => {
    const relevantEntries = allEntries.filter(e => !e.isSleep && e.tags.includes(tag.id));
    const avgEnergy = relevantEntries.length > 0 
      ? relevantEntries.reduce((acc, curr) => acc + curr.energyLevel, 0) / relevantEntries.length
      : 0;
    
    // Baseline: Average energy when NO tags are present (or at least not this specific tag)
    const baselineEntries = allEntries.filter(e => !e.isSleep && e.tags.length === 0);
    const baselineEnergy = baselineEntries.length > 0
      ? baselineEntries.reduce((acc, curr) => acc + curr.energyLevel, 0) / baselineEntries.length
      : 0;

    return {
      name: tag.label,
      avgEnergy: parseFloat(avgEnergy.toFixed(2)),
      baseline: parseFloat(baselineEnergy.toFixed(2)),
      color: tag.color,
      count: relevantEntries.length
    };
  }).filter(f => f.count > 0);

  const exportToCSV = () => {
    const headers = ['Date', 'Hour', 'Minute', 'Energy Level', 'Is Sleep', 'Factors'];
    const rows = allEntries.sort((a, b) => a.timestamp - b.timestamp).map(e => [
      e.dateStr,
      e.hour,
      e.minute,
      e.isSleep ? 'N/A' : e.energyLevel,
      e.isSleep ? 'Yes' : 'No',
      `"${e.tags.map(tid => availableTags.find(t => t.id === tid)?.label || tid).join('|')}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `circadian_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const axisStroke = isDarkMode ? "#94a3b8" : "#64748b";
  const gridStroke = isDarkMode ? "#334155" : "#e2e8f0";
  const panelBg = isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200';
  const textColor = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const tooltipStyle = { 
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
    border: isDarkMode ? 'none' : '1px solid #e2e8f0', 
    borderRadius: '12px', 
    color: isDarkMode ? '#f8fafc' : '#1e293b',
    boxShadow: isDarkMode ? 'none' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* Productivity Trend */}
      <div className={`${panelBg} p-6 rounded-2xl border shadow-xl`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-lg font-bold ${textColor}`}>周生产力趋势</h3>
          <button 
            onClick={exportToCSV}
            className={`flex items-center gap-2 px-3 py-1.5 ${isDarkMode ? 'bg-indigo-600/10 hover:bg-indigo-600/20 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-600'} border rounded-lg text-xs transition-colors`}
          >
            <Download size={14} /> 导出 CSV
          </button>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{fill: isDarkMode ? '#334155' : '#f1f5f9', opacity: 0.2}} />
              <Bar dataKey="productivity" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(240, 70%, ${isDarkMode ? Math.min(75, 35 + (entry.avgEnergy * 8)) : Math.min(85, 45 + (entry.avgEnergy * 7))}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Factor vs Energy Analysis */}
      {factorAnalysis.length > 0 && (
        <div className={`${panelBg} p-6 rounded-2xl border shadow-xl`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${textColor}`}>因子对能量的影响</h3>
            <div className="group relative"><Info size={14} className="text-slate-500 cursor-help" /><div className={`absolute bottom-full right-0 mb-2 w-48 p-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'} text-[10px] rounded shadow-xl hidden group-hover:block z-10`}>比较各因子激活时的平均能量 vs 全无因子时的基准水平。</div></div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factorAnalysis} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" domain={[0, 5]} stroke={axisStroke} fontSize={12} />
                <YAxis type="category" dataKey="name" stroke={axisStroke} fontSize={12} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="avgEnergy" name="因子均值" radius={[0, 4, 4, 0]}>
                  {factorAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                <Bar dataKey="baseline" name="基准(无因子)" fill={isDarkMode ? "#475569" : "#cbd5e1"} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sleep Trend */}
      <div className={`${panelBg} p-6 rounded-2xl border shadow-xl`}>
        <h3 className={`text-lg font-bold ${textColor} mb-4`}>能量与睡眠相关性</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#84cc16" fontSize={10} domain={[0, 5]} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={10} domain={[0, 12]} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line yAxisId="left" type="monotone" dataKey="avgEnergy" stroke="#84cc16" strokeWidth={3} dot={{r: 4, fill: '#84cc16', strokeWidth: 0}} name="平均能量" />
              <Line yAxisId="right" type="monotone" dataKey="sleepHours" stroke="#a855f7" strokeWidth={3} dot={{r: 4, fill: '#a855f7', strokeWidth: 0}} name="睡眠(小时)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WeeklyStats;
