import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, deleteUser 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, 
    query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, deleteDoc, Timestamp, getDocs, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
    authDomain: "simplechat-e1787.firebaseapp.com",
    projectId: "simplechat-e1787",
    storageBucket: "simplechat-e1787.firebasestorage.app",
    messagingSenderId: "469168057769",
    appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
    measurementId: "G-KDWQTRWZSQ"
};

const IMGBB_API_KEY = "5fbe075f08f860f0714328246630fdfc";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function renderUsernameWithCrown(username, isGroupContext = false, groupCreator = null) {
    const cleanName = (username || "").trim();
    const hasCrown = cleanName === "matubanana" || cleanName === "matubanana2" || (isGroupContext && cleanName === groupCreator);
    if (hasCrown) {
        return `${sanitizeMessageHTML(cleanName)} <img src="crown.png" style="width: 14px; height: 14px; vertical-align: middle; display: inline-block; margin-left: 3px;" alt="Crown" />`;
    }
    return sanitizeMessageHTML(cleanName);
}

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/png, image/jpeg, image/jpg";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

let selectedImageFile = null;
let replyingToMessage = null;
let presenceInterval = null;
let currentGroupData = null;

const authModalBtn = document.getElementById("auth-modal-btn");
const logoutBtn = document.getElementById("logout-btn");
const authOverlay = document.getElementById("auth-overlay");
const closeModalBtn = document.getElementById("close-modal-btn");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");
const tabRegister = document.getElementById("tab-register");
const tabLogin = document.getElementById("tab-login");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const chatRoomTitle = document.getElementById("chat-room-title");
const exitDmBtn = document.getElementById("exit-dm-btn");

if (exitDmBtn) {
    exitDmBtn.classList.add("hidden");
    exitDmBtn.style.cursor = "pointer";
}

const globalChatSection = document.getElementById("global-chat-section");
if (globalChatSection) {
    globalChatSection.style.display = "flex";
    globalChatSection.style.flexDirection = "column";
}
document.querySelectorAll("#group-members-sidebar").forEach(el => el.remove());

const replyPreviewBar = document.createElement("div");
replyPreviewBar.id = "reply-preview-bar";
replyPreviewBar.className = "hidden";
replyPreviewBar.style.cssText = "display: none; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--card-bg); border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-muted);";
replyPreviewBar.innerHTML = `
    <div id="reply-preview-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
    <button type="button" id="cancel-reply-btn" style="background: none; border: none; color: var(--text-color); cursor: pointer; font-weight: bold; font-size: 14px; padding: 0 4px;">&times;</button>
`;
if (messageForm && messageForm.parentNode) {
    messageForm.parentNode.insertBefore(replyPreviewBar, messageForm);
}

const cancelReplyBtn = document.getElementById("cancel-reply-btn");
const replyPreviewText = document.getElementById("reply-preview-text");

cancelReplyBtn?.addEventListener("click", () => {
    clearReplyState();
});

function clearReplyState() {
    replyingToMessage = null;
    replyPreviewBar.classList.add("hidden");
    replyPreviewBar.style.display = "none";
}

const navFriendsBtn = document.getElementById("nav-friends-btn");
const backToChatBtn = document.getElementById("back-to-chat-btn");
const friendsSection = document.getElementById("friends-section");

const addFriendInput = document.getElementById("add-friend-input");
const sendFriendRequestBtn = document.getElementById("send-friend-request-btn");
const friendActionMsg = document.getElementById("friend-action-msg");
const pendingRequestsContainer = document.getElementById("pending-requests-container");
const friendsListContainer = document.getElementById("friends-list-container");

const blockedSection = document.createElement("div");
blockedSection.style.cssText = "margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color);";
blockedSection.innerHTML = `
    <h3 style="font-size: 14px; margin-bottom: 10px; color: var(--text-color);">Blocked Users</h3>
    <div id="blocked-users-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
`;
friendsSection?.appendChild(blockedSection);
const blockedUsersContainer = document.getElementById("blocked-users-container");

const adminBannedUsersSection = document.createElement("div");
adminBannedUsersSection.id = "admin-banned-users-section";
adminBannedUsersSection.className = "hidden";
adminBannedUsersSection.style.cssText = "margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color);";
adminBannedUsersSection.innerHTML = `
    <h3 style="font-size: 14px; margin-bottom: 5px; color: #ef4444;">🔨 Admin Banned Users Manager</h3>
    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">Unban accounts so they can be seen again.</p>
    <div id="admin-banned-users-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
`;
friendsSection?.appendChild(adminBannedUsersSection);
const adminBannedUsersContainer = document.getElementById("admin-banned-users-container");

const banPanelTrigger = document.createElement("button");
banPanelTrigger.id = "ban-panel-trigger-btn";
banPanelTrigger.className = "hidden btn btn-secondary";
banPanelTrigger.style.cssText = "margin-left: 10px; background: #ef4444; color: #fff; border: none; padding: 4px 10px; font-size: 12px; border-radius: 6px; cursor: pointer;";
banPanelTrigger.textContent = "🔨 Ban Panel";
if (chatRoomTitle && chatRoomTitle.parentNode) {
    chatRoomTitle.parentNode.appendChild(banPanelTrigger);
}

const banModalOverlay = document.createElement("div");
banModalOverlay.className = "modal-overlay hidden";
banModalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 99999;";
banModalOverlay.innerHTML = `
    <div class="modal" style="background: var(--card-bg); padding: 25px; border-radius: 12px; text-align: center; max-width: 380px; width: 90%; border: 1px solid var(--border-color);">
        <h3 style="margin-bottom: 15px; color: #ef4444;">Admin Ban Panel</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px;">Enter exact username to shadow-ban them (their messages will be hidden for everyone else, keeping them in the dark).</p>
        <input type="text" id="ban-username-input" placeholder="Username to ban..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color); margin-bottom: 15px; box-sizing: border-box;" />
        <div style="display: flex; gap: 10px;">
            <button id="cancel-ban-btn" class="btn btn-secondary" style="flex: 1; height: 40px;">Cancel</button>
            <button id="confirm-ban-btn" class="btn btn-primary" style="flex: 1; height: 40px; background: #ef4444; border-color: #ef4444; color: #fff;">Ban User</button>
        </div>
        <p id="ban-status-msg" style="font-size: 12px; margin-top: 12px; color: var(--text-muted);"></p>
    </div>
`;
document.body.appendChild(banModalOverlay);

banPanelTrigger?.addEventListener("click", () => {
    document.getElementById("ban-username-input").value = "";
    document.getElementById("ban-status-msg").textContent = "";
    banModalOverlay.classList.remove("hidden");
});

document.getElementById("cancel-ban-btn")?.addEventListener("click", () => {
    banModalOverlay.classList.add("hidden");
});

document.getElementById("confirm-ban-btn")?.addEventListener("click", async () => {
    const targetUserToBan = document.getElementById("ban-username-input").value.trim();
    const statusMsg = document.getElementById("ban-status-msg");
    if (!targetUserToBan) {
        statusMsg.textContent = "Please type a username.";
        return;
    }

    if (currentUsername !== "matubanana" && currentUsername !== "matubanana2") {
        statusMsg.textContent = "Unauthorized.";
        return;
    }

    if (!confirm(`Are you sure you want to ban @${targetUserToBan} so nobody can see their chats anymore?`)) {
        return;
    }

    statusMsg.textContent = "Applying shadow-ban record...";
    try {
        const banRecordRef = doc(db, "banned_users", targetUserToBan);
        await setDoc(banRecordRef, {
            username: targetUserToBan,
            bannedAt: serverTimestamp()
        });

        statusMsg.style.color = "var(--success, #22c55e)";
        statusMsg.textContent = `Successfully banned @${targetUserToBan}!`;
        setTimeout(() => {
            banModalOverlay.classList.add("hidden");
            loadFriendsAndRequests();
            loadMessagesFeed();
        }, 1500);
    } catch (err) {
        statusMsg.style.color = "#ef4444";
        statusMsg.textContent = "Error: " + err.message;
    }
});

// --- MUSIC PLAYER PANEL FEATURE ---
let currentAudio = null;
document.querySelectorAll("#music-panel-btn").forEach(el => el.remove());

