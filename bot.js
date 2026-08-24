/**
 * bot.js
 * Handles bot security, automated scheduling, and universal database messaging.
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
export function checkAndRenderBotProfile(profileUsername, profileElements) {
  if (profileUsername.toLowerCase() === BOT_USERNAME) {
    if (profileElements.avatar) profileElements.avatar.src = BOT_AVATAR;
    if (profileElements.name) profileElements.name.textContent = BOT_USERNAME;
    if (profileElements.bio) profileElements.bio.textContent = BOT_BIO;
    
    // Hide the friend request / block action buttons for the bot
    if (profileElements.actionBtn) {
      profileElements.actionBtn.classList.add('hidden');
    }
    return true; 
  }
  return false; 
}


// --- 3. START THE 4-HOUR BOT SCHEDULE & DATABASE SENDER ---
export function startBotAutomations(db, collection, addDoc, serverTimestamp) {
  
  // Sends the message to Firestore using multiple common field naming conventions
  // so it matches whatever your global chat listener expects.
  const sendRealBotMessage = async (content, type = 'text') => {
    try {
      const isImage = type === 'image';
      
      await addDoc(collection(db, "messages"), {
        // Username variants
        username: BOT_USERNAME,
        sender: BOT_USERNAME,
        name: BOT_USERNAME,
        
        // Text/Message variants
        text: isImage ? "" : content,
        message: isImage ? "" : content,
        content: isImage ? "" : content,
        
        // Image variants
        imageUrl: isImage ? content : null,
        image: isImage ? content : null,
        fileUrl: isImage ? content : null,
        
        // Room configuration for global chat
        room: "global",
        channel: "global",
        
        // Timestamp variants
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      console.log("Bot message sent successfully to global chat!");
    } catch (error) {
      console.error("Bot failed to send database message:", error);
    }
  };

  // --- IMMEDIATE STARTUP MESSAGE ---
  // Sends "hi! im a bot , and i said hi." the exact second the app loads
  sendRealBotMessage("hi! im a bot , and i said hi.", 'text');

  // --- 4-HOUR TIMER (14,400,000 milliseconds) ---
  setInterval(() => {
    const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
    sendRealBotMessage(randomMsg.content, randomMsg.type);
  }, 14400000); 
}