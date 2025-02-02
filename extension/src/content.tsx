import { useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"

const abusiveWords = [
  "hate",
  "stupid",
  "ugly",
  "idiot",
  "bitch",
  "fuck off"
]

export const config: PlasmoCSConfig = {
  matches: ["https://www.linkedin.com/*", "https://www.instagram.com/*"]
}
import { getToken } from "~utils/auth"

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


// Function to detect harassment in a message
const detectHarassment = (message: string) => {
  return abusiveWords.some((word) =>
    message.toLowerCase().includes(word.toLowerCase())
  )
}

const cleanMessage = (html) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
};


// Function to hide abusive message previews
const hideAbusiveMessagesPreview = () => {
  const chatPreviews = document.querySelectorAll(
    ".msg-conversation-card__message-snippet-container"
  )


  chatPreviews.forEach((preview) => {
    const message = preview.innerHTML || ""

    if (detectHarassment(message)) {
      const messageContainer = preview as HTMLElement;
      if (messageContainer) {
        messageContainer.innerHTML = '<i style="color: red;">Harassment detected in last message</i>';
      }
    }
  })
}

const hideAbusiveMessagesPreviewInPopup = () => {
  // console.log("here in popup");
  const chatPreviews = document.querySelectorAll(
    ".msg-overlay-list-bubble__message-snippet-container--narrow-two-line"
  );
  // console.log(chatPreviews);

  chatPreviews.forEach((preview) => {
    const message = preview.innerHTML || "";
    console.log(message);
    if (detectHarassment(message)) {
      const messageContainer = preview as HTMLElement;
      if (messageContainer) {
        messageContainer.innerHTML = '<i style="color: red; font-size: 10px;">Harassment detected in last message</i>';
      }
    }
  });
};

let areMessagesHidden = true

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

// hide messages in personal chats

