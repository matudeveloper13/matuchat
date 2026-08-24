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

// Pool of 15 Fun Facts
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
    "Fun Fact: Sound travels about 4.3 times faster in water than in air!",
    "Fun Fact: Sharks existed before trees! Sharks have been around for over 400 million years.",
    "Fun Fact: Human stomach acid is strong enough to dissolve razor blades.",
    "Fun Fact: Butterflies taste their food with their feet!",
    "Fun Fact: A bolt of lightning is five times hotter than the surface of the sun.",
    "Fun Fact: Sloths can hold their breath underwater longer than dolphins can!"
];

// ==========================================
// 1. BOT PROFILE & MUTUAL FRIEND REQUEST AUTO-ACCEPT
// ==========================================
async function initBotProfile() {
    try {
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
        } else {
            await setDoc(userRef, {
                username: BOT_NAME,
                bio: BOT_BIO,
                avatar: BOT_AVATAR,
                lastSeen: serverTimestamp()
            }, { merge: true });
        }
    } catch (err) {
        console.error("[Bot System Error] Failed to register bot profile:", err);
    }
}
initBotProfile();

onSnapshot(doc(db, "users", BOT_NAME), async (docSnap) => {
    try {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const requests = data.friendRequests || [];
        const currentFriends = data.friends || [];

        if (requests.length > 0) {
            const mergedFriends = Array.from(new Set([...currentFriends, ...requests]));
            await setDoc(doc(db, "users", BOT_NAME), {
                friendRequests: [],
                friends: mergedFriends
            }, { merge: true });
            
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
                        }
                    }
                } catch (subErr) {
                    console.error(`[Bot System Error] Failed to update user profile for ${requesterUsername}:`, subErr);
                }
            }
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
        const stateRef = doc(db, "bot_state", "timer");
        const stateSnap = await getDoc(stateRef);
        const now = Date.now();

        if (stateSnap.exists()) {
            const lastSent = stateSnap.data().lastSentTime || 0;
            if (now - lastSent < THREE_HOURS_MS) return;
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
    } catch (err) {
        console.error("[Bot Timer Error] Exception encountered during broadcast check:", err);
    }
}

setTimeout(checkAndSendBotMessage, 3000);
setInterval(checkAndSendBotMessage, 10 * 60 * 1000);

// ==========================================
// 3. DATABASE LISTENER & COMMAND HANDLER
// ==========================================
let isFirstSnapshot = true;

