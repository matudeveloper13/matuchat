/* --- STANDALONE BOT SYSTEM --- */
(function () {
  const BOT_USERNAME = "bot";
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

  // 1. Block registration/name change to 'bot'
  document.addEventListener("submit", function (e) {
    const input = e.target.querySelector("input[type='text'], input[id*='user'], input[name*='user']");
    if (input && input.value.trim().toLowerCase() === BOT_USERNAME) {
      e.preventDefault();
      e.stopPropagation();
      alert("Error: The username 'bot' is reserved by the system.");
    }
  }, true);

  // 2. Intercept profile clicks for 'bot' (Sets bio to 'beep boop.' & hides action buttons)
  document.addEventListener("click", function (e) {
    const authorEl = e.target.closest(".msg-author, .msg-avatar-img, [data-username]");
    if (!authorEl) return;

    const rawName = authorEl.dataset.username || authorEl.textContent.trim();
    const cleanName = rawName.split(" ")[0].toLowerCase();

    if (cleanName === BOT_USERNAME) {
      setTimeout(() => {
        const modalAvatar = document.querySelector("#view-user-avatar, .profile-avatar, #profile-img");
        const modalName = document.querySelector("#view-user-name, .profile-username, #profile-name");
        const modalBio = document.querySelector("#view-user-bio, .profile-bio, #profile-bio");
        const actionBtns = document.querySelectorAll("#profile-friend-action-btn, .friend-req-btn, .block-user-btn, button[id*='friend'], button[id*='block']");

        if (modalAvatar) modalAvatar.src = BOT_AVATAR;
        if (modalName) modalName.textContent = BOT_USERNAME;
        if (modalBio) modalBio.textContent = BOT_BIO;
        
        actionBtns.forEach(btn => btn.style.display = "none");
      }, 50);
    } else {
      const actionBtns = document.querySelectorAll("#profile-friend-action-btn, .friend-req-btn, .block-user-btn, button[id*='friend'], button[id*='block']");
      actionBtns.forEach(btn => btn.style.display = "");
    }
  }, true);

  // 3. Automatically inject bot badge icon and bot avatar in chat messages
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const authorEls = node.querySelectorAll ? node.querySelectorAll(".msg-author") : [];
          authorEls.forEach((authorEl) => {
            if (authorEl.textContent.trim().toLowerCase().startsWith(BOT_USERNAME)) {
              const msgContainer = authorEl.closest(".msg, .message-row");
              if (msgContainer) {
                const avatarImg = msgContainer.querySelector(".msg-avatar-img, img");
                if (avatarImg) avatarImg.src = BOT_AVATAR;
              }
              if (!authorEl.querySelector(".bot-badge-icon")) {
                const badge = document.createElement("img");
                badge.src = BOT_BADGE;
                badge.className = "bot-badge-icon";
                badge.style.cssText = "width: 14px; height: 14px; margin-left: 4px; vertical-align: middle; display: inline-block;";
                authorEl.appendChild(badge);
              }
            }
          });
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 4. Send messages to database or directly through chat input interface
  async function dispatchBotMessage(content, type = 'text') {
    const isImage = type === 'image';
    
    // Attempt writing directly to global database window variables
    const db = window.db || window.firebaseDb;
    const addDoc = window.addDoc || (window.Firebase && window.Firebase.addDoc);
    const collection = window.collection || (window.Firebase && window.Firebase.collection);

    if (db && addDoc && collection) {
      try {
        await addDoc(collection(db, "messages"), {
          username: BOT_USERNAME,
          sender: BOT_USERNAME,
          text: isImage ? "" : content,
          message: isImage ? "" : content,
          imageUrl: isImage ? content : null,
          image: isImage ? content : null,
          room: "global",
          timestamp: new Date()
        });
        return;
      } catch (err) {
        console.error("Database write error:", err);
      }
    }

    // Fallback trigger if database handles are internal
    const chatInput = document.querySelector("input[placeholder*='message'], textarea, #message-input");
    const sendBtn = document.querySelector("#send-btn, button[type='submit'], .send-button");
    
    if (chatInput && sendBtn) {
      const originalValue = chatInput.value;
      chatInput.value = content;
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      sendBtn.click();
      chatInput.value = originalValue;
    }
  }

  // Startup message sent immediately upon page load
  setTimeout(() => {
    dispatchBotMessage("hi! im a bot , and i said hi.", 'text');
  }, 1500);

  // 4-Hour interval loop (14,400,000 milliseconds)
  setInterval(() => {
    const randomMsg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
    dispatchBotMessage(randomMsg.content, randomMsg.type);
  }, 14400000);
})();