export type SkillCategory = 'DSA' | 'DP' | 'Recursion' | 'System Design' | 'C++ Syntax' | 'Complexity Analysis' | string;

export interface SkillNode {
  id: string; // e.g., "dsa-recursion"
  name: string; // "Recursion"
  category: SkillCategory;
  masteryProbability: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  lastUpdated: string; // ISO Date
  history: Array<{
    timestamp: string;
    change: number;
    reason: string;
  }>;
}

export interface ThreadSummary {
  id: string;
  domain: string;
  summary: string;
  timestamp: string;
}

export interface UserSkillContext {
  id: string;
  skills: Record<string, SkillNode>;
  threadSummaries: ThreadSummary[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
