import type { PlasmoMessaging } from "@plasmohq/messaging"

// Helper function for Upstash requests
const upstashRequest = async (command: string, key: string, value?: any) => {
    const url = `${process.env.PLASMO_PUBLIC_UPSTASH_URL}/${command}/${key}${value ? `/${JSON.stringify(value)}` : ''}`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.PLASMO_PUBLIC_UPSTASH_TOKEN}` }
    });
    return await response.json();
};

// Generate consistent key for Upstash storage
const generateMessageKey = (userDecodedId: string, profileUrl: string) => {
    return `last_processed_id:${userDecodedId}:${encodeURIComponent(profileUrl)}`;
};


const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    try {
        const { userDecodedId, profileUrl, messageId } = req.body;

        if (!profileUrl || !messageId) {
            throw new Error("Profile URL and message ID are required");
        }

        const messageKey = generateMessageKey(userDecodedId, profileUrl);
        await upstashRequest('set', messageKey, messageId);

        res.send({ success: true });
    } catch (error) {
        console.error(`Error in ${req.name} handler:`, error);
        res.send({ success: false, error: error.message });
    }
};

export default handler;
