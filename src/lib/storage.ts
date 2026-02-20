import fs from 'fs/promises';
import path from 'path';
import { UserSkillContext } from './types';
import { initializeUserContext } from './skill-graph';

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'user_skills.json');

export async function getUserContext(): Promise<UserSkillContext> {
    try {
        const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or error, return default
        return initializeUserContext();
    }
}

export async function saveUserContext(context: UserSkillContext): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(DATA_FILE_PATH);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(context, null, 2), 'utf-8');
}
