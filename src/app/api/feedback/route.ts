import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, saveUserContext } from '@/lib/storage';
import { updateSkill } from '@/lib/skill-graph';
import { SkillNode, SkillCategory } from '@/lib/types';

const TOPIC_KEYWORDS: Record<string, SkillCategory[]> = {
    recursion: ['Recursion', 'DSA'],
    recursive: ['Recursion', 'DSA'],
    dp: ['DP', 'DSA'],
    dynamic: ['DP', 'DSA'],
    design: ['System Design'],
    scaling: ['System Design'],
    cpp: ['C++ Syntax'],
    "c++": ['C++ Syntax'],
    vector: ['C++ Syntax', 'DSA'],
    complexity: ['Complexity Analysis'],
    "big o": ['Complexity Analysis'],
};

function detectTopics(content: string): SkillCategory[] {
    const contentLower = content.toLowerCase();
    const topics = new Set<SkillCategory>();

    for (const [jum, categories] of Object.entries(TOPIC_KEYWORDS)) {
        if (contentLower.includes(jum)) {
            categories.forEach(c => topics.add(c));
        }
    }
    return Array.from(topics);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, contextText } = body;

        if (!type || !contextText) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const topics = detectTopics(contextText);

        let userContext = await getUserContext();

        // If no specific topic detected, we could default to something or just return successfully without updating.
        if (topics.length > 0) {
            topics.forEach(topic => {
                Object.values(userContext.skills).forEach((skill: SkillNode) => {
                    if (skill.category === topic || skill.name === topic) {
                        userContext.skills[skill.id] = updateSkill(
                            userContext.skills[skill.id],
                            type === 'correct' ? 'correct' : 'confusion',
                            `Explicit user feedback on message`
                        );
                    }
                });
            });
            await saveUserContext(userContext);
            return NextResponse.json({ success: true, updatedTopics: topics });
        }

        return NextResponse.json({ success: true, updatedTopics: [] });
    } catch (error: any) {
        console.error('Error in feedback API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
