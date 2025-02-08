import type { PlasmoMessaging } from "@plasmohq/messaging"

const UPSTASH_URL = 'https://well-goblin-10590.upstash.io'
const UPSTASH_TOKEN = 'ASleAAIjcDEwZGEyYzAwZDJlN2E0ZjVjYjA3MTE2ZmI5NmI4MzhmZnAxMA'

interface HarassmentMessage {
    messageId: string;
    message: string;
    timestamp: number;
    metadata: any;
}

// Helper function for Upstash requests
const upstashRequest = async (command: string, key: string, value?: any) => {
    const url = `${UPSTASH_URL}/${command}/${key}${value ? `/${JSON.stringify(value)}` : ''}`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    return await response.json();
};

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    try {
        const { messageId, userDecodedId } = req.body;
        const result = await upstashRequest('get', `harassment:${userDecodedId}`);
        const harassmentMessages: HarassmentMessage[] = result.result ? JSON.parse(result.result) : [];

        res.send({ found: harassmentMessages.some(msg => msg.messageId === messageId) });
    } catch (error) {
        console.error(`Error in ${req.name} handler:`, error);
        res.send({ success: false, error: error.message });
    }
}

export default handler;
