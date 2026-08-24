/**
 * bot.js - Completely Standalone Bot Module
 * Paste this ENTIRE code into your bot.js file.
 */
(function () {
  const BOT_NAME = "bot";
  const BOT_AVATAR = "botpfp.png";
  const BOT_BADGE = "bot.png";
  const BOT_BIO = "beep boop.";

  const BOT_MESSAGES = [
    { type: 'text', content: "What's going on everybody?" },
    { type: 'text', content: "Dry out here :(" },
    { type: 'text', content: "No it does not work on Linux :(" },
    { type: 'text', content: "Is it raining outside ? idk im a bot." },
    { type: 'text', content: "beep boop." },
    { type: 'image', content: "QR.png" }
  ];

  // --- 1. SEND REAL MESSAGES TO GLOBAL CHAT ---
  async function sendBotMessage(content, type = 'text') {
    const isImage = type === 'image';
    const db = window.db || window.firebaseDb;
    const addDoc = window.addDoc || (window.Firebase && window.Firebase.addDoc);
    const collection = window.collection || (window.Firebase && window.Firebase.collection);

    // Write directly to database if global database references exist
    if (db && addDoc && collection) {
      try {
        await addDoc(collection(db, "messages"), {
          username: BOT_NAME,
          sender: BOT_NAME,
          name: BOT_NAME,
          text: isImage ? "" : content,
          message: isImage ? "" : content,
          imageUrl: isImage ? content : null,
          image: isImage ? content : null,
          room: "global",
          channel: "global",
          timestamp: new Date()
        });
        return;
      } catch (err) {
        console.error("Bot DB Write Error:", err);
      }
    }

    // UI Fallback: Send message by interacting directly with the DOM chat box
    const chatInput = document.querySelector(".messages-box ~ div input, input[placeholder*='message'], textarea, #message-input");
    const sendBtn = document.querySelector("#send-btn, button.send, .send-button, button[type='submit']");

    if (chatInput && sendBtn) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(chatInput, content);
      } else {
        chatInput.value = content;
      }
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      sendBtn.click();
    }
  }

  // --- 2. SECURITY: BLOCK REGISTRATION/NAME CHANGE TO 'BOT' ---
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

  // --- 3. PROFILE MODAL INTERCEPTOR (BIO & HIDDEN ACTION BUTTONS) ---
  document.addEventListener("click", (e) => {
    const authorEl = e.target.closest(".msg-author, .msg-avatar-img, [data-username]");
    if (!authorEl) return;

    const clickedName = (authorEl.dataset.username || authorEl.textContent.trim()).split(" ")[0].toLowerCase();

    if (clickedName === BOT_NAME) {
      setTimeout(() => {
        const avatarEl = document.querySelector("#view-user-avatar, .profile-avatar, #profile-img, .user-profile-img");
        const nameEl = document.querySelector("#view-user-name, .profile-username, #profile-name, .user-profile-name");
        const bioEl = document.querySelector("#view-user-bio, .profile-bio, #profile-bio, .user-profile-bio");
        const actionBtns = document.querySelectorAll("#profile-friend-action-btn, .friend-req-btn, .block-user-btn, button[id*='friend'], button[id*='block'], button[class*='friend'], button[class*='block']");

        if (avatarEl) avatarEl.src = BOT_AVATAR;
        if (nameEl) nameEl.textContent = BOT_NAME;
        if (bioEl) bioEl.textContent = BOT_BIO;

        // Hide friend request & block buttons for the bot
        actionBtns.forEach((btn) => btn.style.setProperty("display", "none", "important"));
      }, 50);
    } else {
      // Restore action buttons for regular users
      const actionBtns = document.querySelectorAll("#profile-friend-action-btn, .friend-req-btn, .block-user-btn, button[id*='friend'], button[id*='block'], button[class*='friend'], button[class*='block']");
      actionBtns.forEach((btn) => btn.style.removeProperty("display"));
    }
  }, true);

  // --- 4. RENDER BOT BADGE & AVATAR IN MESSAGES ---
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const authorEls = node.classList && node.classList.contains("msg-author") ? [node] : node.querySelectorAll(".msg-author");
          authorEls.forEach((authorEl) => {
            const name = authorEl.textContent.trim().split(" ")[0].toLowerCase();
            if (name === BOT_NAME) {
              const msgRow = authorEl.closest(".msg");
              if (msgRow) {
                const img = msgRow.querySelector(".msg-avatar-img");
                if (img) img.src = BOT_AVATAR;
              }

              if (!authorEl.querySelector(".bot-badge-icon")) {
                const badge = document.createElement("img");
                badge.src = BOT_BADGE;
                badge.className = "bot-badge-icon";
                badge.style.cssText = "width: 14px; height: 14px; margin-left: 5px; vertical-align: middle; display: inline-block; pointer-events: none;";
                authorEl.appendChild(badge);
              }
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // --- 5. AUTOMATED SCHEDULE ---
  // Send first message immediately
  setTimeout(() => {
    sendBotMessage("hi! im a bot , and i said hi.", 'text');
  }, 1500);

  // 4-Hour interval loop (14,400,000 ms)
  setInterval(() => {
    const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
    sendBotMessage(randomMsg.content, randomMsg.type);
  }, 14400000);
})();