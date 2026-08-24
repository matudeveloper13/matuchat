import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase configuration matching app.js
const firebaseConfig = {
    apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
    authDomain: "simplechat-e1787.firebaseapp.com",
    projectId: "simplechat-e1787",
    storageBucket: "simplechat-e1787.firebasestorage.app",
    messagingSenderId: "469168057769",
    appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
    measurementId: "G-KDWQTRWZSQ"
};

// Initialize Firebase instance for the bot
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const BOT_NAME = "bot";
const BOT_AVATAR = "botpfp.png";
const BOT_BADGE = "bot.png";
const BOT_BIO = "beep boop. I am an automated bot!";

// 10 Fun Facts Array
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

// 1. Ensure Bot Profile exists in Firestore
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
        console.error("Failed to register bot profile in Firestore:", err);
    }
}
initBotProfile();

// 2. Direct Firestore Message Transmitter
async function sendBotMessage(text) {
    if (!text) return;
    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            username: BOT_NAME,
            room: "global",
            recipient: null,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Error sending bot message:", err);
    }
}

// 3. UI ENHANCEMENT: Render Bot Badges next to name in chat
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

// 4. SECURITY: Prevent real users from registering as "bot"
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

// 5. AUTOMATION TIMERS (Set strictly to 3 hours)
const THREE_HOURS = 3 * 60 * 60 * 1000;

setInterval(() => {
    const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
    sendBotMessage(randomMsg);
}, THREE_HOURS);