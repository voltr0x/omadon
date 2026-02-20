'use client';

import React, { useEffect, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { UserSkillContext, SkillNode } from '@/lib/types'; // Assuming types are exported from lib/types

interface SkillGraphProps {
  refreshTrigger: number;
}

export default function SkillGraph({ refreshTrigger }: SkillGraphProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkills();
  }, [refreshTrigger]);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const context: UserSkillContext = await res.json();
      
      // Transform skills map to array for Recharts
      const chartData = Object.values(context.skills).map((skill: SkillNode) => ({
        subject: skill.name, // or skill.category
        A: skill.masteryProbability * 100, // Scale to 0-100 for better viz
        fullMark: 100,
        confidence: skill.confidence,
      }));
      
      setData(chartData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load skills', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading skills...</div>;
  
  if (data.length === 0) return <div className="text-gray-400 text-sm">No skill data yet. start chatting!</div>;

  return (
    <div className="w-full h-64 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
      <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Skill Mastery</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Mastery"
            dataKey="A"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.5}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
            itemStyle={{ color: '#10b981' }}
            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Mastery']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
