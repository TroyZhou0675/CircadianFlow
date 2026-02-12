
import { GoogleGenAI } from "@google/genai";
import { DayData, LogEntry } from "../types";
import { ENERGY_DEFINITIONS } from "../constants";

export const generateInsights = async (history: DayData[]) => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found");
    return "未配置 API Key。无法生成 AI 分析见解。";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare data summary for the AI
    const summary = history.slice(-7).map(day => {
        const peakHours = day.entries.filter(e => e.energyLevel >= 4).map(e => `${e.hour}:${e.minute === 0 ? '00' : '30'}`).join(', ');
        const sleepHours = day.entries.filter(e => e.isSleep).length / 2; // Assuming 30 min blocks
        return `日期: ${day.dateStr}, 平均能量: ${day.averageEnergy.toFixed(1)}, 生产力得分: ${day.totalProductivity}, 睡眠时长: ${sleepHours}h, 巅峰时段: [${peakHours}]`;
    }).join('\n');

    const prompt = `
      我正在追踪我的昼夜节律和能量水平（1-5分制，1=极度疲劳，5=巅峰状态）。
      以下是我过去几天的监测数据：
      ${summary}

      请作为一名专业的健康与效率顾问分析我的节律：
      1. 识别出我最高效的生产力时间窗口（巅峰时段）。
      2. 发现能量下降或处于低谷的规律。
      3. 基于这些数据，给我一条具体的、可操作的建议，以优化我的能量管理。
      
      要求：
      - 必须使用【中文】回答。
      - 保持内容简洁（200字以内）。
      - 语气积极、专业且具有鼓励性。
      - 使用 Markdown 格式（可以加粗关键词）。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster simple insights
      }
    });

    return response.text || "暂时无法生成分析见解，请稍后再试。";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "与 AI 助手通信时发生错误，请检查网络连接或 API 配置。";
  }
};