onSnapshot(collection(db, "messages"), (snapshot) => {
    if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
    }

    snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
            const docData = change.doc.data();
            const docId = docData.id || change.doc.id;

            const fullText = (docData.text || docData.message || docData.content || "").trim();
            const sender = docData.username || docData.user || docData.sender || "someone";
            const recipient = docData.recipient ? docData.recipient.trim().toLowerCase() : null;

            if (sender.toLowerCase() === BOT_NAME) return;

            let replyBody = "";
            let customColor = null;
            let imageAttachment = null;
            let isTriggered = false;

            if (fullText.toLowerCase().startsWith("/bot")) {
                isTriggered = true;
                const parts = fullText.split(" ");
                const command = parts[1] ? parts[1].toLowerCase() : "";
                const args = parts.slice(2).join(" ");

                if (command === "commands") {
                    replyBody = "Available commands: /bot commands, /bot funfact, /bot mock [text], /bot color, /bot potato, /bot qr, /bot quote, /bot time, /bot coinflip, /bot numberroll, /bot hi, /bot help";
                } 
                else if (command === "funfact") {
                    const randomIndex = Math.floor(Math.random() * BOT_MESSAGES.length);
                    replyBody = BOT_MESSAGES[randomIndex];
                } 
                else if (command === "mock") {
                    if (!args) {
                        replyBody = "Usage: /bot mock [text you want to mock]";
                    } else {
                        replyBody = args.split("").map((char, i) => i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()).join("");
                    }
                } 
                else if (command === "color") {
                    const colorChoices = [
                        { name: "red", hex: "#ef4444" },
                        { name: "blue", hex: "#3b82f6" },
                        { name: "green", hex: "#22c55e" },
                        { name: "yellow", hex: "#eab308" },
                        { name: "purple", hex: "#a855f7" },
                        { name: "orange", hex: "#f97316" },
                        { name: "pink", hex: "#ec4899" },
                        { name: "brown", hex: "#9a3412" }
                    ];
                    const chosen = colorChoices[Math.floor(Math.random() * colorChoices.length)];
                    replyBody = chosen.name;
                    customColor = chosen.hex;
                }
                else if (command === "potato") {
                    replyBody = "Here is your potato!";
                    imageAttachment = "potato.png";
                }
                else if (command === "qr") {
                    replyBody = "Here is your QR code!";
                    imageAttachment = "QR.png";
                }
                else if (command === "quote") {
                    const quotes = [
                        "\"To err is human, to blame your code is even more human.\"",
                        "\"It's not a bug, it's an undocumented feature.\"",
                        "\"I told my computer I needed a break, and now it won't stop sending me kitkat bars.\""
                    ];
                    replyBody = quotes[Math.floor(Math.random() * quotes.length)];
                } 
                else if (command === "time") {
                    replyBody = `Current server time: ${new Date().toLocaleTimeString()}`;
                } 
                else if (command === "coinflip") {
                    replyBody = Math.random() < 0.5 ? "Coin Flip: Heads!" : "Coin Flip: Tails!";
                } 
                else if (command === "numberroll") {
                    const rolledNum = Math.floor(Math.random() * 6) + 1;
                    replyBody = `You rolled a number: ${rolledNum}`;
                } 
                else if (command === "joke") {
                    const jokes = [
                        "Why did the chicken cross the road? It got run over.",
                        "Knock, knock! ... Who's there? ... Artificial. ... Artificial who? ... Artificial intelligence? Please, I'm just text on a screen!"
                    ];
                    replyBody = jokes[Math.floor(Math.random() * jokes.length)];
                } 
                else if (command === "hi" || command === "hey") {
                    replyBody = "hey !";
                } 
                else if (command === "help") {
                    replyBody = "ehhh i don't feel like doing that";
                } 
                else {
                    replyBody = "Unknown command! Type /bot commands to see what's available.";
                }
            } 
            else if (recipient === BOT_NAME || fullText.toLowerCase().includes(BOT_NAME)) {
                isTriggered = true;
                const randomIndex = Math.floor(Math.random() * BOT_MESSAGES.length);
                replyBody = BOT_MESSAGES[randomIndex];
            }

            if (isTriggered) {
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
                                text: fullText,
                                id: docId
                            }
                        };

                        if (customColor) {
                            messagePayload.textColor = customColor;
                        }
                        if (imageAttachment) {
                            messagePayload.image = imageAttachment;
                        }

                        await addDoc(collection(db, "messages"), messagePayload);
                    } catch (err) {
                        console.error("[Bot Interaction Error] Failed to send response:", err);
                    }
                }, 800);
            }
        }
    });
});

