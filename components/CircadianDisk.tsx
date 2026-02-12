
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { LogEntry } from '../types';
import { ENERGY_DEFINITIONS } from '../constants';

interface CircadianDiskProps {
  entries: LogEntry[];
  isDarkMode?: boolean;
  width?: number;
  height?: number;
  onSliceClick?: (hour: number, minute: number) => void;
}

const CircadianDisk: React.FC<CircadianDiskProps> = ({ 
  entries, 
  isDarkMode = true,
  width = 540, 
  height = 540,
  onSliceClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = 60; 
    const radius = (Math.min(width, height) / 2) - margin;
    
    const innerRadius = radius * 0.06;
    const sleepRadius = radius * 0.35; 
    const interactiveRadiusInner = radius * 0.37;
    const interactiveRadiusOuter = radius * 0.92; 

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const defs = svg.append("defs");
    
    const glowFilter = defs.append("filter").attr("id", "strong-glow-v2");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes breathe-centered {
        0%, 100% { transform: scale(0.93); opacity: 0.8; }
        50% { transform: scale(1.04); opacity: 1; }
      }
      @keyframes rotate-slow-bg {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .breathe-container {
        animation: breathe-centered 8s ease-in-out infinite;
        transform-origin: 0 0;
      }
      .bg-rotate {
        animation: rotate-slow-bg 300s linear infinite;
        transform-origin: 0 0;
      }
    `;
    document.head.appendChild(style);

    const interactiveGroup = g.append("g").attr("class", "breathe-container");

    const slices = [];
    for (let i = 0; i < 48; i++) {
      const hour = Math.floor(i / 2);
      const minute = (i % 2) * 30;
      const entry = entries.find(e => e.hour === hour && e.minute === minute);
      slices.push({
        index: i, hour, minute,
        startAngle: (i / 48) * 2 * Math.PI,
        endAngle: ((i + 1) / 48) * 2 * Math.PI,
        entry: entry || null
      });
    }

    const mandalaBg = interactiveGroup.append("g").attr("class", "bg-rotate");
    d3.range(4).forEach(i => {
      mandalaBg.append("circle")
        .attr("r", radius * (0.2 + i * 0.22))
        .attr("fill", "none")
        .attr("stroke", isDarkMode ? "white" : "#000")
        .attr("stroke-opacity", isDarkMode ? 0.03 : 0.05)
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", i % 2 === 0 ? "5,10" : "10,5");
    });

    const sleepArc = d3.arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(sleepRadius)
      .startAngle(d => d.startAngle + 0.006)
      .endAngle(d => d.endAngle - 0.006)
      .cornerRadius(10);

    interactiveGroup.selectAll(".sleep-slice")
      .data(slices)
      .enter()
      .append("path")
      .attr("d", sleepArc)
      .attr("fill", d => d.entry?.isSleep ? "#818cf8" : (isDarkMode ? "#ffffff08" : "#00000008"))
      .attr("stroke", d => d.entry?.isSleep ? (isDarkMode ? "white" : "#4f46e5") : (isDarkMode ? "#ffffff1a" : "#0000001a"))
      .attr("stroke-width", d => d.entry?.isSleep ? 2.5 : 1)
      .attr("stroke-opacity", d => d.entry?.isSleep ? 1 : 0.2)
      .style("cursor", "pointer")
      .on("click", (e, d) => onSliceClick && onSliceClick(d.hour, d.minute))
      .on("mouseenter", function() { d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", 3.5); })
      .on("mouseleave", function(e, d) { d3.select(this).attr("stroke-opacity", d.entry?.isSleep ? 1 : 0.2).attr("stroke-width", d.entry?.isSleep ? 2.5 : 1); });

    const energyScale = d3.scaleLinear().domain([0, 5]).range([interactiveRadiusInner, interactiveRadiusOuter]);
    
    const energyArc = d3.arc<any>()
      .innerRadius(interactiveRadiusInner)
      .outerRadius(d => {
        const minHeight = interactiveRadiusInner + (interactiveRadiusOuter - interactiveRadiusInner) * 0.45;
        return d.entry && !d.entry.isSleep ? energyScale(d.entry.energyLevel) : minHeight;
      })
      .startAngle(d => d.startAngle + 0.005)
      .endAngle(d => d.endAngle - 0.005)
      .cornerRadius(16);

    interactiveGroup.selectAll(".energy-slice")
      .data(slices)
      .enter()
      .append("path")
      .attr("d", energyArc)
      .attr("fill", d => {
        if (!d.entry || d.entry.isSleep) return isDarkMode ? "#ffffff0c" : "#00000008"; 
        const def = ENERGY_DEFINITIONS.find(def => def.level === d.entry?.energyLevel);
        return def?.color || (isDarkMode ? "#ffffff15" : "#00000015");
      })
      .attr("stroke", isDarkMode ? "white" : "#334155") 
      .attr("stroke-width", d => d.entry && !d.entry.isSleep ? 3.5 : 1.5)
      .attr("stroke-opacity", d => d.entry && !d.entry.isSleep ? 1 : 0.2)
      .attr("filter", d => d.entry && !d.entry.isSleep && isDarkMode ? "url(#strong-glow-v2)" : "none")
      .style("cursor", "pointer")
      .on("click", (e, d) => onSliceClick && onSliceClick(d.hour, d.minute))
      .on("mouseenter", function() { 
        d3.select(this)
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 5)
          .attr("fill-opacity", 0.95); 
      })
      .on("mouseleave", function(e, d) { 
        d3.select(this)
          .attr("stroke-opacity", d.entry && !d.entry.isSleep ? 1 : 0.2)
          .attr("stroke-width", d.entry && !d.entry.isSleep ? 3.5 : 1.5)
          .attr("fill-opacity", 1); 
      });

    const labelRadius = radius + 38; 
    const textColor = isDarkMode ? "white" : "#1e293b";
    
    d3.range(0, 24, 3).forEach(h => {
        const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * labelRadius;
        const y = Math.sin(angle) * labelRadius;
        
        const labelG = g.append("g").attr("transform", `translate(${x},${y})`);

        if (isDarkMode) {
          labelG.append("circle")
            .attr("r", 22)
            .attr("fill", "black")
            .attr("fill-opacity", 0.4)
            .attr("filter", "blur(6px)");
        }

        labelG.append("text")
         .attr("dy", "0.35em")
         .attr("text-anchor", "middle")
         .attr("fill", textColor)
         .attr("fill-opacity", 0.9)
         .style("font-size", "15px")
         .style("font-weight", "900")
         .style("font-variant-numeric", "tabular-nums")
         .style("letter-spacing", "0.05em")
         .style("pointer-events", "none")
         .text(`${h}:00`);
    });

  }, [entries, width, height, onSliceClick, isDarkMode]);

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
       <div className="relative">
         {isDarkMode && <div className="absolute inset-0 bg-white/5 rounded-full blur-[150px] animate-pulse pointer-events-none" />}
         <svg 
            ref={svgRef} 
            width={width} 
            height={height} 
            viewBox={`0 0 ${width} ${height}`} 
            className={`max-w-full h-auto ${isDarkMode ? 'drop-shadow-[0_0_140px_rgba(255,255,255,0.2)]' : 'drop-shadow-sm'} transition-all duration-1000`} 
         />
       </div>
    </div>
  );
};

export default CircadianDisk;
