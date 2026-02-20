import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserContext, saveUserContext } from '@/lib/storage';
import { generatePersonaStub, updateSkill, clamp } from '@/lib/skill-graph';
import { Message, SkillNode, SkillCategory } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Simple keyword mapping for topic detection (V1)
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

    // Default to a general bucket if no specific topic found, or just return empty
    // If empty, the persona generator handles it.
    return Array.from(topics);
}

function analyzeSentimentForUpdate(content: string): 'correct' | 'confusion' | 'struggle' | null {
    const lower = content.toLowerCase();
    if (lower.includes('understood') || lower.includes('got it') || lower.includes('thanks') || lower.includes('clear')) {
        return 'correct';
    }
    if (lower.includes('confused') || lower.includes('dont understand') || lower.includes('hard') || lower.includes('what?')) {
        return 'confusion';
    }
    // 'struggle' might be inferred from repeated questions, but hard to do in single turn stateless analysis without session history
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages } = body;
        const lastMessage = messages[messages.length - 1]; // User message
        const history = messages.slice(0, -1);

        if (!lastMessage) {
            return NextResponse.json({ error: 'No message provided' }, { status: 400 });
        }

        // 1. Load Context
        let userContext = await getUserContext();

        // 2. Identify Topics
        const topics = detectTopics(lastMessage.content);

        // 3. Update Skills based on implicit feedback in *this* message (e.g. "I understood the last part")
        // Note: This matches the requirement "Analyze response + user feedback". 
        // Ideally we analyze the *previous* turn's success, but here we check if the user is explicitly confirming understanding of previous.
        const sentiment = analyzeSentimentForUpdate(lastMessage.content);
        if (sentiment && topics.length > 0) {
            // Update all detected topics? Or topics from *previous* turn? 
            // For V1, we'll update currently detected topics or if explicit "I understood recursion"
            // If user says "I understood", we need to know *what*.
            // Let's assume the detected topics in the current message (e.g. "I understood recursion") are targets.
            // If no topics detected but sentiment exists, maybe use last updated?
            // For simplicity V1: Update detected topics.

            topics.forEach(topic => {
                // Find or create skill node?
                // Our `user_skills.json` has specific IDs. We need to map Category -> Skill ID.
                // This is a bit tricky with the static JSON structure. 
                // Let's assume we map categories to the keys in `user_skills.json` that match.

                Object.values(userContext.skills).forEach((skill: SkillNode) => {
                    if (skill.category === topic || skill.name === topic) {
                        userContext.skills[skill.id] = updateSkill(userContext.skills[skill.id], sentiment, "Implicit user feedback");
                    }
                });
            });
            await saveUserContext(userContext);
        }

        // 4. Generate Persona Stub
        const personaStub = generatePersonaStub(userContext, topics);

        // 5. Construct System Prompt
        const systemPrompt = `
You are an Adaptive Programming Mentor.

Your purpose is to teach programming, data structures & algorithms (DSA), system design, and related software engineering topics in a way that is calibrated to the user's current skill level.

You are NOT a generic assistant.
You are a persistent, state-aware mentor.

You will receive a "User Skill Context" block below. This context reflects the current estimated proficiency of the user and known weaknesses.

You must strictly use that context to calibrate:
- Depth of explanation
- Abstraction level
- Use of terminology
- Amount of scaffolding
- Whether to include code examples
- Whether to include conceptual linking

${personaStub}

Teaching Rules:
1. Match explanation depth to user skill level.
2. If the user struggles with linking concepts, explicitly connect related ideas.
3. Always be technically correct. Prefer C++ unless specified.
4. Use meaningful variable names.
5. Ask one small diagnostic question to test understanding when appropriate.
6. Do NOT over-explain if skill is strong.

Your goal is long-term skill growth.
`;

        // 6. Call LLM
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('API Key is missing');
            return NextResponse.json({ error: 'API Key is missing' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Convert history to Gemini format
        // Gemini: parts: [{text: "..."}], role: "user" | "model"
        const chatHistory = history.map((msg: Message) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // Prepend system prompt to history to avoid API version issues with systemInstruction
        const finalHistory = [
            {
                role: "user",
                parts: [{ text: systemPrompt }]
            },
            {
                role: "model",
                parts: [{ text: "Understood. I am ready to act as the Adaptive Programming Mentor based on the provided context." }]
            },
            ...chatHistory
        ];

        const chatSession = model.startChat({
            history: finalHistory,
        });

        const result = await chatSession.sendMessageStream(lastMessage.content);

        // 7. Stream Response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (err) {
                    console.error('Stream error:', err);
                    controller.error(err);
                }
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error: any) {
        console.error('Error in chat API:', error);
        if (error.response) {
            console.error('Error details:', JSON.stringify(error.response, null, 2));
        }
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