const hideAbusiveMessagesInbox = async () => {
  const chatPreviews = document.querySelectorAll(
    ".msg-s-event-listitem__body:not(.message-processed)"
  );

  // getToken()
  // const { authToken } = await new Promise<{ authToken?: string }>((resolve) => {
  //   chrome.storage.local.get(['authToken'], resolve);
  // });

  // Track if we've added the login prompt
  let loginPromptAdded = false;

  chatPreviews.forEach(async (preview) => {
    const message = preview.innerHTML || "";
    const cleanedMessage = cleanMessage(message);

    if (detectHarassment(cleanedMessage)) {
      // Navigate up to the main message container
      const mainContainer = preview.closest('.msg-s-event-listitem');
      if (!mainContainer) return;

      // Extract metadata from the message group meta section
      const metaDiv = mainContainer.querySelector('.msg-s-message-group__meta');
      if (!metaDiv) return;

      // 1. Get Profile URL
      const profileLink = metaDiv.querySelector('a[data-test-app-aware-link]');
      const profileUrl = profileLink?.href || 'URL not found';

      // 2. Get Name
      const nameElement = metaDiv.querySelector('.msg-s-message-group__name');
      const name = nameElement?.textContent?.trim() || 'Name not found';

      // 3. Get Time
      const timeElement = metaDiv.querySelector('.msg-s-message-group__timestamp');
      const time = timeElement?.textContent?.trim() || 'Time not found';

      // Message content
      const messageContent = cleanedMessage;

      // Final data object
      const messageData = {
        profileUrl,
        userName: name,
        timeOfMessage: time,
        messageContent,
        platform: "linkedIn"
      };

      console.log("Harassment detected:", messageData);


      const messageContainer = preview as HTMLElement;
      if (messageContainer) {
        messageContainer.classList.add('message-processed');
        messageContainer.setAttribute('data-original-message', cleanedMessage);

        const warningContent = document.createElement('div');
        warningContent.innerHTML = '<i style="color: red; padding: 8px">Harassment detected in this message</i>';

        messageContainer.textContent = '';
        messageContainer.appendChild(warningContent);
        messageContainer.style.border = "3px dashed red";

        const authToken = await getToken();

        if (authToken) {
          const cleanedAuthToken = authToken.replace(/^\s+|\s+$/g, '');

          console.log("auth token", cleanedAuthToken)
          try {
            const response = await fetch('https://harassment-saver-extension.onrender.com/api/v1/user/hide-message', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cleanedAuthToken.trim()}`,
              },
              body: JSON.stringify({
                profileUrl,
                userName: name,
                timeOfMessage: time,
                messageContent: cleanedMessage,
                platform: "linkedIn"
              })
            });
            console.log("response", response)

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            console.log('API response:', result);
          } catch (error) {
            console.error('Error reporting harassment:', error);
          }
        } else if (!loginPromptAdded) {
          // Add login prompt once
          const bottomElement = document.querySelector('.msg-s-message-list__bottom-of-list');
          if (bottomElement) {
            const existingPrompt = bottomElement.querySelector('#login-prompt');
            if (!existingPrompt) {
              const loginPrompt = document.createElement('div');
              loginPrompt.id = 'login-prompt';
              loginPrompt.innerHTML = `
              <div style="
                display: flex; 
                align-items: center; 
                gap: 8px; 
                padding: 8px 12px; 
                background: rgba(34, 197, 94, 0.1); /* Light green background */
                border-radius: 6px; 
                font-size: 14px;
              ">
                <span style="color: #22c55e; flex: 1;">
                  Want to save your messages? 
                </span>
                <a href="https://dashboard-azure-one.vercel.app/auth/sign-in?source=extension" style="
                  color: #fff; 
                  background: #22c55e; /* Green button */
                  padding: 4px 10px; 
                  border-radius: 4px; 
                  text-decoration: none;
                  font-weight: bold;
                  transition: background 0.3s ease;
                " 
                onmouseover="this.style.background='#16a34a'"
                onmouseout="this.style.background='#22c55e'">
                  Login
                </a>
              </div>
            `;


              bottomElement.appendChild(loginPrompt);
            }
            loginPromptAdded = true;
          }
        }
      }
    }
  });
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

        //     // Also hide any parent containers if needed
        //     const parentContainer = panel.closest('.scaffold-layout__main');
        //     if (parentContainer) {
        //       (parentContainer as HTMLElement).style.display = 'none';
        //     }
      }
    }
  });
};

const handleHideUser = async () => {
  console.log("in the fn")
  // Find the harassment warning element
  const harassmentWarning = document.getElementById('harassment-warning');

  // Traverse up to find the message list container
  const messageListContainer = harassmentWarning.closest('.msg-s-message-list-container');

  // Find the parent container that holds both the title bar and message list
  const parentContainer = messageListContainer.parentElement;

  // Locate the title bar section
  const msgTitleBar = parentContainer.querySelector('.msg-title-bar');

  // Extract the profile link from the title bar
  const profileLink = msgTitleBar.querySelector('a.msg-thread__link-to-profile');

  const title = profileLink.title
  const name = title.split("Open ")[1].split("’s profile")[0];

  console.log(name);

  const profileUrl = profileLink.href;

  // save in backend 

  const authToken = await getToken();


  if (authToken) {
    try {
      const response = await fetch('http://localhost:3000/api/v1/user/hide-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          profileUrl,
          name,
          platform: "linkedIn",
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      console.log('API response:', result);
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

    // const response = await fetch('http://localhost:3000/api/v1/user/hidden-users', {
    //   method: 'GET',
    //   headers: {
    //     Authorization: `Bearer ${authToken}`,
    //     'Content-Type': 'application/json',
    //   },
    // });

    // const result = await response.json();

    // if (result.status === 'success') {
    //   const hiddenUserNames = result.data.hiddenUsers.map(user => user.name)

    //   hiddenUserNames.forEach(name => {
    //     hideAbusivePersonChatPreview(name);
    //   });
    // } else {
    //   console.error('Failed to fetch hidden users:', result.message);
    // }
  } catch (error) {
    console.error('Error fetching hidden users:', error);
  }
};


// 2 condition - when user has clicked on hide user - check all the messages url 

// when he enters the app - then it will check the first message url

// Function to hide the entire chat if the user is flagged

const getFirstName = () => {
  const firstConversation = document.querySelector('.msg-conversations-container__pillar');
  if (!firstConversation) return null;

  const nameElement = firstConversation.querySelector(
    '.msg-conversation-listitem__participant-names .truncate'
  );

  console.log(nameElement?.textContent?.trim())

  return nameElement?.textContent?.trim() || null;
};



// const hideAbusivePersonChatPreview = (name) => {
//   // traverse through all the list and find the name of the person and check with the name of the parameter - if that matches - make the style of the whole inbox container to the display none


//   const chatPreviews = document.querySelectorAll(
//     ".msg-conversation-card__message-snippet"
//   )

//   chatPreviews.forEach((preview) => {
//     const message = preview.innerHTML || ""

//     if (detectHarassment(message)) {
//       const parentContainer = preview.closest(
//         ".scaffold-layout__list-item"
//       ) as HTMLElement
//       if (parentContainer) {
//         parentContainer.style.display = "none"
//       }
//     }
//   })
// }

// Function to inject the Block User button
// const injectBlockButton = () => {
//   const profileHeader = document.querySelector(
//     ".msg-conversations-container__convo-item"
//   )

//   if (profileHeader && !document.getElementById("block-user-btn")) {
//     const btn = document.createElement("button")
//     btn.id = "block-user-btn"
//     btn.innerText = "🚫 Block User"
//     btn.classList.add("block-btn-style")
//     btn.onclick = () => alert("User Blocked!")
//     profileHeader.appendChild(btn)
//   }
// }



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
    console.log("harr",isHarasser);
    
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

const checkForHarassmentMessages = () => {
  const chatPreviews = document.querySelectorAll(
    ".msg-s-event-listitem__body"
  )

  return Array.from(chatPreviews).some((preview) => {
    const message = preview.innerHTML || ""
    return detectHarassment(message)
  })
}


let isProcessing = false;

const observeMutations = () => {
  const observer = new MutationObserver(() => {
    if (isProcessing) return;
    isProcessing = true;
    const hasHarassmentMessage = checkForHarassmentMessages();
    hideAbusiveMessagesPreviewInPopup()
    hideAbusiveMessagesPreview()
    hideAbusiveMessagesInbox()
    handleHidingUserOnReload()
    // toggleMessages()

    if (hasHarassmentMessage) {
      injectShowButton()
    }
    requestAnimationFrame(() => {
      isProcessing = false;
    });
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  })

  observer.takeRecords()
}
const ContentScript = () => {
  useEffect(() => {
    injectCustomStyles() // Inject our scoped styles
    injectProfileTag()
    observeMutations()
  }, [])

  return null
}


export default ContentScript
