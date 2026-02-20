import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/storage';

export async function GET() {
    try {
        const userContext = await getUserContext();
        return NextResponse.json(userContext);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
    }
}
