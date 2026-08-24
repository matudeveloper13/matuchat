/**
 * bot.js - Completely Standalone Bot Module (Testing Mode)
 * - Sends "hi! im a bot , and i said hi." on page load/update.
 * - Sends a message every 10 seconds for testing.
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

  // --- 1. ENHANCED MESSAGE DISPATCHER ---
  async function sendBotMessage(content, type = 'text') {
    const isImage = type === 'image';

    // A. Direct Database Write (If Firebase/DB instance is accessible)
    const db = window.db || window.firebaseDb || (window.firebase && window.firebase.firestore && window.firebase.firestore());
    const addDoc = window.addDoc || (window.Firebase && window.Firebase.addDoc);
    const collection = window.collection || (window.Firebase && window.Firebase.collection);

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
        console.warn("Database write skipped, attempting UI dispatch...", err);
      }
    }

    // B. Direct UI Dispatcher (Simulates actual input & submit events)
    const chatInput = document.querySelector(
      "input[placeholder*='message' i], textarea[placeholder*='message' i], #message-input, .message-input, input[type='text']"
    );
    const sendBtn = document.querySelector(
      "#send-btn, button.send, .send-button, button[type='submit'], .msg-send-btn"
    ) || (chatInput && chatInput.closest("form")?.querySelector("button"));

    if (chatInput) {
      // Trigger native property setter so React/Vue/vanilla event listeners pick it up
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, "value"
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(chatInput, content);
      } else {
        chatInput.value = content;
      }

      chatInput.dispatchEvent(new Event("input", { bubbles: true }));
      chatInput.dispatchEvent(new Event("change", { bubbles: true }));

      if (sendBtn) {
        sendBtn.click();
      } else {
        // Fallback to Enter key event
        chatInput.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
      }
    }
  }

  // --- 2. SECURITY: BLOCK IMPERSONATORS ('bot') ---
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

  // --- 3. PROFILE MODAL INTERCEPTOR ---
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

        // Hide friend request & block buttons for the bot profile
        actionBtns.forEach((btn) => btn.style.setProperty("display", "none", "important"));
      }, 50);
    } else {
      // Restore action buttons for regular users
      const actionBtns = document.querySelectorAll("#profile-friend-action-btn, .friend-req-btn, .block-user-btn, button[id*='friend'], button[id*='block'], button[class*='friend'], button[class*='block']");
      actionBtns.forEach((btn) => btn.style.removeProperty("display"));
    }
  }, true);

  // --- 4. RENDER BOT BADGE & AVATAR IN CHAT BUBBLES ---
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

  // --- 5. AUTOMATION SCHEDULE ---
  // Immediate message on page reload/update
  setTimeout(() => {
    sendBotMessage("hi! im a bot , and i said hi.", 'text');
  }, 1000);

  // TEST TIMER: Sends a random message every 10 seconds (10,000 ms)
  setInterval(() => {
    const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
    sendBotMessage(randomMsg.content, randomMsg.type);
  }, 10000);
})();