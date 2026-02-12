
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogEntry, DayData, Tag, Theme } from './types';
import { STORAGE_KEY, AVAILABLE_TAGS as DEFAULT_TAGS, THEMES } from './constants';
import CircadianDisk from './components/CircadianDisk';
import EnergyForm from './components/EnergyForm';
import WeeklyStats from './components/WeeklyStats';
import { generateInsights } from './services/geminiService';
import { ChevronLeft, ChevronRight, Activity, Trash2, Moon, Sun, Sparkles, X, Settings2, Plus, Palette, Clock, AlertCircle, GripVertical } from 'lucide-react';
import { format, addDays, isAfter, isBefore, addMinutes } from 'date-fns';

const TAGS_STORAGE_KEY = 'circadian_tags_v2';
const THEME_STORAGE_KEY = 'circadian_theme_v1';
const DARK_MODE_KEY = 'circadian_dark_mode_v1';
const generateId = () => Math.random().toString(36).substring(2, 11);

// 统一日期格式化工具，确保全应用一致
const getDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    const stored = localStorage.getItem(TAGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_TAGS;
  });

  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return THEMES.find(t => t.id === parsed.id) || THEMES[0];
      } catch (e) {
        return THEMES[0];
      }
    }
    return THEMES[0];
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    return stored === null ? true : JSON.parse(stored);
  });

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<'daily' | 'weekly'>('daily');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState<{hour: number, minute: number} | null>(null);
  const [sleepStart, setSleepStart] = useState("23:00");
  const [sleepEnd, setSleepEnd] = useState("07:00");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Drag and Drop state for tags
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 数据持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(currentTheme));
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // 当日期发生变化时，自动清除 AI 分析见解，防止数据陈旧
  useEffect(() => {
    setInsight(null);
  }, [currentDate]);

  useEffect(() => {
    const bgClass = isDarkMode 
      ? (currentTheme.bg === 'black' ? 'bg-black' : `bg-${currentTheme.bg}-950`)
      : 'bg-slate-50';
    const textClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
    document.body.className = `${bgClass} ${textClass} min-h-screen transition-all duration-700`;
  }, [currentTheme, isDarkMode]);

  // 获取当前选择日期的条目
  const dailyEntries = useMemo(() => {
    const targetStr = getDateKey(currentDate);
    return entries.filter(e => e.dateStr === targetStr);
  }, [entries, currentDate]);

  const currentDayProductivity = useMemo(() => {
    return dailyEntries.reduce((acc, curr) => acc + (curr.isSleep ? 0 : curr.energyLevel * 0.5), 0);
  }, [dailyEntries]);

  const weeklyData = useMemo((): DayData[] => {
    const uniqueDates = Array.from(new Set(entries.map(e => e.dateStr))).sort();
    return uniqueDates.map(dateStr => {
      const dayEntries = entries.filter(e => e.dateStr === dateStr);
      const totalProductivity = dayEntries.reduce((acc, curr) => acc + (curr.isSleep ? 0 : curr.energyLevel * 0.5), 0);
      const nonSleepEntries = dayEntries.filter(e => !e.isSleep);
      const averageEnergy = nonSleepEntries.length > 0 
        ? nonSleepEntries.reduce((acc, curr) => acc + curr.energyLevel, 0) / nonSleepEntries.length
        : 0;
      return { dateStr, entries: dayEntries, totalProductivity, averageEnergy };
    });
  }, [entries]);

  const handleSaveEntry = (data: Omit<LogEntry, 'id' | 'timestamp' | 'dateStr'>) => {
    const dateStr = getDateKey(currentDate);
    setEntries(prev => {
      const filtered = prev.filter(e => !(e.dateStr === dateStr && e.hour === data.hour && e.minute === data.minute));
      return [...filtered, { 
        id: generateId(), 
        timestamp: new Date(currentDate).setHours(data.hour, data.minute, 0, 0), 
        dateStr, 
        ...data 
      }];
    });
    setInsight(null);
    setIsFormOpen(false);
  };

  const executeResetDay = useCallback(() => {
    const targetDateStr = getDateKey(currentDate);
    setEntries(prev => {
      const newEntries = prev.filter(e => e.dateStr !== targetDateStr);
      return newEntries;
    });
    setInsight(null);
    setIsResetConfirmOpen(false);
  }, [currentDate]);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    setTags(prev => [...prev, { id: generateId(), label: newTagName.trim(), icon: 'activity', color: newTagColor }]);
    setNewTagName("");
  };

  const handleDeleteTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      return;
    }

    const newTags = [...tags];
    const item = newTags.splice(draggedIndex, 1)[0];
    newTags.splice(index, 0, item);
    setTags(newTags);
    setDraggedIndex(null);
  };

  const handleRecordSleepRange = () => {
    const [sH, sM] = sleepStart.split(':').map(Number);
    const [eH, eM] = sleepEnd.split(':').map(Number);
    let start = new Date(currentDate); start.setHours(sH, sM, 0, 0);
    let end = new Date(currentDate); end.setHours(eH, eM, 0, 0);
    if (isAfter(start, end) || (sH === eH && sM === eM)) end = addDays(end, 1);
    
    const sleepBlocks: LogEntry[] = [];
    let current = start;
    while (isBefore(current, end)) {
      sleepBlocks.push({ 
        id: generateId(), 
        timestamp: current.getTime(), 
        dateStr: getDateKey(current), 
        hour: current.getHours(), 
        minute: current.getMinutes() >= 30 ? 30 : 0, 
        energyLevel: 3, 
        isSleep: true, 
        tags: [] 
      });
      current = addMinutes(current, 30);
    }
    setEntries(prev => {
      const startMs = start.getTime();
      const endMs = end.getTime();
      const filtered = prev.filter(e => e.timestamp < startMs || e.timestamp >= endMs);
      return [...filtered, ...sleepBlocks];
    });
    setInsight(null);
    setIsSleepModalOpen(false);
  };

  const handleRecordNow = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes() >= 30 ? 30 : 0;
    setCurrentDate(new Date()); 
    setSelectedSlot({ hour, minute });
    setIsFormOpen(true);
  };

  const primaryColor = currentTheme.primary;
  const bgColorClass = isDarkMode 
    ? (currentTheme.bg === 'black' ? 'bg-black' : `bg-${currentTheme.bg}-950`)
    : 'bg-slate-50';
  const modalColorClass = isDarkMode 
    ? (currentTheme.bg === 'black' ? 'bg-zinc-900' : `bg-${currentTheme.bg}-900/90`)
    : 'bg-white/95';
  const innerPanelColorClass = isDarkMode 
    ? 'bg-black/40 backdrop-blur-xl border border-white/5'
    : 'bg-white shadow-sm border border-slate-200';
  const textColor = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const mutedTextColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bgColorClass} ${textColor} font-sans pb-24 flex flex-col transition-all duration-700 overflow-x-hidden`}>
      {/* 顶部导航 */}
      <nav className={`fixed top-0 w-full ${modalColorClass} backdrop-blur-md border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'} z-40 px-6 py-4 flex justify-between items-center shadow-2xl`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-${primaryColor}-500/20 rounded-xl`}>
            <Activity className={`text-${primaryColor}-400`} size={20} />
          </div>
          <h1 className={`font-bold text-xl tracking-tight ${isDarkMode ? 'bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent' : 'text-slate-900'}`}>CircadianFlow</h1>
        </div>
        <div className={`flex ${isDarkMode ? 'bg-black/40' : 'bg-slate-100'} p-1 rounded-2xl shadow-inner gap-1 border ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
           <button onClick={() => setView('daily')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${view === 'daily' ? `bg-${primaryColor}-600 text-white shadow-lg` : `${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}`}>日视图</button>
           <button onClick={() => setView('weekly')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${view === 'weekly' ? `bg-${primaryColor}-600 text-white shadow-lg` : `${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}`}>周统计</button>
           <div className="w-px h-6 bg-current opacity-10 mx-1 my-auto" />
           <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 hover:bg-${isDarkMode ? 'white/10' : 'slate-200'} rounded-xl transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
             {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
           </button>
           <button onClick={() => setIsThemePickerOpen(true)} className={`p-2 hover:bg-${isDarkMode ? 'white/10' : 'slate-200'} rounded-xl transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
             <Palette size={18} />
           </button>
        </div>
      </nav>

      <main className="pt-28 px-4 max-w-2xl mx-auto w-full space-y-10 flex-1">
        {view === 'daily' && (
          <div className="animate-in fade-in zoom-in-95 duration-700 space-y-10">
            <div className={`${innerPanelColorClass} p-4 rounded-3xl flex justify-between items-center shadow-2xl`}>
              <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className={`p-3 hover:bg-${isDarkMode ? 'white/10' : 'slate-100'} rounded-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} transition-all active:scale-90`}><ChevronLeft size={24} /></button>
              <div className="text-center">
                <h2 className="font-semibold text-lg">{format(currentDate, 'EEEE')}</h2>
                <p className={`text-[10px] ${mutedTextColor} uppercase tracking-[0.3em] mt-1`}>{format(currentDate, 'MM.dd')}</p>
              </div>
              <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className={`p-3 hover:bg-${isDarkMode ? 'white/10' : 'slate-100'} rounded-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} transition-all active:scale-90`}><ChevronRight size={24} /></button>
            </div>

            <CircadianDisk 
              key={`${getDateKey(currentDate)}-${dailyEntries.length}-${isDarkMode}`}
              entries={dailyEntries} 
              isDarkMode={isDarkMode}
              onSliceClick={(h, m) => { setSelectedSlot({hour: h, minute: m}); setIsFormOpen(true); }} 
            />

            <div className="flex justify-center -mt-4">
               <button 
                  onClick={handleRecordNow}
                  className={`flex items-center gap-3 px-10 py-5 bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white rounded-full font-bold shadow-[0_15px_40px_rgba(0,0,0,0.2)] transition-all active:scale-95 group overflow-hidden relative border border-white/10`}
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <Clock size={22} className="relative z-10" />
                  <span className="relative z-10 text-lg">记录此刻状态</span>
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className={`${innerPanelColorClass} p-4 rounded-3xl text-center flex flex-col justify-center shadow-xl`}>
                <p className={`${mutedTextColor} text-[10px] font-bold uppercase tracking-wider mb-1`}>生产力</p>
                <p className={`text-2xl font-black text-${primaryColor}-400`}>{currentDayProductivity.toFixed(1)}</p>
              </div>
              <button onClick={() => setIsSleepModalOpen(true)} className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 p-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all group shadow-xl active:scale-95">
                <Moon size={22} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-bold text-indigo-300">记录睡眠</span>
              </button>
              <button onClick={() => setIsTagManagerOpen(true)} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all group shadow-xl active:scale-95">
                <Settings2 size={22} className="text-emerald-400 group-hover:rotate-90 transition-transform" />
                <span className="text-[10px] font-bold text-emerald-300">管理因子</span>
              </button>
              <button onClick={() => setIsResetConfirmOpen(true)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all shadow-xl active:scale-95">
                <Trash2 size={22} className="text-red-400" />
                <span className="text-[10px] font-bold text-red-300">重置当日</span>
              </button>
            </div>
          </div>
        )}

        {view === 'weekly' && (
          <div className="animate-in fade-in duration-700 space-y-6">
            <WeeklyStats data={weeklyData} allEntries={entries} availableTags={tags} isDarkMode={isDarkMode} />
            <div className={`${innerPanelColorClass} rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group`}>
              <div className={`absolute top-0 right-0 p-12 bg-${primaryColor}-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl`} />
              <div className="flex items-center gap-4 mb-6 relative">
                <div className="p-3 bg-amber-400/20 rounded-2xl"><Sparkles className="text-amber-400" size={24} /></div>
                <h3 className="font-bold text-xl">智能节奏透视</h3>
              </div>
              {!insight && !loadingInsight && (
                <button onClick={async () => { setLoadingInsight(true); const r = await generateInsights(weeklyData); setInsight(r); setLoadingInsight(false); }} className={`w-full py-5 bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white rounded-2xl font-bold shadow-2xl transition-all active:scale-[0.98]`}>生成分析见解</button>
              )}
              {loadingInsight && <div className={`text-center py-8 ${mutedTextColor} animate-pulse font-medium`}>深度解析生理周期数据中...</div>}
              {insight && <div className={`prose ${isDarkMode ? 'prose-invert' : ''} prose-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`} dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, `<b class="text-${primaryColor}-500">$1</b>`).replace(/\n/g, '<br/>') }} />}
            </div>
          </div>
        )}
      </main>

      {/* 重置确认弹窗 */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
           <div className={`${isDarkMode ? 'bg-zinc-900 border-red-500/30' : 'bg-white border-slate-200'} border p-8 rounded-[2rem] max-w-xs w-full text-center space-y-6 shadow-2xl`}>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>确定重置？</h3>
                <p className={`${mutedTextColor} text-sm mt-2`}>将永久删除 {getDateKey(currentDate)} 的所有能量与睡眠记录。</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={executeResetDay} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95">确认删除</button>
                <button onClick={() => setIsResetConfirmOpen(false)} className={`w-full py-4 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-bold rounded-2xl transition-all`}>我再想想</button>
              </div>
           </div>
        </div>
      )}

      {/* 弹窗层：影响因子 */}
      {isTagManagerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className={`${modalColorClass} border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl flex flex-col max-h-[85vh]`}>
            <div className="flex justify-between items-center">
              <h3 className={`font-bold text-xl flex items-center gap-3 text-${primaryColor}-500`}><Settings2 size={24}/> 影响因子管理</h3>
              <button onClick={() => setIsTagManagerOpen(false)} className={`p-2 hover:bg-${isDarkMode ? 'white/10' : 'slate-100'} rounded-full transition-colors`}><X size={24}/></button>
            </div>
            
            <div className="flex gap-3 items-center">
              <input type="text" placeholder="因子名称 (如: 绿茶)" value={newTagName} onChange={e => setNewTagName(e.target.value)} className={`flex-1 ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'} border rounded-2xl h-14 px-5 text-sm focus:ring-2 ring-${primaryColor}-500/20 outline-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
              <div className={`relative w-14 h-14 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-50'} flex items-center justify-center overflow-hidden`}>
                 <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="absolute inset-0 w-24 h-24 cursor-pointer scale-150" />
              </div>
              <button onClick={handleAddTag} className={`bg-${primaryColor}-600 w-14 h-14 rounded-2xl hover:bg-${primaryColor}-500 transition-all shadow-xl active:scale-90 flex items-center justify-center text-white`}><Plus size={28}/></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 custom-scrollbar">
              {tags.map((tag, index) => (
                <div 
                  key={tag.id} 
                  draggable={true}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  className={`${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} p-4 rounded-[1.5rem] border flex items-center justify-between group transition-all shadow-sm cursor-default ${draggedIndex === index ? 'opacity-40 border-dashed border-white/20' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600">
                      <GripVertical size={18} />
                    </div>
                    <div className="w-4 h-4 rounded-full shadow-lg ring-2 ring-black/10" style={{backgroundColor: tag.color}}></div>
                    <span className={`text-base font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-700'}`}>{tag.label}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTag(tag.id)} 
                    className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all rounded-xl"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
              {tags.length === 0 && <p className={`text-center ${mutedTextColor} py-12 text-sm italic`}>尚无自定义因子，点击上方添加</p>}
            </div>
            {tags.length > 1 && (
              <p className={`text-[10px] ${mutedTextColor} text-center italic mt-2`}>提示：按住左侧图标可拖拽排序</p>
            )}
          </div>
        </div>
      )}

      {/* 弹窗层：主题选择 */}
      {isThemePickerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in zoom-in-95 duration-300">
          <div className={`${modalColorClass} border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} w-full max-w-sm rounded-[2.5rem] p-8 space-y-8 shadow-2xl`}>
            <div className="flex justify-between items-center"><h3 className="font-bold text-xl">美学主题</h3><button onClick={() => setIsThemePickerOpen(false)} className={`p-2 hover:bg-${isDarkMode ? 'white/10' : 'slate-100'} rounded-full transition-colors`}><X size={24}/></button></div>
            <div className="grid grid-cols-1 gap-4">
              {THEMES.map(theme => (
                <button 
                  key={theme.id}
                  onClick={() => { setCurrentTheme(theme); setIsThemePickerOpen(false); }}
                  className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${currentTheme.id === theme.id ? `border-${theme.primary}-500 bg-${theme.primary}-500/20 ring-4 ring-${theme.primary}-500/10` : `${isDarkMode ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}`}
                >
                   <div className="flex flex-col items-start">
                      <span className={`font-bold text-base ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{theme.name}</span>
                      <span className={`text-[10px] ${mutedTextColor} uppercase tracking-widest mt-1`}>Palette {theme.bg}</span>
                   </div>
                   <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full shadow-xl ring-2 ring-white/10" style={{backgroundColor: theme.primaryHex}}></div>
                      <div className={`w-8 h-8 rounded-full border border-white/10 ${theme.bg === 'black' ? 'bg-black' : `bg-${theme.bg}-950`} ring-2 ring-white/10`}></div>
                   </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isFormOpen && selectedSlot && (
        <EnergyForm 
          selectedHour={selectedSlot.hour} selectedMinute={selectedSlot.minute}
          initialData={dailyEntries.find(e => e.hour === selectedSlot.hour && e.minute === selectedSlot.minute)}
          availableTags={tags}
          isDarkMode={isDarkMode}
          onSave={handleSaveEntry}
          onDelete={(h, m) => { 
            const dateStr = getDateKey(currentDate);
            setEntries(prev => prev.filter(e => !(e.dateStr === dateStr && e.hour === h && e.minute === m))); 
            setIsFormOpen(false); 
          }}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {isSleepModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <div className={`${modalColorClass} border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl`}>
            <div className="flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-3"><Moon size={24} className="text-indigo-400" /> 睡眠计划</h3><button onClick={() => setIsSleepModalOpen(false)} className={`p-2 hover:bg-${isDarkMode ? 'white/10' : 'slate-100'} rounded-full transition-colors`}><X size={24}/></button></div>
            <div className="grid grid-cols-2 gap-6">
              <div><label className={`text-[10px] ${mutedTextColor} font-bold uppercase tracking-widest mb-2 block`}>入睡</label><input type="time" value={sleepStart} onChange={e => setSleepStart(e.target.value)} className={`w-full ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'} border rounded-2xl p-4 ${isDarkMode ? 'text-white' : 'text-slate-900'} outline-none focus:ring-2 ring-indigo-500/30`} /></div>
              <div><label className={`text-[10px] ${mutedTextColor} font-bold uppercase tracking-widest mb-2 block`}>醒来</label><input type="time" value={sleepEnd} onChange={e => setSleepEnd(e.target.value)} className={`w-full ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'} border rounded-2xl p-4 ${isDarkMode ? 'text-white' : 'text-slate-900'} outline-none focus:ring-2 ring-indigo-500/30`} /></div>
            </div>
            <button onClick={handleRecordSleepRange} className={`w-full py-5 bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white rounded-2xl font-bold shadow-2xl transition-all active:scale-[0.98]`}>确认排程</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
