/**
 * bot.js
 * Handles bot security, real database messaging, and bot profile rules.
 */

const BOT_USERNAME = "bot";
const BOT_AVATAR = "botpfp.png";
const BOT_BADGE = "bot.png";
const BOT_BIO = "beep boop.";

// The exact message pool you requested
const BOT_MESSAGES = [
  { type: 'text', content: "What's going on everybody?" },
  { type: 'text', content: "Dry out here :(" },
  { type: 'text', content: "No it does not work on Linux :(" },
  { type: 'text', content: "Is it raining outside ? idk im a bot." },
  { type: 'text', content: "beep boop." },
  { type: 'image', content: "QR.png" }
];


// --- 1. SECURITY: BLOCK IMPERSONATORS ---
export function isUsernameValid(requestedUsername) {
  if (requestedUsername.trim().toLowerCase() === BOT_USERNAME) {
    alert("Error: The username 'bot' is reserved by the system.");
    return false; 
  }
  return true; 
}


// --- 2. BOT PROFILE HANDLING ---
// Call this when opening a profile modal. If it's the bot, it sets the bio and hides friend/block actions.
export function checkAndRenderBotProfile(profileUsername, profileElements) {
  if (profileUsername.toLowerCase() === BOT_USERNAME) {
    if (profileElements.avatar) profileElements.avatar.src = BOT_AVATAR;
    if (profileElements.name) profileElements.name.textContent = BOT_USERNAME;
    if (profileElements.bio) profileElements.bio.textContent = BOT_BIO;
    
    // Hide the friend request / block action buttons for the bot
    if (profileElements.actionBtn) {
      profileElements.actionBtn.classList.add('hidden');
    }
    return true; // Handled as bot profile
  }
  return false; // Regular user profile
}


// --- 3. RENDER MESSAGES LOCALLY (For UI Real-Time Display) ---
export function renderMessageUI(username, content, type = 'text', userAvatar = 'default-avatar.png') {
  const isBot = username.toLowerCase() === BOT_USERNAME;
  const avatarSrc = isBot ? BOT_AVATAR : userAvatar;
  
  const badgeHTML = isBot 
    ? `<img src="${BOT_BADGE}" alt="Bot Badge" style="width: 14px; height: 14px; margin-left: 6px; vertical-align: -2px; pointer-events: none;">` 
    : "";

  let messageBody = type === 'image' 
    ? `<img src="${content}" style="max-width: 200px; border-radius: 8px; margin-top: 5px;">` 
    : content;

  const html = `
    <div class="msg ${isBot ? 'received' : 'sent'}">
      <img src="${avatarSrc}" class="msg-avatar-img" alt="Avatar" data-username="${username}" style="cursor: pointer;">
      <div class="msg-content">
        <div class="msg-header">
          <span class="msg-author" data-username="${username}">${username} ${badgeHTML}</span>
        </div>
        <div class="msg-bubble">
          ${messageBody}
        </div>
      </div>
    </div>
  `;

  const chatBox = document.querySelector('.messages-box');
  if (chatBox) {
    chatBox.insertAdjacentHTML('beforeend', html);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}


// --- 4. START THE 4-HOUR BOT SCHEDULE & DATABASE SENDER ---
export function startBotAutomations(db, collection, addDoc, serverTimestamp) {
  
  // Helper to send actual messages into the database collection
  const sendRealBotMessage = async (content, type = 'text') => {
    try {
      await addDoc(collection(db, "messages"), {
        username: BOT_USERNAME,
        text: type === 'text' ? content : "",
        imageUrl: type === 'image' ? content : null,
        room: "global",
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Bot failed to send database message:", error);
    }
  };

  // --- IMMEDIATE STARTUP MESSAGE ---
  // Sends the first "hi!" message right into the database so it logs instantly
  sendRealBotMessage("hi! im a bot , and i said hi.", 'text');

  // --- 4-HOUR TIMER (14,400,000 milliseconds) ---
  setInterval(() => {
    const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
    sendRealBotMessage(randomMsg.content, randomMsg.type);
  }, 14400000); 
}