const musicBtn = document.createElement("button");
musicBtn.id = "music-panel-btn";
musicBtn.className = "btn btn-secondary";
musicBtn.style.cssText = "position: fixed; top: 15px; right: 15px; z-index: 99998; width: 40px; height: 40px; border-radius: 50%; background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);";
musicBtn.innerHTML = "🎵";
document.body.appendChild(musicBtn);

const musicPanel = document.createElement("div");
musicPanel.id = "music-panel";
musicPanel.className = "hidden";
musicPanel.style.cssText = "position: fixed; top: 65px; right: 15px; background: var(--card-bg); border: 1px solid var(--border-color); padding: 15px; border-radius: 12px; z-index: 99999; width: 240px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-height: 420px; overflow-y: auto;";
musicPanel.innerHTML = `
    <h4 style="font-size: 14px; margin-bottom: 10px; color: var(--text-color);">Music Player</h4>
    <div id="music-list" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
        <button class="btn btn-secondary music-track-btn" data-src="relaxing.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ relaxing.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="ordinary.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ ordinary.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="meep.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ meep.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="imagination.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ imagination.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="beatle.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ beatle.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="buur.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ buur.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="call.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ call.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="calm.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ calm.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="enemy.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ enemy.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="nojbee.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ nojbee.mp3</button>
    </div>
    <div style="display: flex; gap: 6px;">
        <button id="music-stop-btn" class="btn btn-secondary" style="flex: 1; font-size: 12px; background: #ef4444; color: #fff; border: none;">Stop</button>
        <button id="music-loop-btn" class="btn btn-secondary" style="flex: 1; font-size: 12px;">Loop: Off</button>
    </div>
`;
document.body.appendChild(musicPanel);

musicBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    musicPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (musicPanel && !musicPanel.contains(e.target) && e.target !== musicBtn) {
        musicPanel.classList.add("hidden");
    }
});

musicPanel.querySelectorAll(".music-track-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-src");
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        currentAudio = new Audio(src);
        currentAudio.loop = isLooping;
        currentAudio.play().catch(err => alert("Could not play audio file: " + err.message));
        
        musicPanel.querySelectorAll(".music-track-btn").forEach(b => b.style.fontWeight = "normal");
        btn.style.fontWeight = "bold";
    });
});

let isLooping = false;
const musicLoopBtn = document.getElementById("music-loop-btn");
musicLoopBtn?.addEventListener("click", () => {
    isLooping = !isLooping;
    musicLoopBtn.textContent = `Loop: ${isLooping ? "On" : "Off"}`;
    musicLoopBtn.style.background = isLooping ? "var(--primary-color, #2563eb)" : "";
    musicLoopBtn.style.color = isLooping ? "#fff" : "";
    if (currentAudio) {
        currentAudio.loop = isLooping;
    }
});

document.getElementById("music-stop-btn")?.addEventListener("click", () => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    musicPanel.querySelectorAll(".music-track-btn").forEach(b => b.style.fontWeight = "normal");
});
// -------------------------------------------------

// --- FALLING BACKGROUND DOTS & EMOJI EASTER EGG ---
document.querySelectorAll("#bg-falling-dots-canvas").forEach(el => el.remove());

const bgCanvas = document.createElement("canvas");
bgCanvas.id = "bg-falling-dots-canvas";
bgCanvas.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1;";
document.body.prepend(bgCanvas);

const bgCtx = bgCanvas.getContext("2d");
let bgWidth = bgCanvas.width = window.innerWidth;
let bgHeight = bgCanvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    bgWidth = bgCanvas.width = window.innerWidth;
    bgHeight = bgCanvas.height = window.innerHeight;
});

const easterEggEmojis = ["🐢", "😊", "🚀", "😢", "😂", "✨", "🔥", "🍌"];
const fallingParticles = [];
const particleCount = 45;

for (let i = 0; i < particleCount; i++) {
    fallingParticles.push({
        x: Math.random() * bgWidth,
        y: Math.random() * bgHeight,
        radius: Math.random() * 2.5 + 1,
        speedY: Math.random() * 0.8 + 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        isEmoji: false,
        emoji: "",
        size: 0
    });
}

function animateFallingBackground() {
    bgCtx.clearRect(0, 0, bgWidth, bgHeight);

    const isDark = document.body.classList.contains("dark-mode");
    const dotColor = isDark ? "rgba(255, 255, 255, " : "rgba(0, 0, 0, ";

    for (let p of fallingParticles) {
        p.y += p.speedY;
        if (p.y > bgHeight + 20) {
            p.y = -20;
            p.x = Math.random() * bgWidth;
            if (Math.random() < 0.05) {
                p.isEmoji = true;
                p.emoji = easterEggEmojis[Math.floor(Math.random() * easterEggEmojis.length)];
                p.size = Math.random() * 6 + 14; 
                p.speedY = Math.random() * 0.5 + 0.2; 
            } else {
                p.isEmoji = false;
                p.radius = Math.random() * 2.5 + 1;
                p.speedY = Math.random() * 0.8 + 0.3;
            }
        }

        if (p.isEmoji) {
            bgCtx.font = `${p.size}px sans-serif`;
            bgCtx.globalAlpha = p.opacity + 0.2;
            bgCtx.fillText(p.emoji, p.x, p.y);
        } else {
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            bgCtx.fillStyle = dotColor + p.opacity + ")";
            bgCtx.fill();
        }
    }

    requestAnimationFrame(animateFallingBackground);
}

requestAnimationFrame(animateFallingBackground);
// -------------------------------------------------

const topLeftProfile = document.getElementById("top-left-profile");
const profileOverlay = document.getElementById("profile-overlay");
const closeProfileModal = document.getElementById("close-profile-modal");
const myMiniAvatar = document.getElementById("my-mini-avatar");
const myMiniUsername = document.getElementById("my-mini-username");
const editModalAvatar = document.getElementById("edit-modal-avatar");
const profileDisplayUsername = document.getElementById("profile-display-username");
const openAvatarSelector = document.getElementById("open-avatar-selector");
const avatarSelectorOverlay = document.getElementById("avatar-selector-overlay");
const closeAvatarSelector = document.getElementById("close-avatar-selector");
const bioInput = document.getElementById("bio-input");
const saveBioBtn = document.getElementById("save-bio-btn");
const bioCharCount = document.getElementById("bio-char-count");

let myProfilePfpWrapper = null;
let myProfileStatusDot = null;
if (editModalAvatar && editModalAvatar.parentNode) {
    myProfilePfpWrapper = document.createElement("div");
    myProfilePfpWrapper.style.cssText = "position: relative; display: inline-block; margin-bottom: 15px;";
    editModalAvatar.parentNode.insertBefore(myProfilePfpWrapper, editModalAvatar);
    myProfilePfpWrapper.appendChild(editModalAvatar);
    
    myProfileStatusDot = document.createElement("span");
    myProfileStatusDot.id = "my-profile-modal-status-dot";
    myProfileStatusDot.style.cssText = "position: absolute; bottom: 5px; right: 5px; width: 16px; height: 16px; border-radius: 50%; background: var(--success, #22c55e); border: 3px solid var(--card-bg);";
    myProfilePfpWrapper.appendChild(myProfileStatusDot);
}

const viewProfileOverlay = document.getElementById("view-profile-overlay");
const closeViewProfile = document.getElementById("close-view-profile");
const viewUserAvatar = document.getElementById("view-user-avatar");
const viewUserName = document.getElementById("view-user-name");
const viewUserBio = document.getElementById("view-user-bio");
const profileFriendActionBtn = document.getElementById("profile-friend-action-btn");

let profilePfpWrapper = null;
let profileStatusDot = null;
if (viewUserAvatar && viewUserAvatar.parentNode) {
    profilePfpWrapper = document.createElement("div");
    profilePfpWrapper.style.cssText = "position: relative; display: inline-block; margin: 0 auto 15px auto;";
    viewUserAvatar.parentNode.insertBefore(profilePfpWrapper, viewUserAvatar);
    profilePfpWrapper.appendChild(viewUserAvatar);
    
    profileStatusDot = document.createElement("span");
    profileStatusDot.id = "profile-modal-status-dot";
    profileStatusDot.style.cssText = "position: absolute; bottom: 5px; right: 5px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--card-bg);";
    profilePfpWrapper.appendChild(profileStatusDot);
}

