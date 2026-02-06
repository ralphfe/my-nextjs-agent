import { handleChatStream } from '@mastra/ai-sdk';
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui'
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';
import { NextResponse } from 'next/server';

const RESOURCE_ID = 'ai-chatbot';

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
        return NextResponse.json({ error: 'chatId query parameter is required' }, { status: 400 });
    }

    const params = await req.json();
    const stream = await handleChatStream({
        mastra,
        agentId: 'routing-agent',
        params: {
            ...params,
            memory: {
                ...params.memory,
                thread: chatId,
                resource: RESOURCE_ID,
            }
        },
    });
    return createUIMessageStreamResponse({ stream });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
        return NextResponse.json({ error: 'chatId query parameter is required' }, { status: 400 });
    }

    const memory = await mastra.getAgentById('routing-agent').getMemory()
    let response = null

    try {
        response = await memory?.recall({
            threadId: chatId,
            resourceId: RESOURCE_ID,
        })
    } catch {
        console.log('No previous messages found.')
    }

    const uiMessages = toAISdkV5Messages(response?.messages || []);

    return NextResponse.json(uiMessages)
}