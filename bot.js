import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// CONFIGURATION & ENVIRONMENT SETUP
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
    authDomain: "simplechat-e1787.firebaseapp.com",
    projectId: "simplechat-e1787",
    storageBucket: "simplechat-e1787.firebasestorage.app",
    messagingSenderId: "469168057769",
    appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
    measurementId: "G-KDWQTRWZSQ"
};

// Initialize Firebase App instance safely
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Bot Identity Constants
const BOT_NAME = "bot";
const BOT_AVATAR = "botpfp.png";
const BOT_BADGE = "bot.png";
const BOT_BIO = "beep boop. I am an automated bot system!";
const GREEN_COLOR_CODE = "#4ade80";

// Expanded Pool of Automated Random Messages / Fun Facts
const BOT_MESSAGES = [
    "Fun Fact: Bananas are berries, but strawberries aren't!",
    "Fun Fact: Honey never spoils. Archaeologists have found 3,000-year-old edible honey in Egyptian tombs!",
    "Fun Fact: Wombat poop is cube-shaped to keep it from rolling away!",
    "Fun Fact: A day on Venus is longer than a year on Venus!",
    "Fun Fact: Octopuses have three hearts and blue blood!",
    "Fun Fact: Cows have best friends and get stressed when they are separated!",
    "Fun Fact: Sea otters hold hands while sleeping so they don't float away from each other!",
    "Fun Fact: The world's oldest known living land animal is a 190+ year-old giant tortoise named Jonathan!",
    "Fun Fact: A flock of flamingos is officially called a 'flamboyance'!",
    "Fun Fact: Sound travels about 4.3 times faster in water than in air!"
];

// ==========================================
// 1. BOT PROFILE & MUTUAL FRIEND REQUEST AUTO-ACCEPT
// ==========================================
async function initBotProfile() {
    try {
        console.log("[Bot System] Initializing automated user profile in Firestore...");
        const userRef = doc(db, "users", BOT_NAME);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                username: BOT_NAME,
                bio: BOT_BIO,
                avatar: BOT_AVATAR,
                friends: [],
                friendRequests: [],
                blocked: [],
                lastSeen: serverTimestamp()
            });
            console.log("[Bot System] Created brand new bot profile successfully.");
        } else {
            await setDoc(userRef, {
                username: BOT_NAME,
                bio: BOT_BIO,
                avatar: BOT_AVATAR,
                lastSeen: serverTimestamp()
            }, { merge: true });
            console.log("[Bot System] Updated existing bot profile successfully.");
        }
    } catch (err) {
        console.error("[Bot System Error] Failed to register bot profile:", err);
    }
}
initBotProfile();

// Realtime Listener to Automatically Accept Requests & Sync Mutual Friendship in DMs
onSnapshot(doc(db, "users", BOT_NAME), async (docSnap) => {
    try {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const requests = data.friendRequests || [];
        const currentFriends = data.friends || [];

        if (requests.length > 0) {
            console.log("[Bot System] Incoming friend requests detected from:", requests);
            
            // 1. Update bot's friends list and clear requests
            const mergedFriends = Array.from(new Set([...currentFriends, ...requests]));
            await setDoc(doc(db, "users", BOT_NAME), {
                friendRequests: [],
                friends: mergedFriends
            }, { merge: true });
            
            // 2. Mutually update each user's document so the bot appears as their friend in DMs instantly
            for (const requesterUsername of requests) {
                try {
                    const requesterRef = doc(db, "users", requesterUsername);
                    const requesterSnap = await getDoc(requesterRef);
                    if (requesterSnap.exists()) {
                        const reqData = requesterSnap.data();
                        const reqFriends = reqData.friends || [];
                        if (!reqFriends.includes(BOT_NAME)) {
                            reqFriends.push(BOT_NAME);
                            await setDoc(requesterRef, { friends: reqFriends }, { merge: true });
                            console.log(`[Bot System] Added bot to user '${requesterUsername}' friends list for DM visibility.`);
                        }
                    }
                } catch (subErr) {
                    console.error(`[Bot System Error] Failed to update user profile for ${requesterUsername}:`, subErr);
                }
            }

            console.log("[Bot System] Automatically accepted and established mutual friendship successfully!");
        }
    } catch (err) {
        console.error("[Bot System Error] Failed to auto-accept friend request:", err);
    }
});

