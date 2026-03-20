/**
 * SwapSkills — chat-app.js
 * Standalone chat page: sidebar, messages, send
 */

async function waitForSS() {
  if (window.SS) return;
  await new Promise(r => { const i = setInterval(() => { if (window.SS) { clearInterval(i); r(); } }, 40); });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

export async function init() {
  await waitForSS();

  const {
    observeAuth, logoutUser, listenToMatches, getUserProfile,
    sendMessage, listenToChat, stopListeningToChat
  } = SS;

  let currentUid   = null;
  let currentName   = "";
  let activeMatchId = null;
  let activeChatRef = null;
  let profileCache  = {};
  let _lastDateStr  = "";

  // Auth guard
  observeAuth(async (user) => {
    if (!user) { window.location.href = "auth.html"; return; }
    currentUid  = user.uid;
    currentName = user.displayName || "User";

    listenToMatches(currentUid, async (matches) => {
      const accepted = matches.filter(m => m.status === "accepted");
      await renderSidebar(accepted);

      const params = new URLSearchParams(window.location.search);
      const matchParam = params.get("match");
      if (matchParam && !activeMatchId) {
        const target = accepted.find(m => m.matchId === matchParam);
        if (target) openChat(target);
      }
    });

    document.getElementById("page-loader").classList.add("d-none");
    document.getElementById("chat-container").classList.remove("d-none");
  });

  /* ────── Sidebar ────── */
  async function renderSidebar(matches) {
    const el = document.getElementById("chat-contact-list");
    if (!matches.length) {
      el.innerHTML = '<div class="text-center text-muted py-4 small">No accepted matches yet.<br><a href="matches.html">Find matches first!</a></div>';
      return;
    }

    for (const m of matches) {
      for (const uid of m.users) {
        if (!profileCache[uid]) profileCache[uid] = await getUserProfile(uid);
      }
    }

    el.innerHTML = matches.map(m => {
      const otherUid   = m.users.find(u => u !== currentUid);
      const other      = profileCache[otherUid] || {};
      const myTeach    = m.skillsExchange?.[currentUid] || [];
      const theirTeach = m.skillsExchange?.[otherUid]  || [];
      return '<div class="chat-contact ' + (activeMatchId===m.matchId?'active':'') + '" data-matchid="' + m.matchId + '">' +
        '<div class="d-flex align-items-center gap-2">' +
          '<div class="match-avatar" style="width:38px;height:38px;font-size:.9rem;flex-shrink:0">' + (other.displayName||"?")[0].toUpperCase() + '</div>' +
          '<div class="overflow-hidden">' +
            '<div class="fw-bold text-truncate">' + (other.displayName || "User") + '</div>' +
            '<div class="small text-muted text-truncate">' + myTeach.join(", ") + ' ↔ ' + theirTeach.join(", ") + '</div>' +
          '</div>' +
        '</div></div>';
    }).join("");

    el.querySelectorAll(".chat-contact").forEach(c => {
      c.addEventListener("click", () => {
        const mid = c.dataset.matchid;
        const m   = matches.find(x => x.matchId === mid);
        if (m) openChat(m);
        el.querySelectorAll(".chat-contact").forEach(x => x.classList.remove("active"));
        c.classList.add("active");
      });
    });
  }

  /* ────── Open a chat room ────── */
  function openChat(match) {
    if (activeChatRef) stopListeningToChat(activeChatRef);

    activeMatchId = match.matchId;
    const otherUid   = match.users.find(u => u !== currentUid);
    const other      = profileCache[otherUid] || {};
    const myTeach    = match.skillsExchange?.[currentUid] || [];
    const theirTeach = match.skillsExchange?.[otherUid]  || [];

    document.getElementById("chat-partner-name").textContent   = other.displayName || "User";
    document.getElementById("chat-partner-skills").textContent = "You teach: " + myTeach.join(", ") + " · You learn: " + theirTeach.join(", ");
    const avatarEl = document.getElementById("chat-avatar");
    avatarEl.textContent = (other.displayName||"?")[0].toUpperCase();
    avatarEl.style.display = "flex";
    document.getElementById("view-match-link").classList.remove("d-none");

    const msgEl = document.getElementById("chat-messages");
    msgEl.innerHTML = "";
    _lastDateStr = "";

    document.getElementById("chat-input-area").classList.remove("d-none");

    activeChatRef = listenToChat(activeMatchId, (msg) => {
      appendMessage(msg);
    });
  }

  /* ────── Append a message bubble ────── */
  function appendMessage(msg) {
    const msgEl  = document.getElementById("chat-messages");
    const isMine = msg.senderId === currentUid;
    const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;

    if (msgDate) {
      const dateStr = msgDate.toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" });
      if (dateStr !== _lastDateStr) {
        _lastDateStr = dateStr;
        const sep = document.createElement("div");
        sep.className = "text-center my-3";
        sep.innerHTML = '<span style="background:var(--surface-color,#f0f0f0);padding:4px 16px;border-radius:50px;font-size:.75rem;color:#888;border:1px solid #e0e0e0">' + dateStr + '</span>';
        msgEl.appendChild(sep);
      }
    }

    const time = msgDate ? msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble " + (isMine ? "sent" : "received");
    bubble.innerHTML =
      (!isMine ? '<div class="small fw-bold mb-1" style="opacity:.8">' + escapeHtml(msg.senderName || "User") + '</div>' : "") +
      '<div>' + escapeHtml(msg.text) + '</div>' +
      '<span class="bubble-time">' + time + '</span>';
    msgEl.appendChild(bubble);
    msgEl.scrollTop = msgEl.scrollHeight;
  }

  /* ────── Send message ────── */
  document.getElementById("send-btn").addEventListener("click", doSend);
  document.getElementById("msg-input").addEventListener("keypress", e => { if (e.key === "Enter") doSend(); });

  function doSend() {
    const input = document.getElementById("msg-input");
    const text  = input.value.trim();
    if (!text || !activeMatchId) return;
    sendMessage(activeMatchId, currentUid, currentName, text);
    input.value = "";
    input.focus();
  }

  document.getElementById("logout-btn").addEventListener("click", async () => { await logoutUser(); window.location.href = "index.html"; });

  console.log("[SS] chat-app.js ready");
}