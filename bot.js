import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

setTimeout(checkAndSendBotMessage, 3000);
setInterval(checkAndSendBotMessage, 10 * 60 * 1000);

// 3. Database-Level Command Listener for "/bot [command]" (Requires space after /bot)
let isFirstSnapshot = true;
const messagesQuery = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(50));

onSnapshot(messagesQuery, (snapshot) => {
    if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
    }

    snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
            const data = change.doc.data();
            const text = data.text ? data.text.trim() : "";
            const sender = data.username || "someone";

            // Check if it starts with "/bot " (with a space) and isn't sent by the bot itself
            if (text.toLowerCase().startsWith("/bot ") && sender !== BOT_NAME) {
                const queryText = text.substring(5).trim().toLowerCase();
                let replyBody = "";

                if (queryText === "joke") {
                    const jokes = [
                        "Why did the chicken cross the road? It got run over.",
                        "Knock, knock! ... Who's there? ... Artificial. ... Artificial who? ... Artificial intelligence? Please, I'm just text on a screen!"
                    ];
                    replyBody = jokes[Math.floor(Math.random() * jokes.length)];
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

                // Formatted with redirection text
                const finalReply = `(Message redirected to: ${sender}) ${replyBody}`;

                setTimeout(async () => {
                    try {
                        await addDoc(collection(db, "messages"), {
                            text: finalReply,
                            username: BOT_NAME,
                            room: "global",
                            recipient: null,
                            timestamp: serverTimestamp()
                        });
                    } catch (err) {
                        console.error("Error sending bot command reply:", err);
                    }
                }, 1000);
            }
        }
    });
});

// 4. UI Injector: Badges + Making commands/bot text Blue
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
                // Style message bubbles starting with /bot to be blue
                const bubbles = node.querySelectorAll ? node.querySelectorAll(".msg-bubble") : [];
                bubbles.forEach((bubble) => {
                    if (bubble.textContent && bubble.textContent.trim().toLowerCase().startsWith("/bot") && !bubble.classList.contains("bot-blue-styled")) {
                        bubble.classList.add("bot-blue-styled");
                        bubble.style.color = "#3b82f6";
                        bubble.style.fontWeight = "600";
                    }
                });

                // Inject bot badge next to bot's name
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