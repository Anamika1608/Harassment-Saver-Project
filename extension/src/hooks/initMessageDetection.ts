import { debounce } from 'lodash';
import type { PlasmoCSConfig } from "plasmo";
import { sendToBackground } from "@plasmohq/messaging";
import { getToken } from "~utils/auth";

export const config: PlasmoCSConfig = {
    matches: ["https://www.linkedin.com/*", "https://www.instagram.com/*"]
};

let foundLastProcessedMsg = false;

// Cache to store recently processed messages 
const processedMessageIds = new Set<string>();
const MESSAGE_CACHE_LIMIT = 1000;

// Clean message content
const cleanMessage = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || "";
    return text.trim();
};

// Handle preview message UI updates
const updatePreviewUI = (element: HTMLElement) => {
    element.innerHTML = '<i style="color: red;">Harassment detected in last message</i>';
    element.classList.add('message-processed');
};

// Handle inbox message UI updates
const updateInboxUI = async (element: HTMLElement, message: string) => {
    element.classList.add('message-processed');
    element.setAttribute('data-original-message', message);

    const warningContent = document.createElement('div');
    warningContent.innerHTML = '<i style="color: red; padding: 8px">Harassment detected in this message</i>';
    element.textContent = '';
    element.appendChild(warningContent);
    element.style.border = "3px dashed red";

};


// Add login prompt
const addLoginPrompt = () => {
    const bottomElement = document.querySelector('.msg-s-message-list__bottom-of-list');
    if (!bottomElement || document.getElementById('login-prompt')) return;

    const loginPrompt = document.createElement('div');
    loginPrompt.id = 'login-prompt';
    loginPrompt.innerHTML = `
        <div style="
            display: flex; 
            align-items: center; 
            gap: 8px; 
            padding: 8px 12px; 
            background: rgba(34, 197, 94, 0.1);
            border-radius: 6px; 
            font-size: 14px;
        ">
            <span style="color: #22c55e; flex: 1;">Want to save your messages?</span>
            <a href="https://dashboard-azure-one.vercel.app/auth/sign-in?source=extension" 
               style="color: #fff; background: #22c55e; padding: 4px 10px; border-radius: 4px; 
                      text-decoration: none; font-weight: bold; transition: background 0.3s ease;"
               onmouseover="this.style.background='#16a34a'"
               onmouseout="this.style.background='#22c55e'">
                Login
            </a>
        </div>
    `;
    bottomElement.appendChild(loginPrompt);
};


// Extract message metadata
const extractMessageMetadata = (element: Element) => {
    try {
        // Get all the elements synchronously
        const mainContainer = element.closest('.msg-s-event-listitem');
        if (!mainContainer) {
            console.log("Main container not found");
            return null;
        }

        const metaDiv = mainContainer.querySelector('.msg-s-message-group__meta');
        if (!metaDiv) {
            console.log("Meta div not found");
            return null;
        }

        const profileLink = metaDiv.querySelector('a[data-test-app-aware-link]');
        const nameElement = metaDiv.querySelector('.msg-s-message-group__name');
        const timeElement = metaDiv.querySelector('.msg-s-message-group__timestamp');

        console.log("profileLink", profileLink);
        console.log("timeelement", timeElement);

        // Return the metadata object
        return {
            profileUrl: profileLink?.href || 'URL not found',
            userName: nameElement?.textContent?.trim() || 'Name not found',
            timeOfMessage: timeElement?.textContent?.trim() || 'Time not found'
        };
    } catch (error) {
        console.error("Error extracting metadata:", error);
        return null;
    }
};


// Generate message ID
const generateMessageId = (element: Element): string => {
    const mainContainer = element.closest('.msg-s-event-listitem');

    console.log("data-event-urn direct access:", mainContainer?.getAttribute('data-event-urn'));

    console.log(mainContainer.attributes);

    // Get the unique URN from the data attribute
    const eventUrn = mainContainer?.getAttribute('data-event-urn');

    if (!eventUrn) {
        throw new Error('Message element is missing data-event-urn attribute');
    }

    // Extract the part after the comma
    const parts = eventUrn.split(',');
    if (parts.length < 2) {
        throw new Error('Invalid URN format');
    }

    // Remove special characters and extract the first 12 characters
    const uniqueId = parts[1].replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);

    console.log("message uniqueId", uniqueId)

    return uniqueId;
};


const extractProfileUrl = () => {
    const titleBar = document.querySelector('.msg-title-bar__title-bar-title');
    if (!titleBar) return null;

    const profileLink = titleBar.querySelector('.msg-thread__link-to-profile');
    return profileLink?.getAttribute('href') || null;
};

