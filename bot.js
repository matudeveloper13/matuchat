/**
 * bot.js
 * Handles all bot rendering, automated messages, and security rules.
 */

// --- 1. BOT SETTINGS & ASSETS ---
const BOT_USERNAME = "bot";
const BOT_AVATAR = "botpfp.png";
const BOT_BADGE = "bot.png";

// The exact message pool
const BOT_MESSAGES = [
  { type: 'text', content: "What's going on everybody?" },
  { type: 'text', content: "Dry out here :(" },
  { type: 'text', content: "No it does not work on Linux :(" },
  { type: 'text', content: "Is it raining outside ? idk im a bot." },
  { type: 'text', content: "beep boop." },
  { type: 'image', content: "QR.png" }
];


// --- 2. SECURITY: BLOCK IMPERSONATORS ---
// Call this function when a user tries to register or change their name
export function isUsernameValid(requestedUsername) {
  if (requestedUsername.trim().toLowerCase() === BOT_USERNAME) {
    alert("Error: The username 'bot' is reserved by the system.");
    return false; // Stop the login/registration process
  }
  return true; // Allow them to proceed
}


// --- 3. RENDER MESSAGES TO CHAT ---
// Use this function to print messages to the screen. It automatically applies the bot badge and avatar if the user is "bot".
export function renderMessage(username, content, type = 'text', userAvatar = 'default-avatar.png') {
  const isBot = username.toLowerCase() === BOT_USERNAME;
  
  // Assign Profile Picture (Forces botpfp.png for the bot)
  const avatarSrc = isBot ? BOT_AVATAR : userAvatar;
  
  // Inject Custom Bot Badge (Scales down bot.png to 14px next to the name)
  const badgeHTML = isBot 
    ? `<img src="${BOT_BADGE}" alt="Bot Badge" style="width: 14px; height: 14px; margin-left: 6px; vertical-align: -2px; pointer-events: none;">` 
    : "";

  // Format the message body depending on if it's text or an image
  let messageBody = "";
  if (type === 'image') {
    messageBody = `<img src="${content}" style="max-width: 200px; border-radius: 8px; margin-top: 5px;">`;
  } else {
    messageBody = content;
  }

  // Use your exact CSS classes to build the HTML bubble
  const html = `
    <div class="msg ${isBot ? 'received' : 'sent'}">
      <img src="${avatarSrc}" class="msg-avatar-img" alt="Avatar">
      <div class="msg-content">
        <div class="msg-header">
          <span class="msg-author">${username} ${badgeHTML}</span>
        </div>
        <div class="msg-bubble">
          ${messageBody}
        </div>
      </div>
    </div>
  `;

  // Append it to your HTML container
  const chatBox = document.querySelector('.messages-box');
  if (chatBox) {
    chatBox.insertAdjacentHTML('beforeend', html);
    // Smooth scroll to the bottom instantly
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}


// --- 4. START THE 4-HOUR BOT SCHEDULE ---
export function startBotAutomations(saveToDatabaseCallback = null) {
  
  // Helper to trigger a message
  const triggerBotMessage = (msgObj) => {
    // 1. Render it visually on the screen
    renderMessage(BOT_USERNAME, msgObj.content, msgObj.type);
    
    // 2. If you want it to save to a database, pass a callback when you start the bot
    if (typeof saveToDatabaseCallback === 'function') {
        saveToDatabaseCallback(msgObj);
    }
  };

  // --- IMMEDIATE STARTUP MESSAGE ---
  triggerBotMessage({ type: 'text', content: "hi! im a bot , and i said hi." });

  // --- 4-HOUR TIMER (14,400,000 milliseconds) ---
  setInterval(() => {
    // Pick one random message from the pool
    const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
    triggerBotMessage(randomMsg);
  }, 14400000); 
}