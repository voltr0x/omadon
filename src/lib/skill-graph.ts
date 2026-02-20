import { SkillNode, UserSkillContext, SkillCategory } from './types';

// Deterministic update values
const MASTERY_INCREMENT = 0.05;
const MASTERY_DECREMENT = 0.03;
const CONFIDENCE_DECREMENT_MULTIPLIER = 0.1;

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function updateSkill(
    skill: SkillNode,
    action: 'correct' | 'confusion' | 'struggle',
    reason: string
): SkillNode {
    const newSkill = { ...skill, history: [...skill.history] };
    const now = new Date().toISOString();

    if (action === 'correct') {
        newSkill.masteryProbability = clamp(newSkill.masteryProbability + MASTERY_INCREMENT, 0, 1);
        newSkill.confidence = clamp(newSkill.confidence + 0.02, 0, 1); // Slight confidence boost
    } else if (action === 'confusion') {
        newSkill.masteryProbability = clamp(newSkill.masteryProbability - MASTERY_DECREMENT, 0, 1);
        // Confidence might drop slightly or stay same, let's say drop slightly
        newSkill.confidence = clamp(newSkill.confidence - 0.01, 0, 1);
    } else if (action === 'struggle') {
        // Struggle mainly affects confidence, maybe slight mastery drop
        newSkill.confidence = clamp(newSkill.confidence - CONFIDENCE_DECREMENT_MULTIPLIER, 0, 1);
    }

    newSkill.lastUpdated = now;
    newSkill.history.push({
        timestamp: now,
        change: newSkill.masteryProbability - skill.masteryProbability,
        reason,
    });

    return newSkill;
}

export function generatePersonaStub(context: UserSkillContext, relevantCategories: SkillCategory[]): string {
    // Filter skills by relevant categories
    const relevantSkills = Object.values(context.skills).filter((skill) =>
        relevantCategories.includes(skill.category)
    );

    if (relevantSkills.length === 0) {
        return "User skill level is unknown. Assume beginner level and explain concepts clearly.";
    }

    const skillSummaries = relevantSkills.map((skill) => {
        let level = 'beginner';
        if (skill.masteryProbability > 0.8) level = 'expert';
        else if (skill.masteryProbability > 0.5) level = 'intermediate';

        return `- ${skill.name}: ${level} (Mastery: ${skill.masteryProbability.toFixed(2)}, Confidence: ${skill.confidence.toFixed(2)})`;
    });

    return `
User Skill Context:
${skillSummaries.join('\n')}

Teaching Strategy:
- For low mastery skills (< 0.5), provide step-by-step explanations and analogies.
- For intermediate skills (0.5 - 0.8), focus on structured explanations and best practices.
- For high mastery skills (> 0.8), be concise, discuss trade-offs, and edge cases.
- If confidence is low, verify understanding frequently.
`;
}

export function initializeUserContext(): UserSkillContext {
    return {
        id: 'default-user',
        skills: {
            'dsa-recursion': {
                id: 'dsa-recursion',
                name: 'Recursion',
                category: 'Recursion',
                masteryProbability: 0.2, // Default low
                confidence: 0.5,
                lastUpdated: new Date().toISOString(),
                history: [],
            },
            'dsa-dp': {
                id: 'dsa-dp',
                name: 'Dynamic Programming',
                category: 'DP',
                masteryProbability: 0.1,
                confidence: 0.4,
                lastUpdated: new Date().toISOString(),
                history: [],
            },
            'cpp-syntax': {
                id: 'cpp-syntax',
                name: 'C++ Syntax',
                category: 'C++ Syntax',
                masteryProbability: 0.5,
                confidence: 0.8,
                lastUpdated: new Date().toISOString(),
                history: [],
            },
        },
        threadSummaries: [],
    };
}
