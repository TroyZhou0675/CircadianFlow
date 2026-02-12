
import React, { useState } from 'react';
import { EnergyLevel, LogEntry, Tag } from '../types';
import { ENERGY_DEFINITIONS } from '../constants';
import { X, Check, Moon, Sun, Trash2 } from 'lucide-react';

interface EnergyFormProps {
  initialData?: LogEntry | null;
  selectedHour: number;
  selectedMinute: number;
  availableTags: Tag[];
  isDarkMode?: boolean;
  onSave: (entry: Omit<LogEntry, 'id' | 'timestamp' | 'dateStr'>) => void;
  onDelete: (hour: number, minute: number) => void;
  onClose: () => void;
}

const EnergyForm: React.FC<EnergyFormProps> = ({ initialData, selectedHour, selectedMinute, availableTags, isDarkMode = true, onSave, onDelete, onClose }) => {
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(initialData?.energyLevel || 3);
  const [isSleep, setIsSleep] = useState<boolean>(initialData?.isSleep || false);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      hour: selectedHour,
      minute: selectedMinute,
      energyLevel,
      isSleep,
      tags: selectedTags
    });
  };

  // Calculate the time range string
  const startStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  let endHour = selectedHour;
  let endMinute = selectedMinute + 30;
  if (endMinute === 60) {
    endMinute = 0;
    endHour = (selectedHour + 1) % 24;
  }
  const endStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  const timeRangeLabel = `${startStr} - ${endStr}`;

  const containerBg = isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const headerBg = isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200';
  const textColor = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const mutedTextColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const subPanelBg = isDarkMode ? 'bg-slate-800' : 'bg-slate-100';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className={`${containerBg} border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300`}>
        
        {/* Header */}
        <div className={`p-4 border-b ${headerBg} flex justify-between items-center`}>
          <div>
            <h2 className={`text-xl font-bold ${textColor}`}>
               {timeRangeLabel}
            </h2>
            <p className={`text-sm ${mutedTextColor}`}>编辑时段状态</p>
          </div>
          <div className="flex items-center gap-2">
            {initialData && (
              <button 
                onClick={() => onDelete(selectedHour, selectedMinute)}
                className="p-2 hover:bg-red-500/20 text-red-500 rounded-full transition-colors"
                title="清除该时段"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} className={`p-2 hover:bg-${isDarkMode ? 'slate-700' : 'slate-200'} rounded-full transition-colors`}>
              <X size={20} className={mutedTextColor} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-6">
          
          {/* Mode Toggle */}
          <div className={`${subPanelBg} p-1 rounded-lg flex`}>
            <button 
              type="button"
              onClick={() => setIsSleep(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${!isSleep ? (isDarkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-900 shadow-sm') : `${mutedTextColor} hover:text-${isDarkMode ? 'white' : 'slate-900'}`}`}
            >
              <Sun size={16} /> 清醒
            </button>
            <button 
              type="button"
              onClick={() => setIsSleep(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${isSleep ? 'bg-purple-600 text-white shadow' : `bg-purple-100 text-purple-700 shadow-sm`} ${!isSleep ? `${mutedTextColor} hover:text-${isDarkMode ? 'white' : 'slate-900'}` : ''}`}
            >
              <Moon size={16} /> 睡眠
            </button>
          </div>

          {!isSleep && (
            <>
              {/* Energy Level Selector */}
              <div className="space-y-3">
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider`}>能量等级</h3>
                <div className="grid grid-cols-1 gap-2">
                  {ENERGY_DEFINITIONS.map((def) => (
                    <button
                      key={def.level}
                      type="button"
                      onClick={() => setEnergyLevel(def.level)}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                        energyLevel === def.level 
                          ? `border-transparent ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'} ring-2 ring-indigo-500` 
                          : `${isDarkMode ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'}`
                      }`}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: def.color }} />
                      <div className="pl-2">
                        <div className="flex justify-between items-center">
                          <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} flex items-center gap-2`}>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900" style={{backgroundColor: def.color}}>
                              {def.level}
                            </span>
                            {def.label}
                          </span>
                          {energyLevel === def.level && <Check size={14} style={{color: def.color}} />}
                        </div>
                        <p className={`text-[11px] ${mutedTextColor} mt-0.5`}>{def.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider`}>影响因子</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-2 ${
                          isSelected 
                            ? `${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} border-transparent ${isDarkMode ? 'text-white' : 'text-slate-900'}` 
                            : `bg-transparent ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} ${mutedTextColor} hover:border-${isDarkMode ? 'slate-500' : 'slate-400'}`
                        }`}
                        style={{ borderColor: isSelected ? tag.color : undefined }}
                      >
                         <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></span>
                         {tag.label}
                      </button>
                    )
                  })}
                  {availableTags.length === 0 && (
                    <p className={`text-[10px] ${mutedTextColor} italic`}>尚未定义因子，请在首页“管理因子”中添加。</p>
                  )}
                </div>
              </div>
            </>
          )}

          {isSleep && (
            <div className={`p-6 ${isDarkMode ? 'bg-purple-900/10 border-purple-500/20' : 'bg-purple-50 border-purple-100'} border rounded-xl text-center`}>
              <Moon className={`w-10 h-10 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} mx-auto mb-2`} />
              <p className={`${isDarkMode ? 'text-purple-200' : 'text-purple-700'} text-sm font-medium`}>该时段已标记为睡眠状态</p>
            </div>
          )}

        </div>

        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'} flex gap-3`}>
           <button onClick={onClose} className={`flex-1 py-3 border ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-200'} font-bold rounded-xl transition-colors`}>取消</button>
           <button onClick={handleSubmit} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-[0.98]">保存记录</button>
        </div>
      </div>
    </div>
  );
};

export default EnergyForm;