// Check if message is after last processed timestamp
const isMessageAfterLastProcessed = async (
    userDecodedId: string,
    profileUrl: string,
    messageId: string
): Promise<boolean> => {
    const lastProcessed = await sendToBackground({
        name: "getLastMsgId",
        body: { userDecodedId, profileUrl }
    });

    if (!lastProcessed?.messageId) {
        return true; // No last processed message, means we should process everything
    }

    return messageId === lastProcessed.messageId; // Return true if we hit the benchmark message
};


const processMessage = async (element: Element, isPreview: boolean, userDecodedId: string | null) => {
    console.log("inside processMessage handler");
    const messageId = 'asdfghjkl';
    const profileUrl = extractProfileUrl();


    if (processedMessageIds.has(messageId) || element.classList.contains('message-processed')) {
        return;
    }

    const rawMessage = element.innerHTML || "";
    // console.log('raw msg',rawMessage)
    const cleanedMessage = cleanMessage(rawMessage);
    console.log("cleaned message -> ", cleanedMessage);

    if (!cleanedMessage) return;



    try {

        if (userDecodedId != null) {
            const upstashResult = await sendToBackground({
                name: "checkHarassmentMsgId",
                body: { messageId, userDecodedId }
            });

            if (upstashResult.found) {
                if (isPreview) {
                    updatePreviewUI(element as HTMLElement);
                } else {
                    await updateInboxUI(element as HTMLElement, cleanedMessage);
                }
                processedMessageIds.add(messageId);
                return;
            }
        }


        if (!foundLastProcessedMsg) {
            foundLastProcessedMsg = await isMessageAfterLastProcessed(userDecodedId, profileUrl, messageId);
        }

        console.log("i have come here");

        if (userDecodedId == null || foundLastProcessedMsg) {
            const apiResult = await sendToBackground({
                name: "detectMsg",
                body: { message: cleanedMessage }
            });

            console.log("apiresult", apiResult.data);

            if (apiResult.data) {
                console.log("ispreview", isPreview)
                if (isPreview) {
                    console.log("before calling the updatePreviewUI")
                    updatePreviewUI(element as HTMLElement);
                } else {
                    console.log("before calling the updateInboxUI")
                    await updateInboxUI(element as HTMLElement, cleanedMessage);
                    if (userDecodedId != null) {

                        await sendToBackground({
                            name: "updateLastMsgId",
                            body: {
                                userDecodedId,
                                profileUrl,
                                messageId
                            }
                        });
                    }
                }

                if (userDecodedId != null) {
                    await sendToBackground({
                        name: "saveHarassmentMsgId",
                        body: {
                            userDecodedId,
                            messageId,
                        }
                    });

                    const metadata = await extractMessageMetadata(element);
                    console.log("msg meta data", metadata)

                    if (!metadata) {
                        console.error("Failed to extract message metadata");
                        return;
                    }

                    await sendToBackground({
                        name: "saveMsgToDB",
                        body: {
                            hiddenBy: userDecodedId,
                            profileUrl: metadata.profileUrl,
                            userName: metadata.userName,
                            messageContent: cleanedMessage,
                            timeOfMessage: metadata.timeOfMessage,
                            platform: "linkedIn"
                        }
                    });
                }
            }
        }

        processedMessageIds.add(messageId);
        element.classList.add('message-processed');

    } catch (error) {
        console.error("Error processing message:", error);
    }
};

const createProcessMessages = (userDecodedId: string | null) => {
    return debounce(() => {
        if (window.location.href.includes("/messaging")) {
            foundLastProcessedMsg = false;

            document.querySelectorAll(".msg-conversation-card__message-snippet-container:not(.message-processed)")
                .forEach(element => processMessage(element as HTMLElement, true, userDecodedId));

            document.querySelectorAll(".msg-s-event-listitem__body:not(.message-processed)")
                .forEach(element => processMessage(element as HTMLElement, false, userDecodedId));
        }
    }, 500);
};


export const initMessageDetection = (userDecodedId: string | null) => {
    console.log("before process msg");
    const processMessages = createProcessMessages(userDecodedId);
    processMessages();

    const observer = new MutationObserver(() => processMessages());

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return () => {
        observer.disconnect();
    };
};

const cleanupCache = () => {
    if (processedMessageIds.size > MESSAGE_CACHE_LIMIT) {
        const messageArray = Array.from(processedMessageIds);
        processedMessageIds.clear();
        messageArray.slice(-MESSAGE_CACHE_LIMIT).forEach(id => processedMessageIds.add(id));
    }
};

setInterval(cleanupCache, 5 * 60 * 1000); // Clean every 5 minutes if needed