const profileBlockActionBtn = document.createElement("button");
profileBlockActionBtn.className = "btn btn-secondary";
profileBlockActionBtn.style.cssText = "width: 100%; margin-top: 8px; background: #ef4444; color: #fff; border: none;";
profileBlockActionBtn.textContent = "Block User";
if (profileFriendActionBtn && profileFriendActionBtn.parentNode) {
    profileFriendActionBtn.parentNode.insertBefore(profileBlockActionBtn, profileFriendActionBtn.nextSibling);
}

const emojiBtn = document.getElementById("emoji-btn");
const photoBtn = document.getElementById("photo-btn");
const discordEmojiPicker = document.getElementById("discord-emoji-picker");
const discordEmojiGrid = document.getElementById("discord-emoji-grid");

let currentUsername = "Guest";
let viewingProfileUsername = null;
let currentChatRoom = "global";
let unsubscribeMessages = null;
let unsubscribeUserProfiles = new Map();
let userAvatarsCache = {};
let renderedMessageIds = new Set();
let isInitialLoad = true;
let myBlockedUsersCache = [];
let globallyBannedUsersCache = new Set();

const makeEmail = (username) => `${username.toLowerCase().trim()}@simplechat.com`;
const makeSecurePass = (pass) => `sc_${pass}_pad123`;

async function fetchGlobalBannedUsers() {
    try {
        const bannedSnap = await getDocs(collection(db, "banned_users"));
        globallyBannedUsersCache.clear();
        bannedSnap.forEach(d => {
            globallyBannedUsersCache.add(d.id);
        });
    } catch (e) {}
}

function startPresenceHeartbeat() {
    if (presenceInterval) clearInterval(presenceInterval);
    if (currentUsername === "Guest") return;

    const updatePresence = async () => {
        try {
            await fetchGlobalBannedUsers();
            await updateDoc(doc(db, "users", currentUsername), {
                lastSeen: serverTimestamp()
            });
        } catch (e) {}
    };

    updatePresence();
    presenceInterval = setInterval(updatePresence, 20000);
}

function formatMessageTime(timestamp) {
    let date;
    if (!timestamp) {
        date = new Date();
    } else if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) return "Just now";
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const monthStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    
    return isToday ? `Today at ${timeStr}` : `${monthStr}, ${timeStr}`;
}

function sanitizeMessageHTML(str) {
    if (!str) return "";
    const temp = document.createElement("div");
    temp.textContent = str;
    let safeText = temp.innerHTML;

    return safeText.replace(/&lt;img\s+src="([^"]+)"\s+class="inline-avatar-emoji"\s*\/?&gt;/gi, (match, src) => {
        return `<img src="${src}" class="inline-avatar-emoji" alt="emoji" />`;
    });
}

function scrollToBottom(smooth = false) {
    if (messagesContainer) {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }
}

themeToggleBtn?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    themeToggleBtn.textContent = document.body.classList.contains("dark-mode") ? "🌙" : "☀️";
});

navFriendsBtn?.addEventListener("click", () => {
    globalChatSection.classList.add("hidden");
    friendsSection.classList.remove("hidden");
    loadFriendsAndRequests();
    loadFriendsAndGroupsLists();
});

backToChatBtn?.addEventListener("click", () => {
    friendsSection.classList.add("hidden");
    globalChatSection.classList.remove("hidden");
});

exitDmBtn?.addEventListener("click", () => {
    currentChatRoom = "global";
    currentGroupData = null;
    chatRoomTitle.textContent = "global chat";
    exitDmBtn.classList.add("hidden");
    exitDmBtn.style.display = "none";
    if (photoBtn) {
        photoBtn.classList.add("hidden");
        photoBtn.style.display = "none";
    }
    loadMessagesFeed();
});

tabRegister?.addEventListener("click", () => {
    tabRegister.className = "tab-btn active";
    tabLogin.className = "tab-btn";
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
});

tabLogin?.addEventListener("click", () => {
    tabLogin.className = "tab-btn active";
    tabRegister.className = "tab-btn";
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
});

authModalBtn?.addEventListener("click", () => authOverlay.classList.remove("hidden"));
closeModalBtn?.addEventListener("click", () => authOverlay.classList.add("hidden"));
logoutBtn?.addEventListener("click", () => {
    if (presenceInterval) clearInterval(presenceInterval);
    if (banPanelTrigger) banPanelTrigger.classList.add("hidden");
    signOut(auth);
});

registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;

    try {
        await createUserWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
        await setDoc(doc(db, "users", username), {
            username,
            bio: "Hey there! I am using SimpleChat.",
            avatar: "avatar1.png",
            friends: [],
            friendRequests: [],
            blocked: [],
            lastSeen: serverTimestamp()
        });
        authOverlay.classList.add("hidden");
    } catch (err) {
        authError.textContent = err.message;
    }
});

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    try {
        await signInWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
        authOverlay.classList.add("hidden");
    } catch (err) {
        authError.textContent = "Invalid credentials.";
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUsername = user.email.split("@")[0];
        await fetchGlobalBannedUsers();

        myMiniUsername.innerHTML = renderUsernameWithCrown(currentUsername);
        authModalBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");

        const userRef = doc(db, "users", currentUsername);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            await setDoc(userRef, {
                username: currentUsername,
                bio: "Hey there! I am using SimpleChat.",
                avatar: "avatar1.png",
                friends: [],
                friendRequests: [],
                blocked: [],
                lastSeen: serverTimestamp()
            });
        }

        const data = snap.exists() ? snap.data() : {};
        myBlockedUsersCache = data.blocked || [];
        if (data.avatar) {
            myMiniAvatar.src = data.avatar;
            editModalAvatar.src = data.avatar;
            userAvatarsCache[currentUsername] = data.avatar;
        }
        if (data.bio) bioInput.value = data.bio;
        
        if (currentUsername === "matubanana" || currentUsername === "matubanana2") {
            banPanelTrigger?.classList.remove("hidden");
        } else {
            banPanelTrigger?.classList.add("hidden");
        }

        startPresenceHeartbeat();
    } else {
        if (presenceInterval) clearInterval(presenceInterval);
        currentUsername = "Guest";
        myBlockedUsersCache = [];
        globallyBannedUsersCache.clear();
        myMiniUsername.textContent = "Guest";
        authModalBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
        banPanelTrigger?.classList.add("hidden");
    }
    loadMessagesFeed();
});

topLeftProfile?.addEventListener("click", () => {
    if (currentUsername === "Guest") {
        authOverlay.classList.remove("hidden");
        return;
    }
    profileDisplayUsername.innerHTML = renderUsernameWithCrown(currentUsername);
    if (myProfileStatusDot) {
        myProfileStatusDot.style.background = "var(--success, #22c55e)";
    }
    profileOverlay.classList.remove("hidden");
});
closeProfileModal?.addEventListener("click", () => profileOverlay.classList.add("hidden"));

openAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.remove("hidden"));
closeAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.add("hidden"));

document.querySelectorAll(".preset-avatar").forEach(el => {
    el.addEventListener("click", async (e) => {
        const selected = e.target.getAttribute("data-avatar");
        await applyNewAvatar(selected);
    });
});

const customAvatarFileInput = document.createElement("input");
customAvatarFileInput.type = "file";
customAvatarFileInput.accept = "image/png, image/jpeg, image/jpg";
customAvatarFileInput.style.display = "none";
document.body.appendChild(customAvatarFileInput);