// ==========================================
// 2. TIMED ANNOUNCEMENTS & COOLDOWN CONTROLLER
// ==========================================
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

async function checkAndSendBotMessage() {
    try {
        console.log("[Bot Timer] Checking cooldown state for scheduled message broadcast...");
        const stateRef = doc(db, "bot_state", "timer");
        const stateSnap = await getDoc(stateRef);
        const now = Date.now();

        if (stateSnap.exists()) {
            const lastSent = stateSnap.data().lastSentTime || 0;
            if (now - lastSent < THREE_HOURS_MS) {
                console.log("[Bot Timer] Cooldown active. Skipping scheduled broadcast.");
                return;
            }
        }

        await setDoc(stateRef, { lastSentTime: now }, { merge: true });

        const randomIndex = Math.floor(Math.random() * BOT_MESSAGES.length);
        const randomMsg = BOT_MESSAGES[randomIndex];

        const messageData = {
            text: randomMsg,
            username: BOT_NAME,
            room: "global",
            recipient: null,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, "messages"), messageData);
        console.log("[Bot Timer] Successfully broadcasted automated message:", randomMsg);
    } catch (err) {
        console.error("[Bot Timer Error] Exception encountered during broadcast check:", err);
    }
}

// Execute cooldown check on load and set recurring interval
setTimeout(checkAndSendBotMessage, 3000);
setInterval(checkAndSendBotMessage, 10 * 60 * 1000);

// ==========================================
// 3. DATABASE LISTENER & COMMAND / TEXT HANDLER
// ==========================================
let isFirstSnapshot = true;

onSnapshot(collection(db, "messages"), (snapshot) => {
    if (isFirstSnapshot) {
        isFirstSnapshot = false;
        console.log("[Bot Database Listener] Initial snapshot loaded. Monitoring active stream...");
        return;
    }

    snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
            const docData = change.doc.data();
            const docId = change.doc.id;

            const text = (docData.text || docData.message || docData.content || "").trim();
            const sender = docData.username || docData.user || docData.sender || "someone";
            const recipient = docData.recipient ? docData.recipient.trim().toLowerCase() : null;

            // Ignore messages sent by the bot itself
            if (sender.toLowerCase() === BOT_NAME) return;

            let replyBody = "";
            let isTriggered = false;

            // Check if message is a command starting with /bot
            if (text.toLowerCase().startsWith("/bot")) {
                isTriggered = true;
                const parts = text.split(" ");
                const queryText = parts[1] ? parts[1].toLowerCase() : "";

                if (queryText === "joke") {
                    const jokes = [
                        "Why did the chicken cross the road? It got run over.",
                        "Knock, knock! ... Who's there? ... Artificial. ... Artificial who? ... Artificial intelligence? Please, I'm just text on a screen!"
                    ];
                    replyBody = jokes[Math.floor(Math.random() * jokes.length)];
                } else if (queryText === "hi" || queryText === "hey") {
                    const greetings = ["hey !", "hi"];
                    replyBody = greetings[Math.floor(Math.random() * greetings.length)];
                } else if (queryText === "help") {
                    replyBody = "ehhh i don't feel like doing that";
                } else {
                    const fallbacks = [
                        "uhh",
                        "idk",
                        "ask somebody else",
                        "im not an AI!",
                        "i guess bro"
                    ];
                    replyBody = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                }
            } 
            // If someone texts the bot directly (via DM recipient or by mentioning "bot")
            else if (recipient === BOT_NAME || text.toLowerCase().includes(BOT_NAME)) {
                isTriggered = true;
                // Always respond with a random fun fact when texted
                const randomIndex = Math.floor(Math.random() * BOT_MESSAGES.length);
                replyBody = BOT_MESSAGES[randomIndex];
            }

            if (isTriggered) {
                console.log(`[Bot Interaction] Responding to ${sender} text/command: "${text}"`);

                setTimeout(async () => {
                    try {
                        const messagePayload = {
                            text: replyBody,
                            username: BOT_NAME,
                            room: docData.room || "global",
                            recipient: recipient === BOT_NAME ? sender : null,
                            timestamp: serverTimestamp(),
                            replyTo: {
                                username: sender,
                                text: text,
                                id: docId
                            }
                        };

                        await addDoc(collection(db, "messages"), messagePayload);
                        console.log(`[Bot Interaction] Successfully sent response: "${replyBody}"`);
                    } catch (err) {
                        console.error("[Bot Interaction Error] Failed to send response:", err);
                    }
                }, 800);
            }
        }
    });
});

