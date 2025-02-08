const profileEP = 'https://harassment-saver-extension.onrender.com/api/v1/user/profile'

import type { PlasmoMessaging } from "@plasmohq/messaging"
import axios from "axios"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const { token } = req.body
    console.log("tokeInProfile",token)

    if (!token) {
        return res.send({ error: "Authorization token is required" })
    }

    try {
        const response = await axios.get(profileEP, {
            headers: {
                'Authorization': `Bearer ${token.trim()}`,
            }
        })

        console.log("decodetoken",response)

        const userId = response.data.data.user.id
    
        res.send({
            userId
        })

    } catch (error) {
        console.error("API Error:", error)
        res.send({
            error: error.response?.data?.message || "Failed to fetch profile data"
        })
    }
}

export default handler