const cropOverlay = document.createElement("div");
cropOverlay.id = "crop-preview-overlay";
cropOverlay.className = "modal-overlay hidden";
cropOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999;";
cropOverlay.innerHTML = `
    <div class="modal" style="background: var(--card-bg); padding: 20px; border-radius: 12px; text-align: center; max-width: 320px; width: 90%; border: 1px solid var(--border-color);">
        <h3 style="margin-bottom: 15px; color: var(--text-color);">Position Your PFP</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px;">Drag to pan or scroll to zoom your image inside the circle.</p>
        <div id="crop-viewport" style="position: relative; width: 200px; height: 200px; margin: 0 auto 15px auto; overflow: hidden; border-radius: 50%; border: 3px solid var(--primary-color); cursor: grab; background: #000;">
            <img id="crop-source-img" style="position: absolute; top: 0; left: 0; user-select: none; pointer-events: none; max-width: none;" />
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancel-crop-btn" class="btn btn-secondary" style="flex: 1; height: 40px;">Cancel</button>
            <button id="confirm-crop-btn" class="btn btn-primary" style="flex: 1; height: 40px;">Save PFP</button>
        </div>
    </div>
`;
document.body.appendChild(cropOverlay);

const avatarModalContent = document.querySelector("#avatar-selector-overlay .modal");
if (avatarModalContent) {
    avatarModalContent.querySelectorAll(".custom-pfp-trigger-btn").forEach(el => el.remove());
    
    const customPfpBtn = document.createElement("button");
    customPfpBtn.className = "btn btn-secondary custom-pfp-trigger-btn";
    customPfpBtn.style.cssText = "width: 100%; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;";
    
    const circleSpan = document.createElement("span");
    circleSpan.style.cssText = "width: 12px; height: 12px; border-radius: 50%; border: 2px solid currentColor; display: inline-block;";
    customPfpBtn.appendChild(circleSpan);
    
    const textSpan = document.createElement("span");
    textSpan.textContent = "Upload Custom PFP";
    customPfpBtn.appendChild(textSpan);

    customPfpBtn.addEventListener("click", () => customAvatarFileInput.click());
    avatarModalContent.appendChild(customPfpBtn);
}

let activeImageObj = null;
let imgX = 0, imgY = 0, imgScale = 1;
let isDragging = false;
let startX = 0, startY = 0;

const cropViewport = document.getElementById("crop-viewport");
const cropSourceImg = document.getElementById("crop-source-img");

customAvatarFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        activeImageObj = new Image();
        activeImageObj.onload = function () {
            cropSourceImg.src = activeImageObj.src;
            imgScale = Math.max(200 / activeImageObj.width, 200 / activeImageObj.height);
            imgX = (200 - (activeImageObj.width * imgScale)) / 2;
            imgY = (200 - (activeImageObj.height * imgScale)) / 2;
            updateCropImageTransform();
            avatarSelectorOverlay.classList.add("hidden");
            cropOverlay.classList.remove("hidden");
            customAvatarFileInput.value = "";
        };
        activeImageObj.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function updateCropImageTransform() {
    if (!cropSourceImg) return;
    cropSourceImg.style.width = `${activeImageObj.width * imgScale}px`;
    cropSourceImg.style.height = `${activeImageObj.height * imgScale}px`;
    cropSourceImg.style.transform = `translate(${imgX}px, ${imgY}px)`;
}

cropViewport?.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX - imgX;
    startY = e.clientY - imgY;
    cropViewport.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    imgX = e.clientX - startX;
    imgY = e.clientY - startY;
    updateCropImageTransform();
});

window.addEventListener("mouseup", () => {
    isDragging = false;
    if (cropViewport) cropViewport.style.cursor = "grab";
});

cropViewport?.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - imgX;
        startY = e.touches[0].clientY - imgY;
    }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    imgX = e.touches[0].clientX - imgX;
    imgY = e.touches[0].clientY - startY;
    updateCropImageTransform();
}, { passive: true });

window.addEventListener("touchend", () => {
    isDragging = false;
});

cropViewport?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    imgScale *= zoomFactor;
    updateCropImageTransform();
}, { passive: false });

document.getElementById("cancel-crop-btn")?.addEventListener("click", () => {
    cropOverlay.classList.add("hidden");
});

document.getElementById("confirm-crop-btn")?.addEventListener("click", async () => {
    const canvas = document.createElement("canvas");
    const outputSize = 150;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        activeImageObj,
        -imgX / imgScale,
        -imgY / imgScale,
        200 / imgScale,
        200 / imgScale,
        0,
        0,
        outputSize,
        outputSize
    );

    canvas.toBlob(async (blob) => {
        cropOverlay.classList.add("hidden");
        if (!blob) return;

        const formData = new FormData();
        formData.append("image", blob, "pfp.jpg");

        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                await applyNewAvatar(data.data.url);
            } else {
                alert("Failed to upload custom PFP: " + (data.error?.message || "unknown error"));
            }
        } catch (err) {
            alert("Network error uploading PFP: " + err.message);
        }
    }, "image/jpeg", 0.9);
});

async function applyNewAvatar(avatarUrl) {
    myMiniAvatar.src = avatarUrl;
    editModalAvatar.src = avatarUrl;
    userAvatarsCache[currentUsername] = avatarUrl;
    avatarSelectorOverlay.classList.add("hidden");

    if (currentUsername !== "Guest") {
        try {
            await updateDoc(doc(db, "users", currentUsername), { avatar: avatarUrl });
        } catch (err) {}
    }
}

bioInput?.addEventListener("input", () => {
    const left = 150 - bioInput.value.length;
    bioCharCount.textContent = `${left} characters left`;
});

saveBioBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest") return;
    await updateDoc(doc(db, "users", currentUsername), { bio: bioInput.value.trim() });
    profileOverlay.classList.add("hidden");
});

photoBtn?.addEventListener("click", () => {
    if (currentUsername === "Guest") return;
    if (currentChatRoom === "global") {
        alert("Images can only be sent in DMs and Group chats, not in the global chat!");
        return;
    }
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
        alert("Only PNG, JPG, and JPEG images are allowed!");
        fileInput.value = "";
        return;
    }

    selectedImageFile = file;
    messageInput.value = "(image)";
    messageInput.focus();
});

messageInput?.addEventListener("input", () => {
    if (selectedImageFile && !messageInput.value.includes("(image)")) {
        selectedImageFile = null;
        fileInput.value = "";
    }
});

if (discordEmojiGrid) {
    discordEmojiGrid.innerHTML = "";
    const basicEmojis = ["😂", "😭", "👀", "💀", "👍", "👎"];
    basicEmojis.forEach(em => {
        const emojiDiv = document.createElement("div");
        emojiDiv.className = "discord-picker-emoji-thumb";
        emojiDiv.textContent = em;
        emojiDiv.addEventListener("click", (e) => {
            e.preventDefault();
            messageInput.value += em;
            messageInput.focus();
            discordEmojiPicker.classList.add("hidden");
        });
        discordEmojiGrid.appendChild(emojiDiv);
    });

    const avatars = ["avatar1.png", "avatar2.png", "avatar3.png", "avatar4.png", "avatar5.png"];
    avatars.forEach(av => {
        const imgThumb = document.createElement("img");
        imgThumb.src = av;
        imgThumb.className = "discord-picker-emoji-thumb";
        imgThumb.style.width = "28px";
        imgThumb.style.height = "28px";
        imgThumb.style.borderRadius = "50%";
        imgThumb.style.objectFit = "cover";
        imgThumb.style.cursor = "pointer";
        imgThumb.addEventListener("click", (e) => {
            e.preventDefault();
            messageInput.value += `<img src="${av}" class="inline-avatar-emoji" />`;
            messageInput.focus();
            discordEmojiPicker.classList.add("hidden");
        });
        discordEmojiGrid.appendChild(imgThumb);
    });
// All 15 GIFs + video loaded with performance optimization
    const projectVideos = [
        "gif1.mp4", "gif2.mp4", "gif3.mp4", "gif4.mp4", "gif5.mp4", 
        "gif6.mp4", "gif7.mp4", "gif8.mp4", "gif9.mp4", "gif10.mp4", 
        "gif11.mp4", "gif12.mp4", "gif13.mp4", "gif14.mp4", "gif15.mp4", 
        "myvideo.mp4"
    ];

    projectVideos.forEach(videoSrc => {
        const wrapper = document.createElement("div");
        wrapper.className = "discord-picker-emoji-thumb video-wrapper";
        wrapper.style.cssText = "width: 36px; height: 36px; position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;";
        
        const vidThumb = document.createElement("video");
        vidThumb.src = videoSrc;
        vidThumb.autoplay = false; // Kept paused by default to save CPU!
        vidThumb.loop = true;
        vidThumb.muted = true;
        vidThumb.playsInline = true;
        vidThumb.style.cssText = "width: 100%; height: 100%; object-fit: cover; border-radius: 4px; pointer-events: none;";
        wrapper.appendChild(vidThumb);

        wrapper.addEventListener("click", async (e) => {
            e.preventDefault();
            discordEmojiPicker.classList.add("hidden");
            setGifPickerPlaying(false);
            if (currentUsername === "Guest") return;

            let roomKey = "global";
            let recipient = null;
            if (currentChatRoom === "global") {
                roomKey = "global";
            } else if (currentChatRoom.startsWith("group_")) {
                roomKey = currentChatRoom;
            } else {
                roomKey = [currentUsername, currentChatRoom].sort().join("_dm_");
                recipient = currentChatRoom;
            }
            
            const messagePayload = {
                mediaUrl: videoSrc,
                mediaType: "video",
                username: currentUsername,
                room: roomKey,
                recipient: recipient,
                timestamp: serverTimestamp()
            };

            if (replyingToMessage) {
                messagePayload.replyTo = {
                    username: replyingToMessage.username,
                    text: replyingToMessage.text || (replyingToMessage.mediaType ? `[${replyingToMessage.mediaType}]` : "Attachment")
                };
            }

            await addDoc(collection(db, "messages"), messagePayload);
            clearReplyState();
        });
        discordEmojiGrid.appendChild(wrapper);
    });
}

