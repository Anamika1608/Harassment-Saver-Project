import { useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"
import { initMessageDetection } from "~hooks/initMessageDetection"
import { getToken } from "~utils/auth"

let areMessagesHidden = true

const decodeToken = async (token: string) => {
  try {
    const response = await sendToBackground({
      name: "decodeToken",
      body: { token }
    });
    console.log("token in content.tsx", response)
    return response;
  } catch (error) {
    console.error("Error decoding token:", error);
    return { userId: null };
  }
};

const initializeMessaging = async () => {
  try {
    const token = await getToken();
    if (!token) {
      console.log("No token available");
      return null;
    }

    const response = await decodeToken(token);
    console.log("userid", response.userId);
    return response.userId || null;
  } catch (error) {
    console.error("Error initializing messaging:", error);
    return null;
  }
};


export const config: PlasmoCSConfig = {
  matches: ["https://www.linkedin.com/*", "https://www.instagram.com/*"]
}

const injectCustomStyles = () => {
  const style = document.createElement("style")
  style.textContent = `
    /* Scoped styles for our injected elements only */
    .harassment-warning-style {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #fff3f3;
      border: 1px solid #ffcccc;
      padding: 8px 12px;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .warning-text-style {
      color: #d32f2f;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .buttons-container {
      display: flex;
      gap: 8px;
    }

    .show-messages-btn-style,
    .generate-report-btn-style,
    .hide-user-btn-style {
      border: none;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.3s ease;
    }

    .show-messages-btn-style {
      background-color: #d32f2f;
      color: white;
    }

    .generate-report-btn-style {
      background-color: #1976d2;
      color: white;
    }

    .hide-user-btn-style {
      background-color: #6a6a6a;
      color: white;
    }

    .show-messages-btn-style:hover {
      background-color: #b71c1c;
    }

    .generate-report-btn-style:hover {
      background-color: #1565c0;
    }

    .hide-user-btn-style:hover {
      background-color: #404040;
    }

    .harassment-batch {
      display: inline-block;
      background-color: red;
      color: white;
      font-size: 12px;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 12px;
      margin-top: 8px;
      text-transform: uppercase;
    }
  `
  document.head.appendChild(style)
}



//function to hide the messages inside the box
const toggleMessages = () => {
  const chatPreviews = document.querySelectorAll(
    ".msg-s-event-listitem__body"
  );

  const showMessagesBtn = document.getElementById("show-messages-btn");
  areMessagesHidden = !areMessagesHidden;

  chatPreviews.forEach((preview) => {
    const messageContainer = preview as HTMLElement;
    const originalMessage = messageContainer.getAttribute('data-original-message');

    if (originalMessage != null) {
      messageContainer.classList.add('message-processed');

      if (!areMessagesHidden) {
        console.log("Showing original message:", originalMessage);
        const newContent = document.createElement('div');
        newContent.innerHTML = `<i style="color: black; padding: 8px">${originalMessage}</i>`;

        messageContainer.textContent = '';
        messageContainer.appendChild(newContent);
        messageContainer.style.border = "3px dashed orange";
      } else {
        console.log("Showing warning message");
        const warningContent = document.createElement('div');
        warningContent.innerHTML = '<i style="color: red; padding: 8px">Harassment detected in this message</i>';

        messageContainer.textContent = '';
        messageContainer.appendChild(warningContent);
        messageContainer.style.border = "3px dashed red";
      }
    }
  });

  if (showMessagesBtn) {
    showMessagesBtn.innerText = areMessagesHidden ? "Show Messages" : "Hide Messages";
  }
}



// Hide user left and right panel
const hideAbusivePersonChatPreview = (targetName: string) => {
  // Hide left inbox items
  const conversations = document.querySelectorAll('.msg-conversations-container__pillar');
  conversations.forEach(conversation => {
    const nameElement = conversation.querySelector(
      '.msg-conversation-listitem__participant-names .truncate'
    );
    const currentName = nameElement?.textContent?.trim();
    if (currentName === targetName) {
      (conversation as HTMLElement).style.display = 'none';
    }
  });

  // Hide right chat panel

  const rightPanels = document.querySelectorAll('.msg-convo-wrapper');
  rightPanels.forEach(panel => {
    const profileLink = panel.querySelector<HTMLAnchorElement>('a.msg-thread__link-to-profile');
    if (profileLink?.title) {
      const nameFromTitle = profileLink.title
        .replace('Open ', '')
        .replace('’s profile', '')
        .trim();

      if (nameFromTitle === targetName) {
        console.log('Hiding right panel for:', nameFromTitle);
        (panel as HTMLElement).innerHTML = " ";
      }
    }
  });
};

const handleHideUser = async () => {
  console.log("in the fn")
  const harassmentWarning = document.getElementById('harassment-warning');

  const messageListContainer = harassmentWarning.closest('.msg-s-message-list-container');

  const parentContainer = messageListContainer.parentElement;

  const msgTitleBar = parentContainer.querySelector('.msg-title-bar');

  const profileLink = msgTitleBar.querySelector('a.msg-thread__link-to-profile');

  const title = profileLink.title
  const name = title.split("Open ")[1].split("’s profile")[0];

  console.log(name);

  const profileUrl = profileLink.href;

  const authToken = await getToken();

  if (authToken) {
    try {
      const userId = decodeToken(authToken)
      await sendToBackground({
        name: "hideUser",
        body: {
          profileUrl,
          name,
          platform: "linkedIn",
          hiddenBy: userId
        }
      });
    } catch (error) {
      console.error('Error hiding the user:', error);
    }
  }

  console.log('Profile URL:', profileUrl);
  hideAbusivePersonChatPreview(name)

};

const handleHidingUserOnReload = async () => {
  try {
    const authToken = await getToken();

    if (!authToken) {
      console.log('No token available, skipping API call.');
      return;
    }

    const response = await sendToBackground({ name: "getHiddenUsers" });

    if (response.success) {
      const hiddenUserNames = response.data.hiddenUsers.map(user => user.name);

      hiddenUserNames.forEach(name => {
        hideAbusivePersonChatPreview(name);
      });
    } else {
      console.error('Failed to fetch hidden users:', response.error);
    }
  } catch (error) {
    console.error('Error fetching hidden users:', error);
  }
};


const getFirstName = () => {
  const firstConversation = document.querySelector('.msg-conversations-container__pillar');
  if (!firstConversation) return null;

  const nameElement = firstConversation.querySelector(
    '.msg-conversation-listitem__participant-names .truncate'
  );

  console.log(nameElement?.textContent?.trim())

  return nameElement?.textContent?.trim() || null;
};


const injectShowButton = () => {

  const profileHeader = document.querySelector(
    ".msg-s-message-list__typing-indicator-container--without-seen-receipt"
  );

  if (profileHeader && !document.getElementById("harassment-warning")) {
    const warningDiv = document.createElement("div");
    warningDiv.id = "harassment-warning";
    warningDiv.classList.add("harassment-warning-style");

    const warningText = document.createElement("span");
    warningText.innerText = "⚠️ Our AI has detected harassment messages in this conversation. The messages are hidden for your safety.";
    warningText.classList.add("warning-text-style");

    const buttonsContainer = document.createElement("div");
    buttonsContainer.classList.add("buttons-container");

    const showMessagesBtn = document.createElement("button");
    showMessagesBtn.id = "show-messages-btn";
    showMessagesBtn.innerText = "Show Messages";
    showMessagesBtn.classList.add("show-messages-btn-style");
    showMessagesBtn.onclick = toggleMessages;

    const generateReportBtn = document.createElement("button");
    generateReportBtn.id = "generate-report-btn";
    generateReportBtn.innerText = "Legal Report";
    generateReportBtn.classList.add("generate-report-btn-style");
    generateReportBtn.onclick = () => {
      alert("Generating legal harassment report..."); // Replace with actual report generation logic
    };

    const hideUserBtn = document.createElement("button");
    hideUserBtn.id = "hide-user-btn";
    hideUserBtn.innerText = "Hide User";
    hideUserBtn.classList.add("hide-user-btn-style");
    hideUserBtn.onclick = () => {
      handleHideUser()
    };

    buttonsContainer.appendChild(showMessagesBtn);
    buttonsContainer.appendChild(generateReportBtn);
    buttonsContainer.appendChild(hideUserBtn);

    warningDiv.appendChild(warningText);
    warningDiv.appendChild(buttonsContainer);

    profileHeader.appendChild(warningDiv);
  }
}

const injectProfileTag = async () => {
  try {
    const profileHeader = document.querySelector(".wnKbnBreYpLiOFcEyNzGreWkeYPECQONxpxrQ");
    if (!profileHeader) {
      console.log("Profile header element not found");
      return;
    }

    const aTag = profileHeader.querySelector('a[aria-label]');
    console.log("a tag", aTag);
    if (!aTag) {
      console.log("Profile name element not found");
      return;
    }

    const name = aTag.getAttribute('aria-label');
    console.log("name", name)
    const profileUrl = aTag.href;
    const trimmedUrl = profileUrl.split('/overlay')[0];
    console.log("Trimmed URL:", trimmedUrl);


    // // Call backend API
    const response = await fetch(
      `http://localhost:3001/api/v1/user/check-dummy-harasser`
    );

    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);

    const { isHarasser } = await response.json();
    console.log("harr", isHarasser);

    // Only inject tag if user is a harasser
    if (isHarasser) {
      const existingTag = document.getElementById('profile-tag');
      if (existingTag) existingTag.remove();

      const tagContainer = document.createElement("span");
      tagContainer.id = "profile-tag";
      tagContainer.className = "profile-tag-style";
      tagContainer.style.cssText = "margin-left: 12px; display: inline-flex; align-items: center;";

      const tagContent = document.createElement("span");
      tagContent.style.cssText = `
        background-color: rgb(245, 225, 228);
        color: rgb(74, 2, 15);
        padding: 0.5rem 0.75rem;
        border-radius: 9999px;
        font-size: 1rem;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: 0.025em;
      `;
      tagContent.textContent = "# Harasser";

      tagContainer.appendChild(tagContent);
      profileHeader.appendChild(tagContainer);
    }
  } catch (error) {
    console.error('Error injecting profile tag:', error);
  }
};

const ContentScript = () => {
  useEffect(() => {
    const setupMessageDetection = async () => {
      try {
        // Initialize messaging and get userId
        const userId = await initializeMessaging();
        console.log("Initializing message detection with userId:", userId);

        // Other initialization
        injectCustomStyles();
        await handleHidingUserOnReload();

        // Check for existing harassment messages
        const chatPreviews = document.querySelectorAll(".msg-s-event-listitem__body");
        let hasExistingHarassment = false;

        for (const preview of chatPreviews) {
          const messageContainer = preview as HTMLElement;
          const originalMessage = messageContainer.getAttribute('data-original-message');
          if (originalMessage) {
            hasExistingHarassment = true;
            break;
          }
        }

        if (hasExistingHarassment) {
          injectShowButton();
        }

        // Initialize message detection with userId
        if (window.location.href.includes("/messaging")) {
          initMessageDetection(userId);
        }
      } catch (error) {
        console.error("Error in setupMessageDetection:", error);
      }
    };

    setupMessageDetection();
  }, [window.location.href]);

  return null;
};

export default ContentScript;