// ==========================================
// 4. PRECISE STYLING & "AlwaysOnline" INJECTOR
// ==========================================
function applyPreciseBotStyles() {
    // 1. Style only the bot's messages, bot's name/bio inside bot cards, and /bot commands
    const allElements = document.querySelectorAll(".msg-bubble, .message, .chat-item, .msg-author, .username, div, span");
    allElements.forEach((el) => {
        const textContent = el.textContent ? el.textContent.trim() : "";
        const lowerText = textContent.toLowerCase();
        const parentNode = el.closest(".message, .msg, li, div, .friend-item, .user-card") || el.parentElement;
        const parentText = parentNode ? parentNode.textContent.toLowerCase() : "";

        // Ensure we only color text specifically associated with the bot's messages or bot profile items
        const isBotMessageBubble = parentText.includes(BOT_NAME) && (el.classList.contains("msg-bubble") || el.classList.contains("message-text") || el.tagName === "SPAN");
        const isBotProfileCardItem = parentText.includes("dm @bot") || parentText.includes("bot");
        const isBotNameOrBio = (lowerText === BOT_NAME || lowerText === BOT_BIO) && isBotProfileCardItem;
        const isBotCommandPrompt = lowerText.startsWith("/bot");

        if (isBotMessageBubble || isBotNameOrBio || isBotCommandPrompt) {
            el.style.setProperty("color", GREEN_COLOR_CODE, "important");
            if (isBotNameOrBio || isBotCommandPrompt) {
                el.style.setProperty("font-weight", "600", "important");
            }
        }

        // 2. Add verification badge next to bot username elements in chat
        if (el.classList && (el.classList.contains("msg-author") || el.classList.contains("username"))) {
            const authorName = textContent.split(" ")[0].toLowerCase();
            if (authorName === BOT_NAME && !el.querySelector(".bot-badge-icon")) {
                const badgeImage = document.createElement("img");
                badgeImage.src = BOT_BADGE;
                badgeImage.className = "bot-badge-icon";
                badgeImage.style.cssText = "width: 14px; height: 14px; margin-left: 5px; vertical-align: middle; display: inline-block; pointer-events: none;";
                el.appendChild(badgeImage);
            }
        }
    });

    // 3. Force status text to "AlwaysOnline" and turn status indicator dot green strictly for the bot
    const statusElements = document.querySelectorAll("span, div, p");
    statusElements.forEach((el) => {
        const txt = el.textContent ? el.textContent.trim() : "";
        const parentContainer = el.closest(".friend-item, .dm-item, div") || el.parentElement;
        const containerText = parentContainer ? parentContainer.textContent.toLowerCase() : "";

        // Only modify text if this container specifically belongs to the bot entry
        if (containerText.includes("bot") && (txt.toLowerCase() === "offline" || txt.toLowerCase() === "online")) {
            el.textContent = "AlwaysOnline";
            el.style.setProperty("color", GREEN_COLOR_CODE, "important");
        }

        // Target status indicator dot next to the bot and force it green
        if (containerText.includes("bot") && (el.style.width === "8px" || el.style.borderRadius === "50%" || el.className.includes("status") || el.classList.contains("dot"))) {
            el.style.setProperty("background-color", GREEN_COLOR_CODE, "important");
        }
    });
}

// Run loop continuously and observe DOM changes
setInterval(applyPreciseBotStyles, 300);

const botStylerObserver = new MutationObserver(() => {
    applyPreciseBotStyles();
});
botStylerObserver.observe(document.body, { childList: true, subtree: true });

// ==========================================
// 5. SECURITY VALIDATION & RESERVED USERNAME CHECK
// ==========================================
document.addEventListener("submit", (event) => {
    const inputFields = event.target.querySelectorAll("input[type='text'], input[id*='user'], input[name*='user']");
    inputFields.forEach((inputField) => {
        if (inputField.value.trim().toLowerCase() === BOT_NAME) {
            event.preventDefault();
            event.stopPropagation();
            console.warn("[Security Alert] Attempt to register with reserved username 'bot' was blocked.");
            alert("Error: The username 'bot' is reserved by the system.");
        }
    });
}, true);