// Helper to play/pause GIFs so they don't lag your app in the background
function setGifPickerPlaying(isPlaying) {
    if (!discordEmojiGrid) return;
    const videos = discordEmojiGrid.querySelectorAll("video");
    videos.forEach(vid => {
        if (isPlaying) {
            vid.play().catch(() => {});
        } else {
            vid.pause();
        }
    });
}

emojiBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    discordEmojiPicker.classList.toggle("hidden");
    const isOpen = !discordEmojiPicker.classList.contains("hidden");
    setGifPickerPlaying(isOpen); // Only play videos when drawer is open!
});

document.addEventListener("click", (e) => {
    if (discordEmojiPicker && !discordEmojiPicker.contains(e.target) && e.target !== emojiBtn) {
        discordEmojiPicker.classList.add("hidden");
        setGifPickerPlaying(false); // Pause videos when closing
    }
});

messageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (currentUsername === "Guest") return;

    if (currentChatRoom === "global" && selectedImageFile) {
        alert("Images cannot be sent in the global chat!");
        selectedImageFile = null;
        fileInput.value = "";
        messageInput.value = "";
        return;
    }

    let roomKey = "global";
    let recipient = null;
    if (currentChatRoom === "global") {
        roomKey = "global";
    } else if (currentChatRoom.startsWith("group_")) {
        roomKey = currentChatRoom;
    } else {
        roomKey = [currentUsername, currentChatRoom].sort().join("_dm_");
        recipient = currentChatRoom;
    }

    if (selectedImageFile && messageInput.value.includes("(image)")) {
        const fileToUpload = selectedImageFile;
        selectedImageFile = null;
        fileInput.value = "";
        messageInput.value = "Uploading image...";

        try {
            const formData = new FormData();
            formData.append("image", fileToUpload);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                messageInput.value = "";
                
                const messagePayload = {
                    mediaUrl: data.data.url,
                    mediaType: "image",
                    username: currentUsername,
                    room: roomKey,
                    recipient: recipient,
                    timestamp: serverTimestamp()
                };

                if (replyingToMessage) {
                    messagePayload.replyTo = {
                        username: replyingToMessage.username,
                        text: replyingToMessage.text || "[image]"
                    };
                }

                await addDoc(collection(db, "messages"), messagePayload);
                clearReplyState();
                scrollToBottom(true);
            } else {
                alert("Upload failed: " + data.error.message);
                messageInput.value = "";
            }
        } catch (err) {
            alert("Failed to send image: " + err.message);
            messageInput.value = "";
        }
        return;
    }

    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = "";

    const messagePayload = {
        text,
        username: currentUsername,
        room: roomKey,
        recipient: recipient,
        timestamp: serverTimestamp()
    };

    if (replyingToMessage) {
        messagePayload.replyTo = {
            username: replyingToMessage.username,
            text: replyingToMessage.text || (replyingToMessage.mediaType ? `[${replyingToMessage.mediaType}]` : "Attachment")
        };
    }

    await addDoc(collection(db, "messages"), messagePayload);
    clearReplyState();
    scrollToBottom(true);
});

function watchUserAvatar(username, callback) {
    if (!username) return;
    if (unsubscribeUserProfiles.has(username)) return;

    const userDocRef = doc(db, "users", username);
    const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.avatar) {
                userAvatarsCache[username] = data.avatar;
                callback(data.avatar);
            }
        }
    });
    unsubscribeUserProfiles.set(username, unsub);
}

async function getLiveUserAvatar(username, imgElement = null) {
    if (!username) return "avatar1.png";
    if (username === currentUsername && myMiniAvatar && myMiniAvatar.src) {
        return myMiniAvatar.src;
    }
    if (userAvatarsCache[username]) {
        if (imgElement) {
            watchUserAvatar(username, (newAvatar) => {
                imgElement.src = newAvatar;
            });
        }
        return userAvatarsCache[username];
    }
    try {
        const userDoc = await getDoc(doc(db, "users", username));
        if (userDoc.exists() && userDoc.data().avatar) {
            userAvatarsCache[username] = userDoc.data().avatar;
            if (imgElement) {
                watchUserAvatar(username, (newAvatar) => {
                    imgElement.src = newAvatar;
                });
            }
            return userDoc.data().avatar;
        }
    } catch (err) {}
    
    if (imgElement) {
        watchUserAvatar(username, (newAvatar) => {
            imgElement.src = newAvatar;
        });
    }
    return "avatar1.png";
}

