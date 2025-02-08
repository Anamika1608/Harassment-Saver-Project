import type { PlasmoMessaging } from "@plasmohq/messaging"

interface HarassmentMessage {
    messageId: string;
    message: string;
    timestamp: number;
    metadata: any;
}

// Helper function for Upstash requests
const upstashRequest = async (command: string, key: string, value?: any) => {
    const url = `${process.env.PLASMO_PUBLIC_UPSTASH_URL}/${command}/${key}${value ? `/${JSON.stringify(value)}` : ''}`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.PLASMO_PUBLIC_UPSTASH_TOKEN}` }
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
