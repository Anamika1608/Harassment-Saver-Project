// const host = "dashboard-azure-one.vercel.app"
const host = "localhost:3000"

chrome.runtime.onInstalled.addListener((details) => {
    console.log("🟦 Extension installed:", details.reason)
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("🟦 Received message:", request)
    console.log("🟦 From sender:", sender)
    
    try {
        switch(request.action) {
            case "capture_screenshot":
                chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                    console.log('🟦 Captured screenshot')
                    if (sendResponse) {
                        sendResponse({ success: true, data: dataUrl })
                    }
                })
                break
                
            case "initiateLogin":
                console.log("🟦 Initiating login...")
                chrome.tabs.create({
                    url: `http://${host}/auth/sign-in?source=extension`
                }, (tab) => {
                    console.log("🟦 Login tab created:", tab?.id)
                    if (sendResponse) {
                        sendResponse({ success: true, tabId: tab?.id })
                    }
                })
                break
                
            case "authenticated":
                console.log("🟦 Received auth token, storing...")
                chrome.storage.local.set({ authToken: request.token }, () => {
                    console.log('🟦 Token stored successfully')
                    if (sendResponse) {
                        sendResponse({ success: true })
                    }
                    
                    // // Close the login tab if it exists
                    // if (sender.tab?.id) {
                    //     chrome.tabs.remove(sender.tab.id)
                    // }
                })
                break
                
            default:
                console.log("🟦 Unknown action:", request.action)
                if (sendResponse) {
                    sendResponse({ success: false, error: "Unknown action" })
                }
        }
    } catch (error) {
        console.error("🔴 Error in background script:", error)
        if (sendResponse) {
            sendResponse({ success: false, error: error.message })
        }
    }
    
    return true
})