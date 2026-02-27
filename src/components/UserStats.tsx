'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Award, Clock, Zap, BarChart3, BookOpen } from 'lucide-react';
import { UserSkillContext, SkillNode } from '@/lib/types';

interface UserStatsProps {
  refreshTrigger: number;
}

export default function UserStats({ refreshTrigger }: UserStatsProps) {
  const [stats, setStats] = useState<{
    avgMastery: number;
    totalUpdates: number;
    topSkill: string;
    lastActive: string;
    level: string;
    threadCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/skills', { cache: 'no-store' });
      const context: UserSkillContext = await res.json();
      
      const skills = Object.values(context.skills);
      const threadCount = context.threadSummaries?.length || 0;
      
      if (skills.length === 0) {
        setLoading(false);
        return;
      }

      const avgMastery = skills.reduce((acc, s) => acc + s.masteryProbability, 0) / skills.length;
      const totalUpdates = skills.reduce((acc, s) => acc + s.history.length, 0);
      
      const sortedSkills = [...skills].sort((a, b) => b.masteryProbability - a.masteryProbability);
      const topSkill = sortedSkills[0].name;

      const latestUpdate = skills.reduce((latest, s) => {
        const skillLatest = s.lastUpdated;
        return skillLatest > latest ? skillLatest : latest;
      }, '1970-01-01');

      // Determine level name
      let level = 'Beginner';
      if (avgMastery > 0.7) level = 'Advanced';
      else if (avgMastery > 0.4) level = 'Intermediate';

      setStats({
        avgMastery: avgMastery * 100,
        totalUpdates,
        topSkill,
        lastActive: new Date(latestUpdate).toLocaleDateString(),
        level,
        threadCount
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load stats', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-20 bg-slate-800 rounded-lg"></div>
    <div className="h-20 bg-slate-800 rounded-lg"></div>
  </div>;

  if (!stats) return <div className="text-slate-500 text-sm italic">No stats available yet.</div>;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Performance Overview</h3>
      
      {/* Level Card */}
      <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Award size={24} />
        </div>
        <div>
          <div className="text-xs text-emerald-500/70 font-medium uppercase">Current Rank</div>
          <div className="text-xl font-bold text-slate-100">{stats.level}</div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
            <TrendingUp size={18} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Avg. Mastery</div>
            <div className="text-base font-semibold text-slate-200">{stats.avgMastery.toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Zap size={18} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Progressions</div>
            <div className="text-base font-semibold text-slate-200">{stats.totalUpdates} increments</div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
            <BarChart3 size={18} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Strongest Topic</div>
            <div className="text-base font-semibold text-slate-200 truncate">{stats.topSkill}</div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <BookOpen size={18} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Knowledge Threads</div>
            <div className="text-base font-semibold text-slate-200">{stats.threadCount} archived</div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-500/10 flex items-center justify-center text-slate-400">
            <Clock size={18} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Last Active</div>
            <div className="text-base font-semibold text-slate-200">{stats.lastActive}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
