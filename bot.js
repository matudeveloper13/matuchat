import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 2. Strict 3-Hour Cooldown Function
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

async function checkAndSendBotMessage() {
    try {
        const stateRef = doc(db, "bot_state", "timer");
        const stateSnap = await getDoc(stateRef);
        const now = Date.now();

        if (stateSnap.exists()) {
            const lastSent = stateSnap.data().lastSentTime || 0;
            if (now - lastSent < THREE_HOURS_MS) {
                return;
            }
        }

        await setDoc(stateRef, { lastSentTime: now }, { merge: true });

        const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
        await addDoc(collection(db, "messages"), {
            text: randomMsg,
            username: BOT_NAME,
            room: "global",
            recipient: null,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Bot timer error:", err);
    }
}

// Run once on load, then check every 10 minutes
setTimeout(checkAndSendBotMessage, 3000);
setInterval(checkAndSendBotMessage, 10 * 60 * 1000);

// 3. Smart AI-like Command Listener for "/bot"
document.addEventListener("submit", async (e) => {
    const msgInput = e.target.querySelector("#message-input");
    if (!msgInput) return;

    const text = msgInput.value.trim();
    
    if (text.toLowerCase().startsWith("/bot")) {
        const query = text.substring(4).trim().toLowerCase();
        let smartReply = "Beep boop! I'm listening. Try asking me a question or type something else!";

        if (query.includes("hello") || query.includes("hi")) {
            smartReply = "Hello there, human! How can I help you in the chat today?";
        } else if (query.includes("how are you")) {
            smartReply = "Operating at 100% efficiency! All circuits are nominal. 🤖";
        } else if (query.includes("joke")) {
            smartReply = "Why don't scientists trust atoms? Because they make up everything!";
        } else if (query.includes("fact")) {
            const randomFact = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
            smartReply = `Ask and you shall receive: ${randomFact}`;
        } else if (query.length > 0) {
            smartReply = `I processed your input "${query}", and my conclusion is: That's pretty cool! ✨`;
        }

        setTimeout(async () => {
            try {
                await addDoc(collection(db, "messages"), {
                    text: smartReply,
                    username: BOT_NAME,
                    room: "global",
                    recipient: null,
                    timestamp: serverTimestamp()
                });
            } catch (err) {
                console.error("Error sending smart reply:", err);
            }
        }, 1000);
    }
}, true);

// 4. UI Badge Injector
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

// 5. Security Check
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