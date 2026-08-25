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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Bot Identity Constants
const BOT_NAME = "bot";
const BOT_AVATAR = "botpfp.png";
const BOT_BIO = "beep boop. I am an automated bot system!";
const BOT_GREEN = "#22c55e";

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
// 1. BOT PROFILE SETUP (Forces Green Name & Bio)
// ==========================================
async function initBotProfile() {
    try {
        const userRef = doc(db, "users", BOT_NAME);
        const userSnap = await getDoc(userRef);
        
        const botProfileData = {
            username: BOT_NAME,
            bio: BOT_BIO,
            avatar: BOT_AVATAR,
            color: BOT_GREEN,
            textColor: BOT_GREEN,
            nameColor: BOT_GREEN,
            role: "bot",
            lastSeen: serverTimestamp()
        };

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                ...botProfileData,
                friends: [],
                friendRequests: [],
                blocked: []
            });
        } else {
            await setDoc(userRef, botProfileData, { merge: true });
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
// 2. TIMED ANNOUNCEMENTS (Every 3 Hours)
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

        await addDoc(collection(db, "messages"), {
            text: randomMsg,
            username: BOT_NAME,
            room: "global",
            recipient: null,
            textColor: BOT_GREEN,
            color: BOT_GREEN,
            nameColor: BOT_GREEN,
            role: "bot",
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("[Bot Timer Error]:", err);
    }
}

setTimeout(checkAndSendBotMessage, 3000);

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

            if (sender.toLowerCase() === BOT_NAME) return;

            const recipient = docData.recipient ? docData.recipient.trim().toLowerCase() : null;

            let replyBody = "";
            let isTriggered = false;

            if (fullText.toLowerCase().startsWith("/bot")) {
                isTriggered = true;
                const parts = fullText.split(" ");
                const command = parts[1] ? parts[1].toLowerCase() : "";
                const args = parts.slice(2).join(" ");

                if (command === "commands") {
                    replyBody = "Available commands: /bot commands, /bot funfact, /bot mock [text], /bot color, /bot quote, /bot time, /bot coinflip, /bot numberroll, /bot calculator [expr], /bot hi, /bot help";
                } 
                else if (command === "funfact") {
                    replyBody = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
                } 
                else if (command === "mock") {
                    if (!args) {
                        replyBody = "Usage: /bot mock [text]";
                    } else {
                        replyBody = args.split("").map((char, i) => i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()).join("");
                    }
                } 
                else if (command === "color") {
                    replyBody = "Assigned Color: green";
                } 
                else if (command === "calculator") {
                    if (!args) {
                        replyBody = "Usage: /bot calculator [expression]";
                    } else {
                        try {
                            const sanitizedExpr = args.replace(/[^0-9+\-*/().\s]/g, "");
                            const result = Function(`'use strict'; return (${sanitizedExpr})`)();
                            replyBody = `Calculation Result: ${result}`;
                        } catch (calcErr) {
                            replyBody = "Error: Invalid math expression.";
                        }
                    }
                }
                else if (command === "quote") {
                    const quotes = [
                        "\"To err is human, to blame your code is even more human.\"",
                        "\"It's not a bug, it's an undocumented feature.\""
                    ];
                    replyBody = quotes[Math.floor(Math.random() * quotes.length)];
                } 
                else if (command === "time") {
                    const now = new Date();
                    const year = now.getFullYear();
                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    const monthName = months[now.getMonth()];
                    const day = String(now.getDate()).padStart(2, "0");
                    const hours = String(now.getHours()).padStart(2, "0");
                    const minutes = String(now.getMinutes()).padStart(2, "0");
                    const seconds = String(now.getSeconds()).padStart(2, "0");
                    
                    replyBody = `${year} ${monthName} ${day} ${hours}:${minutes}:${seconds}`;
                } 
                else if (command === "coinflip") {
                    replyBody = Math.random() < 0.5 ? "Coin Flip: Heads!" : "Coin Flip: Tails!";
                } 
                else if (command === "numberroll") {
                    replyBody = `You rolled a number: ${Math.floor(Math.random() * 6) + 1}`;
                } 
                else if (command === "joke") {
                    replyBody = "Why did the chicken cross the road? It got run over.";
                } 
                else if (command === "hi" || command === "hey") {
                    replyBody = "hey !";
                } 
                else if (command === "help") {
                    replyBody = "ehhh i don't feel like doing that";
                } 
                else {
                    replyBody = "Unknown command! Type /bot commands";
                }
            } 
            else if (recipient === BOT_NAME || fullText.toLowerCase().includes(BOT_NAME)) {
                isTriggered = true;
                replyBody = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
            }

            if (isTriggered) {
                setTimeout(async () => {
                    try {
                        const messagePayload = {
                            text: replyBody,
                            username: BOT_NAME,
                            room: docData.room || "global",
                            recipient: recipient === BOT_NAME ? sender : null,
                            textColor: BOT_GREEN,
                            color: BOT_GREEN,
                            nameColor: BOT_GREEN,
                            role: "bot",
                            timestamp: serverTimestamp(),
                            replyTo: {
                                username: sender,
                                text: fullText,
                                id: docId
                            }
                        };

                        await addDoc(collection(db, "messages"), messagePayload);
                    } catch (err) {
                        console.error("[Bot Interaction Error] Failed to send response:", err);
                    }
                }, 500);
            }
        }
    });
});

// ==========================================
// 4. USERNAME SECURITY CHECK
// ==========================================
document.addEventListener("submit", (event) => {
    const inputFields = event.target.querySelectorAll("input[type='text'], input[id*='user'], input[name*='user']");
    inputFields.forEach((inputField) => {
        if (inputField.value.trim().toLowerCase() === BOT_NAME) {
            event.preventDefault();
            event.stopPropagation();
            alert("Error: The username 'bot' is reserved by the system.");
        }
    });
}, true);