function loadMessagesFeed() {
    if (unsubscribeMessages) unsubscribeMessages();

    renderedMessageIds.clear();
    messagesContainer.innerHTML = "";
    isInitialLoad = true;

    if (currentChatRoom !== "global" && !currentChatRoom.startsWith("group_")) {
        chatRoomTitle.innerHTML = `<span style="display: flex; align-items: center; gap: 8px;"><img id="dm-header-avatar" src="avatar1.png" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" /> DM with @${sanitizeMessageHTML(currentChatRoom)}</span>`;
        if (photoBtn) {
            photoBtn.classList.remove("hidden");
            photoBtn.style.display = "inline-block";
        }
        const dmHeaderAvatarImg = document.getElementById("dm-header-avatar");
        getLiveUserAvatar(currentChatRoom, dmHeaderAvatarImg).then(av => {
            if (dmHeaderAvatarImg) dmHeaderAvatarImg.src = av;
        });
    } else if (currentChatRoom.startsWith("group_")) {
        if (photoBtn) {
            photoBtn.classList.remove("hidden");
            photoBtn.style.display = "inline-block";
        }
    } else {
        chatRoomTitle.textContent = "global chat";
        if (photoBtn) {
            photoBtn.classList.add("hidden");
            photoBtn.style.display = "none";
        }
    }

    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(q, async (snapshot) => {
        await fetchGlobalBannedUsers();

        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 300;
        
        const existingDocIds = new Set(snapshot.docs.map(d => d.id));
        renderedMessageIds.forEach(id => {
            if (!existingDocIds.has(id)) {
                renderedMessageIds.delete(id);
                const el = document.getElementById(`msg-${id}`);
                if (el) el.remove();
            }
        });

        let docsArray = snapshot.docs;
        let hasNewMessages = false;

        for (const docSnap of docsArray) {
            const msgId = docSnap.id;
            const msg = docSnap.data();

            if (globallyBannedUsersCache.has(msg.username)) continue;
            if (myBlockedUsersCache.includes(msg.username)) continue;

            let matchesRoom = false;
            if (currentChatRoom === "global") {
                matchesRoom = !msg.room || msg.room === "global" || msg.room === "";
            } else if (currentChatRoom.startsWith("group_")) {
                matchesRoom = msg.room === currentChatRoom;
            } else {
                const expectedDM = [currentUsername, currentChatRoom].sort().join("_dm_");
                matchesRoom = msg.room === expectedDM || 
                              (msg.recipient === currentUsername && msg.username === currentChatRoom) || 
                              (msg.recipient === currentChatRoom && msg.username === currentUsername);
            }

            if (!matchesRoom) continue;

            let existingMsgEl = document.getElementById(`msg-${msgId}`);

            if (!existingMsgEl) {
                renderedMessageIds.add(msgId);
                hasNewMessages = true;

                const isSent = msg.username === currentUsername;
                const div = document.createElement("div");
                div.id = `msg-${msgId}`;
                div.className = `msg ${isSent ? 'sent' : 'received'}`;
                const readableTime = formatMessageTime(msg.timestamp);

                let contentHTML = "";
                if (msg.mediaUrl || msg.imageUrl) {
                    const mediaPath = msg.mediaUrl || msg.imageUrl;
                    const isVideo = msg.mediaType === "video" || mediaPath.endsWith(".mp4");
                    const isAvatarEmoji = mediaPath.includes("avatar") && !mediaPath.startsWith("http");

                    if (isVideo) {
                        contentHTML = `<video src="${mediaPath}" autoplay loop muted playsinline disablepictureinpicture style="max-width:320px; width:100%; border-radius:8px; display:block; pointer-events:none; user-select:none;"></video>`;
                    } else if (isAvatarEmoji) {
                        contentHTML = `<img src="${mediaPath}" class="inline-avatar-emoji" alt="emoji" />`;
                    } else {
                        contentHTML = `<img src="${mediaPath}" style="max-width:280px; width:100%; border-radius:8px; display:block;" />`;
                    }
                } else {
                    contentHTML = sanitizeMessageHTML(msg.text || "");
                }

                let replyHTML = "";
                if (msg.replyTo) {
                    const snippetText = (msg.replyTo.text || "").length > 40 ? msg.replyTo.text.substring(0, 40) + "..." : (msg.replyTo.text || "");
                    replyHTML = `
                        <div class="msg-reply-snippet" style="font-size: 11px; opacity: 0.75; border-left: 2px solid var(--primary-color); padding-left: 6px; margin-bottom: 4px;">
                            Replying to <b>@${sanitizeMessageHTML(msg.replyTo.username)}</b>: ${sanitizeMessageHTML(snippetText)}
                        </div>
                    `;
                }

                let deleteBtnHTML = isSent ? `<button type="button" class="delete-msg-btn" title="Delete message" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 11px; padding: 0 4px; opacity: 0.6; margin-left: 6px;">🗑️</button>` : "";

                const avatarImgElement = document.createElement("img");
                avatarImgElement.className = "msg-avatar-img";
                avatarImgElement.alt = "Avatar";
                avatarImgElement.src = "avatar1.png";

                const effectiveAvatar = await getLiveUserAvatar(msg.username, avatarImgElement);
                avatarImgElement.src = effectiveAvatar;

                const isGroupCtx = currentChatRoom.startsWith("group_");
                const groupCreatorName = currentGroupData ? currentGroupData.creator : null;

                div.innerHTML = `
                    <div class="msg-content">
                        <div class="msg-header">
                            ${!isSent ? `<span class="msg-author">${renderUsernameWithCrown(msg.username, isGroupCtx, groupCreatorName)}</span>` : ""}
                            <span class="msg-time">${readableTime}</span>
                            ${deleteBtnHTML}
                        </div>
                        ${replyHTML}
                        <div class="msg-bubble">${contentHTML}</div>
                    </div>
                `;
                div.prepend(avatarImgElement);

                if (isSent) {
                    const delBtn = div.querySelector(".delete-msg-btn");
                    delBtn?.addEventListener("click", async () => {
                        if (confirm("Are you sure you want to delete this message?")) {
                            try {
                                await deleteDoc(doc(db, "messages", msgId));
                            } catch (err) {
                                alert("Failed to delete message: " + err.message);
                            }
                        }
                    });
                }

                div.addEventListener("dblclick", () => {
                    if (currentUsername === "Guest") return;
                    replyingToMessage = msg;
                    replyPreviewText.innerHTML = `Replying to <b>@${sanitizeMessageHTML(msg.username)}</b>: ${sanitizeMessageHTML(msg.text || msg.mediaType || "Attachment")}`;
                    replyPreviewBar.classList.remove("hidden");
                    replyPreviewBar.style.display = "flex";
                    messageInput.focus();
                });

                div.querySelectorAll(".msg-avatar-img, .msg-author").forEach(el => {
                    el.addEventListener("click", () => openUserProfileModal(msg.username));
                });

                messagesContainer.appendChild(div);
            }
        }

        if (isInitialLoad) {
            scrollToBottom(false);
            isInitialLoad = false;
        } else if (hasNewMessages && isNearBottom) {
            scrollToBottom(true);
        }
    });
}

async function openUserProfileModal(username) {
    viewingProfileUsername = username;
    viewUserName.innerHTML = renderUsernameWithCrown(username);
    viewUserAvatar.src = "avatar1.png";
    viewUserBio.textContent = "Loading bio...";
    profileFriendActionBtn.textContent = "Send Friend Request";
    profileFriendActionBtn.disabled = false;
    profileBlockActionBtn.textContent = myBlockedUsersCache.includes(username) ? "Unblock User" : "Block User";

    if (profileStatusDot) {
        profileStatusDot.style.background = "#ef4444";
    }

    try {
        const userDoc = await getDoc(doc(db, "users", username));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.avatar) viewUserAvatar.src = data.avatar;
            
            let isOnline = false;
            if (data.lastSeen) {
                const lastSeenDate = data.lastSeen.toDate();
                const diffSecs = (new Date() - lastSeenDate) / 1000;
                if (diffSecs < 45) isOnline = true;
            }

            if (profileStatusDot) {
                profileStatusDot.style.background = isOnline ? 'var(--success, #22c55e)' : '#ef4444';
            }

            const bioText = data.bio || "Hey there! I am using SimpleChat.";
            viewUserBio.innerHTML = `<div style="color: var(--text-color);">${sanitizeMessageHTML(bioText)}</div>`;
        }

        if (currentUsername !== "Guest" && currentUsername !== username) {
            const myDoc = await getDoc(doc(db, "users", currentUsername));
            if (myDoc.exists()) {
                const myData = myDoc.data();
                if ((myData.friends || []).includes(username)) {
                    profileFriendActionBtn.textContent = "Friends (Open DM)";
                    profileFriendActionBtn.onclick = () => {
                        viewProfileOverlay.classList.add("hidden");
                        openDirectMessage(username);
                    };
                } else {
                    const targetDoc = await getDoc(doc(db, "users", username));
                    const targetRequests = (targetDoc.data() || {}).friendRequests || [];
                    if (targetRequests.includes(currentUsername)) {
                        profileFriendActionBtn.textContent = "Request Sent";
                        profileFriendActionBtn.disabled = true;
                    }
                }
            }
        } else if (currentUsername === username) {
            profileFriendActionBtn.textContent = "This is You";
            profileFriendActionBtn.disabled = true;
            profileBlockActionBtn.style.display = "none";
        }
        if (currentUsername !== username) {
            profileBlockActionBtn.style.display = "block";
        }
    } catch(e) {}

    viewProfileOverlay.classList.remove("hidden");
}

closeViewProfile?.addEventListener("click", () => viewProfileOverlay.classList.add("hidden"));

profileBlockActionBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest" || !viewingProfileUsername) return;
    const myRef = doc(db, "users", currentUsername);
    const isCurrentlyBlocked = myBlockedUsersCache.includes(viewingProfileUsername);

    if (isCurrentlyBlocked) {
        await updateDoc(myRef, {
            blocked: arrayRemove(viewingProfileUsername)
        });
        myBlockedUsersCache = myBlockedUsersCache.filter(u => u !== viewingProfileUsername);
        profileBlockActionBtn.textContent = "Block User";
    } else {
        await updateDoc(myRef, {
            blocked: arrayUnion(viewingProfileUsername)
        });
        myBlockedUsersCache.push(viewingProfileUsername);
        profileBlockActionBtn.textContent = "Unblock User";
    }
    viewProfileOverlay.classList.add("hidden");
    loadMessagesFeed();
    loadFriendsAndRequests();
    loadFriendsAndGroupsLists();
});

profileFriendActionBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest" || !viewingProfileUsername) return;
    if (profileFriendActionBtn.textContent.includes("Open DM")) return;
    
    const targetSnap = await getDoc(doc(db, "users", viewingProfileUsername));
    if (!targetSnap.exists()) return;

    await updateDoc(doc(db, "users", viewingProfileUsername), {
        friendRequests: arrayUnion(currentUsername)
    });
    profileFriendActionBtn.textContent = "Request Sent";
    profileFriendActionBtn.disabled = true;
});

sendFriendRequestBtn?.addEventListener("click", async () => {
    const targetName = addFriendInput.value.trim();
    if (!targetName || currentUsername === "Guest") return;

    try {
        const targetSnap = await getDoc(doc(db, "users", targetName));
        if (!targetSnap.exists()) {
            friendActionMsg.textContent = "User not found.";
            return;
        }
        await updateDoc(doc(db, "users", targetName), {
            friendRequests: arrayUnion(currentUsername)
        });
        friendActionMsg.textContent = `Friend request sent to ${targetName}!`;
        addFriendInput.value = "";
        loadFriendsAndRequests();
        loadFriendsAndGroupsLists();
    } catch (err) {
        friendActionMsg.textContent = "Error sending request.";
    }
});

async function loadFriendsAndRequests() {
    if (currentUsername === "Guest") return;
    pendingRequestsContainer.innerHTML = "";
    friendsListContainer.innerHTML = "";
    if (blockedUsersContainer) blockedUsersContainer.innerHTML = "";
    if (adminBannedUsersContainer) adminBannedUsersContainer.innerHTML = "";

    await fetchGlobalBannedUsers();

    const mySnap = await getDoc(doc(db, "users", currentUsername));
    if (!mySnap.exists()) return;
    const myData = mySnap.data();

    const requests = myData.friendRequests || [];
    const friends = myData.friends || [];
    myBlockedUsersCache = myData.blocked || [];

    if (currentUsername === "matubanana" || currentUsername === "matubanana2") {
        adminBannedUsersSection?.classList.remove("hidden");
        try {
            const bannedQuerySnap = await getDocs(collection(db, "banned_users"));
            if (bannedQuerySnap.empty) {
                adminBannedUsersContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No banned users.</p>`;
            } else {
                bannedQuerySnap.forEach(uDoc => {
                    const bUserData = uDoc.data();
                    const bName = bUserData.username;
                    const row = document.createElement("div");
                    row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color);";
                    row.innerHTML = `
                        <span style="font-size: 13px; color: #ef4444; font-weight: 600;">@${sanitizeMessageHTML(bName)}</span>
                        <button class="btn btn-secondary" style="padding: 3px 10px; font-size: 11px; background: #22c55e; color: #fff; border: none;">Unban</button>
                    `;
                    row.querySelector("button").addEventListener("click", async () => {
                        if (confirm(`Unban @${bName}?`)) {
                            await deleteDoc(doc(db, "banned_users", bName));
                            loadFriendsAndRequests();
                            loadFriendsAndGroupsLists();
                            loadMessagesFeed();
                        }
                    });
                    adminBannedUsersContainer.appendChild(row);
                });
            }
        } catch (e) {
            adminBannedUsersContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">Error loading banned list.</p>`;
        }
    } else {
        adminBannedUsersSection?.classList.add("hidden");
    }

    if (requests.length === 0) {
        pendingRequestsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No pending requests.</p>`;
    } else {
        for (const reqUser of requests) {
            if (globallyBannedUsersCache.has(reqUser)) continue;
            const avatarUrl = await getLiveUserAvatar(reqUser);
            const row = document.createElement("div");
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color);";
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${avatarUrl}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
                    <span>${sanitizeMessageHTML(reqUser)}</span>
                </div>
                <button class="btn btn-primary" style="padding: 4px 10px; font-size: 12px;">Accept</button>
            `;
            row.querySelector("button").addEventListener("click", () => acceptFriendRequest(reqUser));
            pendingRequestsContainer.appendChild(row);
        }
    }

    if (friends.length === 0) {
        friendsListContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No friends added yet.</p>`;
    } else {
        for (const friend of friends) {
            if (globallyBannedUsersCache.has(friend)) continue;
            const avatarUrl = await getLiveUserAvatar(friend);
            
            const friendDoc = await getDoc(doc(db, "users", friend));
            let isOnline = false;
            if (friendDoc.exists() && friendDoc.data().lastSeen) {
                const lastSeenDate = friendDoc.data().lastSeen.toDate();
                const diffSecs = (new Date() - lastSeenDate) / 1000;
                if (diffSecs < 45) isOnline = true;
            }

            const row = document.createElement("div");
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;";
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; position: relative;">
                    <div style="position: relative;">
                        <img src="${avatarUrl}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; display: block;" />
                        <span style="position: absolute; bottom: 0; right: 0; width: 8px; height: 8px; background: ${isOnline ? 'var(--success, #22c55e)' : '#ef4444'}; border-radius: 50%; border: 1px solid var(--card-bg);"></span>
                    </div>
                    <span style="font-weight: 600;">DM @${sanitizeMessageHTML(friend)}</span>
                </div>
                <span style="font-size: 12px; color: ${isOnline ? 'var(--success, #22c55e)' : '#ef4444'};">${isOnline ? 'Online' : 'Offline'}</span>
            `;
            row.addEventListener("click", () => openDirectMessage(friend));
            friendsListContainer.appendChild(row);
        }
    }

    if (blockedUsersContainer) {
        if (myBlockedUsersCache.length === 0) {
            blockedUsersContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No blocked users.</p>`;
        } else {
            for (const blockedUser of myBlockedUsersCache) {
                const bRow = document.createElement("div");
                bRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color);";
                bRow.innerHTML = `
                    <span style="font-size: 13px;">@${sanitizeMessageHTML(blockedUser)}</span>
                    <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 11px; background: #ef4444; color: #fff; border: none;">Unblock</button>
                `;
                bRow.querySelector("button").addEventListener("click", async () => {
                    const myRef = doc(db, "users", currentUsername);
                    await updateDoc(myRef, {
                        blocked: arrayRemove(blockedUser)
                    });
                    loadFriendsAndRequests();
                    loadFriendsAndGroupsLists();
                    loadMessagesFeed();
                });
                blockedUsersContainer.appendChild(bRow);
            }
        }
    }
}

function openDirectMessage(friendName) {
    currentChatRoom = friendName;
    currentGroupData = null;
    chatRoomTitle.textContent = `DM with @${friendName}`;
    exitDmBtn.classList.remove("hidden");
    exitDmBtn.style.display = "inline-block";
    if (photoBtn) {
        photoBtn.classList.remove("hidden");
        photoBtn.style.display = "inline-block";
    }
    friendsSection.classList.add("hidden");
    globalChatSection.classList.remove("hidden");
    loadMessagesFeed();
}

async function acceptFriendRequest(friendName) {
    const myRef = doc(db, "users", currentUsername);
    const friendRef = doc(db, "users", friendName);

    const friendSnap = await getDoc(friendRef);
    if (!friendSnap.exists()) return;

    await updateDoc(myRef, {
        friends: arrayUnion(friendName),
        friendRequests: arrayRemove(friendName)
    });
    await updateDoc(friendRef, {
        friends: arrayUnion(currentUsername)
    });
    loadFriendsAndRequests();
    loadFriendsAndGroupsLists();
}

// --- REDESIGNED GROUP CHAT (CLEAN, INSTANT, NO SIDEBAR, WITH LEAVE BUTTON) ---

const friendsSectionElement = document.getElementById("friends-section");
const createGroupBtn = document.createElement("button");
createGroupBtn.className = "btn btn-primary";
createGroupBtn.style.cssText = "width: 100%; margin-top: 15px; background: var(--primary-color); color: #fff; border: none; padding: 8px; font-size: 13px; border-radius: 6px; cursor: pointer;";
createGroupBtn.textContent = "👥 Create Group Chat";
friendsSectionElement?.appendChild(createGroupBtn);

const groupModalOverlay = document.createElement("div");
groupModalOverlay.className = "modal-overlay hidden";
groupModalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 99999;";
groupModalOverlay.innerHTML = `
    <div class="modal" style="background: var(--card-bg); padding: 25px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%; border: 1px solid var(--border-color);">
        <h3 style="margin-bottom: 12px; color: var(--text-color);">Create Group Chat</h3>
        <input type="text" id="group-name-input" placeholder="Group Name..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color); margin-bottom: 15px; box-sizing: border-box;" />
        <p style="font-size: 12px; color: var(--text-muted); text-align: left; margin-bottom: 6px;">Select Friends to Add:</p>
        <div id="group-friends-checkbox-container" style="max-height: 150px; overflow-y: auto; text-align: left; border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 6px;"></div>
        <div style="display: flex; gap: 10px;">
            <button id="cancel-group-btn" class="btn btn-secondary" style="flex: 1; height: 40px;">Cancel</button>
            <button id="confirm-group-btn" class="btn btn-primary" style="flex: 1; height: 40px;">Create</button>
        </div>
        <p id="group-status-msg" style="font-size: 12px; margin-top: 10px; color: var(--text-muted);"></p>
    </div>
`;
document.body.appendChild(groupModalOverlay);

// Leave Group Button next to Exit DM
const leaveGroupBtn = document.createElement("button");
leaveGroupBtn.id = "leave-group-btn";
leaveGroupBtn.className = "hidden btn btn-secondary";
leaveGroupBtn.style.cssText = "margin-left: 8px; background: #ef4444; color: #fff; border: none; padding: 4px 10px; font-size: 12px; border-radius: 6px; cursor: pointer;";
leaveGroupBtn.textContent = "🚪 Leave Group";
if (exitDmBtn && exitDmBtn.parentNode) {
    exitDmBtn.parentNode.insertBefore(leaveGroupBtn, exitDmBtn.nextSibling);
}

const groupsListSection = document.createElement("div");
groupsListSection.style.cssText = "margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);";
groupsListSection.innerHTML = `
    <h3 style="font-size: 14px; margin-bottom: 8px; color: var(--text-color);">Your Group Chats</h3>
    <div id="groups-list-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
`;
friendsSection?.appendChild(groupsListSection);
const groupsListContainer = document.getElementById("groups-list-container");

createGroupBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest") return;
    document.getElementById("group-name-input").value = "";
    document.getElementById("group-status-msg").textContent = "";
    
    const checkboxContainer = document.getElementById("group-friends-checkbox-container");
    checkboxContainer.innerHTML = "";

    const mySnap = await getDoc(doc(db, "users", currentUsername));
    if (mySnap.exists()) {
        const friends = mySnap.data().friends || [];
        if (friends.length === 0) {
            checkboxContainer.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">You need friends added first to form a group!</p>`;
        } else {
            friends.forEach(f => {
                const label = document.createElement("label");
                label.style.cssText = "display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--text-color);";
                label.innerHTML = `<input type="checkbox" value="${f}" class="group-friend-checkbox" /> @${sanitizeMessageHTML(f)}`;
                checkboxContainer.appendChild(label);
            });
        }
    }
    groupModalOverlay.classList.remove("hidden");
});

