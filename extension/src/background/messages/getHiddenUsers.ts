import type { PlasmoMessaging } from "@plasmohq/messaging"
import axios from "axios"
import { getToken } from "~utils/auth"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    try {
        const cleanedAuthToken = await getToken();

        if (!cleanedAuthToken) {
            return res.send({
                success: false,
                error: "Unauthorized: No auth token found."
            });
        }

        const response = await axios.get(
            'https://harassment-saver-extension.onrender.com/api/v1/user/hidden-users',
            {
                headers: {
                    'Authorization': `Bearer ${cleanedAuthToken.trim()}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("API Response:", response.data);

        res.send({
            success: true,
            data: response.data
        });

    } catch (error) {
        console.error('Error fetching hidden users:', error);

        res.send({
            success: false,
            error: error.message || 'Failed to fetch hidden users'
        });
    }
};

export default handler;
