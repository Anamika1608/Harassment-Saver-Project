import type { PlasmoMessaging } from "@plasmohq/messaging"
import axios from "axios"
import { getToken } from "~utils/auth"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const { body } = req
    console.log("Request body received:", body)

    try {
        const cleanedAuthToken = await getToken()

        const payload = {
            hiddenBy: body.hiddenBy,
            userId: body.userId || null,
            name: body.name,
            profileUrl: body.profileUrl, // harraser linkedin profile url
            platform: body.platform || "linkedIn",
            reason: body.reason || "Not specified",
        }

        const response = await axios.post(
            'https://harassment-saver-extension.onrender.com/api/v1/user/hide-user',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${cleanedAuthToken.trim()}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        console.log("API Response:", response.data)

        res.send({
            success: true,
            data: response.data
        })

    } catch (error) {
        console.error('Error saving hidden user:', error)

        res.send({
            success: false,
            error: error.message || 'Failed to save hidden user'
        })
    }
}

export default handler
