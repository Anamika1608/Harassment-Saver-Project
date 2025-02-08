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
        const { userDecodedId, messageId } = req.body;

        const result = await upstashRequest('get', `harassment:${userDecodedId}`);
        const harassmentMessages: HarassmentMessage[] = result.result ? JSON.parse(result.result) : [];

        console.log("harassmentMessages before saving to upstash",harassmentMessages)

        harassmentMessages.push(messageId);

        await upstashRequest('set', `harassment:${userDecodedId}`, harassmentMessages);

        res.send({ success: true });
    } catch (error) {
        console.error(`Error in ${req.name} handler:`, error);
        res.send({ success: false, error: error.message });
    }
}

export default handler;
