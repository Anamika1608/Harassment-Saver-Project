import type { PlasmoMessaging } from "@plasmohq/messaging"
import axios from "axios"



const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    console.log("messages from req body", req.body)
    const { message } = req.body

    try {
        console.log("msg before axios req", message)
        const response = await axios.post(
            `https://harassment-saver-extension.onrender.com/api/v1/moderation/detect-harassment`,
            {
                message: message,
                platform: "linkedIn"
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        )

        console.log("isHarassment ", response.data.analysis.isHarassment)

        res.send({
            data: response.data.analysis.isHarassment
        })
    } catch (error) {
        console.error("API Error:", error)
        res.send({
            error: error.response?.data?.message || "Detection failed"
        })
    }
}

export default handler