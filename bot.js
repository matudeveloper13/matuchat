import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
    authDomain: "simplechat-e1787.firebaseapp.com",
    projectId: "simplechat-e1787",
    storageBucket: "simplechat-e1787.firebasestorage.app",
    messagingSenderId: "469168057769",
    appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
    measurementId: "G-KDWQTRWZSQ"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const BOT_NAME = "bot";
const BOT_AVATAR = "botpfp.png";
const BOT_BADGE = "bot.png";
const BOT_BIO = "beep boop. I am an automated bot!";

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

// 1. Register Bot Profile
async function initBotProfile() {
    try {
        await setDoc(doc(db, "users", BOT_NAME), {
            username: BOT_NAME,
            bio: BOT_BIO,
            avatar: BOT_AVATAR,
            friends: [],
            friendRequests: [],
            blocked: [],
            lastSeen: serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.error("Failed to register bot profile:", err);
    }
}
initBotProfile();

// 2. Strict 3-Hour Cooldown Timer for Random Facts
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

        const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
        await addDoc(collection(db, "messages"), {
            text: `<span style="color: #4ade80; font-weight: 600;">${randomMsg}</span>`,
            username: BOT_NAME,
            room: "global",
            recipient: null,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Bot timer error:", err);
    }
}

setTimeout(checkAndSendBotMessage, 3000);
setInterval(checkAndSendBotMessage, 10 * 60 * 1000);

// 3. Robust Database Listener with Multi-Field Fallbacks & New Commands
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

            const rawText = (docData.text || docData.message || docData.content || "").trim();
            // Strip HTML tags temporarily to check the raw command text
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = rawText;
            const text = tempDiv.textContent || tempDiv.innerText || rawText;

            const sender = docData.username || docData.user || docData.sender || "someone";

            // If a user types a command starting with /bot
            if (text.toLowerCase().startsWith("/bot") && sender.toLowerCase() !== BOT_NAME) {
                const parts = text.split(" ");
                const queryText = parts[1] ? parts[1].toLowerCase() : "";
                let replyBody = "";

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

                setTimeout(async () => {
                    try {
                        // Send bot response styled in light green with actual reply feature attached
                        const messagePayload = {
                            text: `<span style="color: #4ade80; font-weight: 600;">${replyBody}</span>`,
                            username: BOT_NAME,
                            room: "global",
                            recipient: null,
                            timestamp: serverTimestamp(),
                            replyTo: {
                                username: sender,
                                text: text,
                                id: docId
                            }
                        };

                        await addDoc(collection(db, "messages"), messagePayload);
                    } catch (err) {
                        console.error("Error sending bot command reply:", err);
                    }
                }, 800);
            }
        }
    });
});

// 4. UI Injector: Badges for Bot Name
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
                const authorEls = node.classList && node.classList.contains("msg-author") ? [node] : node.querySelectorAll(".msg-author");
                authorEls.forEach((authorEl) => {
                    const name = authorEl.textContent.trim().split(" ")[0].toLowerCase();
                    if (name === BOT_NAME && !authorEl.querySelector(".bot-badge-icon")) {
                        const badge = document.createElement("img");
                        badge.src = BOT_BADGE;
                        badge.className = "bot-badge-icon";
                        badge.style.cssText = "width: 14px; height: 14px; margin-left: 5px; vertical-align: middle; display: inline-block; pointer-events: none;";
                        authorEl.appendChild(badge);
                    }
                });
            }
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });

// 5. Security Check: Prevent users from registering as "bot"
document.addEventListener("submit", (e) => {
    const inputs = e.target.querySelectorAll("input[type='text'], input[id*='user'], input[name*='user']");
    inputs.forEach((input) => {
        if (input.value.trim().toLowerCase() === BOT_NAME) {
            e.preventDefault();
            e.stopPropagation();
            alert("Error: The username 'bot' is reserved by the system.");
        }
    });
}, true);