// ==========================================
// 4. PRECISE STYLING & IMAGE/COLOR INJECTOR
// ==========================================
function applyPreciseBotStyles() {
    const allMessages = document.querySelectorAll(".message, .msg, .chat-item, div");
    allMessages.forEach((msgEl) => {
        const textContent = msgEl.textContent ? msgEl.textContent.trim() : "";
        const parentText = msgEl.parentElement ? msgEl.parentElement.textContent.toLowerCase() : "";
        const isBotMsg = msgEl.textContent && (msgEl.textContent.includes(BOT_NAME) || parentText.includes(BOT_NAME));

        // Check if message container has a custom textColor stored or embedded
        if (isBotMsg) {
            const bubbles = msgEl.querySelectorAll(".msg-bubble, .message-text, span");
            bubbles.forEach((b) => {
                // If it's a color response, check if the bubble text matches the color or if we want to color it
                const txt = b.textContent.trim().toLowerCase();
                if (["red", "blue", "green", "yellow", "purple", "orange", "pink", "brown"].includes(txt)) {
                    const colorMap = {
                        red: "#ef4444",
                        blue: "#3b82f6",
                        green: "#22c55e",
                        yellow: "#eab308",
                        purple: "#a855f7",
                        orange: "#f97316",
                        pink: "#ec4899",
                        brown: "#9a3412"
                    };
                    b.style.setProperty("color", colorMap[txt], "important");
                    b.style.setProperty("font-weight", "bold", "important");
                }
            });
        }
    });

    const allElements = document.querySelectorAll(".msg-bubble, .message, .chat-item, .msg-author, .username, div, span");
    allElements.forEach((el) => {
        const textContent = el.textContent ? el.textContent.trim() : "";
        const lowerText = textContent.toLowerCase();
        const parentNode = el.closest(".message, .msg, li, div, .friend-item, .user-card") || el.parentElement;
        const parentText = parentNode ? parentNode.textContent.toLowerCase() : "";

        const isBotMessageBubble = parentText.includes(BOT_NAME) && (el.classList.contains("msg-bubble") || el.classList.contains("message-text") || el.tagName === "SPAN");
        const isBotProfileCardItem = parentText.includes("dm @bot") || parentText.includes("bot");
        const isBotNameOrBio = (lowerText === BOT_NAME || lowerText === BOT_BIO) && isBotProfileCardItem;
        const isBotCommandPrompt = lowerText.startsWith("/bot");

        if (isBotMessageBubble || isBotNameOrBio || isBotCommandPrompt) {
            // Keep default green unless handled by color picker above
            if (!["red", "blue", "green", "yellow", "purple", "orange", "pink", "brown"].includes(lowerText)) {
                el.style.setProperty("color", GREEN_COLOR_CODE, "important");
            }
            if (isBotNameOrBio || isBotCommandPrompt) {
                el.style.setProperty("font-weight", "600", "important");
            }
        }

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

    // Automatically inject images if a message contains image data payload or references potato.png / QR.png
    const messageContainers = document.querySelectorAll(".message, .msg, div");
    messageContainers.forEach((container) => {
        const txt = container.textContent || "";
        if (txt.includes("Here is your potato!") && !container.querySelector(".bot-potato-img")) {
            const img = document.createElement("img");
            img.src = "potato.png";
            img.className = "bot-potato-img";
            img.style.cssText = "display: block; max-width: 180px; margin-top: 8px; border-radius: 8px;";
            container.appendChild(img);
        }
        if (txt.includes("Here is your QR code!") && !container.querySelector(".bot-qr-img")) {
            const img = document.createElement("img");
            img.src = "QR.png";
            img.className = "bot-qr-img";
            img.style.cssText = "display: block; max-width: 180px; margin-top: 8px; border-radius: 8px;";
            container.appendChild(img);
        }
    });

    const statusElements = document.querySelectorAll("span, div, p");
    statusElements.forEach((el) => {
        const txt = el.textContent ? el.textContent.trim() : "";
        const parentContainer = el.closest(".friend-item, .dm-item, div") || el.parentElement;
        const containerText = parentContainer ? parentContainer.textContent.toLowerCase() : "";

        if (containerText.includes("bot") && (txt.toLowerCase() === "offline" || txt.toLowerCase() === "online")) {
            el.textContent = "AlwaysOnline";
            el.style.setProperty("color", GREEN_COLOR_CODE, "important");
        }

        if (containerText.includes("bot") && (el.style.width === "8px" || el.style.borderRadius === "50%" || el.className.includes("status") || el.classList.contains("dot"))) {
            el.style.setProperty("background-color", GREEN_COLOR_CODE, "important");
        }
    });
}

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