document.getElementById("cancel-group-btn")?.addEventListener("click", () => {
    groupModalOverlay.classList.add("hidden");
});

let isCreatingGroup = false; // Prevent multi-click spam duplicate groups
document.getElementById("confirm-group-btn")?.addEventListener("click", async () => {
    if (isCreatingGroup) return;

    const groupNameInput = document.getElementById("group-name-input").value.trim();
    const statusMsg = document.getElementById("group-status-msg");
    if (!groupNameInput) {
        statusMsg.textContent = "Please enter a group name.";
        return;
    }

    const checkedFriends = Array.from(document.querySelectorAll(".group-friend-checkbox:checked")).map(cb => cb.value);
    if (checkedFriends.length === 0) {
        statusMsg.textContent = "Select at least one friend.";
        return;
    }

    const members = [currentUsername, ...checkedFriends];
    statusMsg.textContent = "Creating group instantly...";
    isCreatingGroup = true;

    try {
        const docRef = await addDoc(collection(db, "groups"), {
            name: groupNameInput,
            creator: currentUsername,
            members: members,
            createdAt: serverTimestamp()
        });
        
        statusMsg.style.color = "var(--success, #22c55e)";
        statusMsg.textContent = "Group created!";
        
        setTimeout(() => {
            groupModalOverlay.classList.add("hidden");
            isCreatingGroup = false;
            loadFriendsAndGroupsLists();
            openGroupChat(docRef.id, { name: groupNameInput, creator: currentUsername, members });
        }, 300);
    } catch (err) {
        isCreatingGroup = false;
        statusMsg.style.color = "#ef4444";
        statusMsg.textContent = "Error: " + err.message;
    }
});

async function loadFriendsAndGroupsLists() {
    if (currentUsername === "Guest") return;
    if (groupsListContainer) groupsListContainer.innerHTML = "";

    try {
        const groupsSnap = await getDocs(collection(db, "groups"));
        let count = 0;
        groupsSnap.forEach(gDoc => {
            const gData = gDoc.data();
            const members = gData.members || [];
            if (members.includes(currentUsername)) {
                count++;
                const row = document.createElement("div");
                row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;";
                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">👥</span>
                        <span style="font-weight: 600; color: var(--text-color);">${sanitizeMessageHTML(gData.name)}</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">${members.length} members</span>
                `;
                row.addEventListener("click", () => openGroupChat(gDoc.id, gData));
                groupsListContainer.appendChild(row);
            }
        });

        if (count === 0 && groupsListContainer) {
            groupsListContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No group chats yet.</p>`;
        }
    } catch (e) {}
}

function openGroupChat(groupId, groupData) {
    currentChatRoom = `group_${groupId}`;
    currentGroupData = groupData;
    chatRoomTitle.textContent = `Group: ${groupData.name}`;
    exitDmBtn.classList.remove("hidden");
    exitDmBtn.style.display = "inline-block";
    leaveGroupBtn.classList.remove("hidden");
    leaveGroupBtn.style.display = "inline-block";

    if (photoBtn) {
        photoBtn.classList.remove("hidden");
        photoBtn.style.display = "inline-block";
    }

    friendsSection.classList.add("hidden");
    globalChatSection.classList.remove("hidden");
    loadMessagesFeed();
}

leaveGroupBtn?.addEventListener("click", async () => {
    if (!currentChatRoom.startsWith("group_")) return;
    const groupId = currentChatRoom.replace("group_", "");
    
    if (!confirm("Are you sure you want to leave this group chat?")) return;

    try {
        const groupRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
            const data = groupSnap.data();
            const updatedMembers = (data.members || []).filter(m => m !== currentUsername);
            
            if (updatedMembers.length === 0) {
                await deleteDoc(groupRef);
            } else {
                let newCreator = data.creator;
                if (data.creator === currentUsername) {
                    newCreator = updatedMembers[0];
                }
                await updateDoc(groupRef, {
                    members: updatedMembers,
                    creator: newCreator
                });
            }
        }
    } catch (e) {}

    currentChatRoom = "global";
    currentGroupData = null;
    chatRoomTitle.textContent = "global chat";
    exitDmBtn.classList.add("hidden");
    exitDmBtn.style.display = "none";
    leaveGroupBtn.classList.add("hidden");
    leaveGroupBtn.style.display = "none";
    if (photoBtn) {
        photoBtn.classList.add("hidden");
        photoBtn.style.display = "none";
    }
    loadMessagesFeed();
});

exitDmBtn?.addEventListener("click", () => {
    leaveGroupBtn.classList.add("hidden");
    leaveGroupBtn.style.display = "none";
});
// -----------------------------------------------------------------------------