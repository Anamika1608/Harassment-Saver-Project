import type { PlasmoContentScript } from "plasmo"

export const config: PlasmoContentScript = {
  matches: ["http://localhost:3000/*"],
  all_frames: true,
  run_at: "document_end"
}

console.log("🟦 Dashboard content script starting!")

// Main authentication logic
const setupAuthListener = () => {
  console.log("🟦 Setting up auth listener")
  
  // Function to check and send token
  const checkAndSendToken = () => {
    const token = localStorage.getItem('authToken')
    console.log("🟦 Current token:", token?.substring(0, 10) + "...")
    
    if (token) {
      console.log("🟦 Found token, sending to extension")
      chrome.runtime.sendMessage({
        action: "authenticated",
        token: token
      }, (response) => {
        console.log("🟦 Auth message response:", response)
        
        // Only close if we're on sign-in page and came from extension
        if (window.location.pathname === '/auth/sign-in') {
          const params = new URLSearchParams(window.location.search)
          if (params.get('source') === 'extension') {
            console.log("🟦 Closing login window")
            window.close()
          }
        }
      })
    }
  }

  // Check immediately
  checkAndSendToken()

  // Listen for storage changes
  window.addEventListener('storage', (e) => {
    console.log("🟦 Storage changed:", e)
    if (e.key === 'authToken') {
      checkAndSendToken()
    }
  })

  // Also check periodically
  const interval = setInterval(checkAndSendToken, 1000)

  // Cleanup
  window.addEventListener('unload', () => clearInterval(interval))
}

// Initialize
const init = () => {
  console.log("🟦 Initializing dashboard content script")
  console.log("🟦 Current URL:", window.location.href)
  
  // Wait for document to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthListener)
  } else {
    setupAuthListener()
  }
}

init()

export {}