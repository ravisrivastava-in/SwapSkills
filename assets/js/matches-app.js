/**
 * SwapSkills — matches-app.js
 * Matches page: find, send, accept/reject, schedule, rate
 */

async function waitForSS() {
  if (window.SS) return;
  await new Promise(r => { const i = setInterval(() => { if (window.SS) { clearInterval(i); r(); } }, 40); });
}

export async function init() {
  await waitForSS();

  const {
    observeAuth, logoutUser, findMatches, createMatchRequest,
    updateMatchStatus, listenToMatches, getUserProfile,
    searchUsersBySkill, scheduleSession, submitRating
  } = SS;

  let currentUid = null;
  let profileCache = {};

  // Auth guard
  observeAuth(async (user) => {
    if (!user) { window.location.href = "auth.html"; return; }
    currentUid = user.uid;

    listenToMatches(currentUid, async (matches) => {
      await renderExistingMatches(matches);
    });

    document.getElementById("page-loader").classList.add("d-none");
    document.getElementById("page-content").classList.remove("d-none");
    if (typeof AOS !== "undefined") AOS.init({ duration: 600, easing: "ease-in-out", once: true });
  });

  // Auto-find matches
  document.getElementById("find-matches-btn").addEventListener("click", async () => {
    const btn = document.getElementById("find-matches-btn");
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Searching…';
    const matches = await findMatches(currentUid);
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-magic me-1"></i>Auto-Find Matches';
    renderPotentialMatches(matches);
  });

  // Search by skill
  document.getElementById("search-btn").addEventListener("click", async () => {
    const q = document.getElementById("search-skill").value.trim();
    if (!q) return;
    const users = await searchUsersBySkill(q);
    const filtered = users.filter(u => u.uid !== currentUid);
    document.getElementById("results-title").textContent = `Search Results for "${q}"`;
    renderSearchResults(filtered);
  });
  document.getElementById("search-skill").addEventListener("keypress", e => { if (e.key === "Enter") document.getElementById("search-btn").click(); });

  /* ────── Render potential matches ────── */
  function renderPotentialMatches(matches) {
    const el = document.getElementById("potential-matches");
    document.getElementById("results-title").textContent = "Potential Matches";
    if (!matches.length) {
      el.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-emoji-frown"></i><h5>No matches found</h5><p>Try adding more skills to increase your chances.</p></div></div>';
      return;
    }
    el.innerHTML = matches.map(m => `
      <div class="col-lg-6 col-md-12">
        <div class="match-card d-flex gap-3 align-items-start">
          <div class="match-avatar">${(m.displayName||"?")[0].toUpperCase()}</div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="mb-0 fw-bold">${m.displayName}</h6>
              <span class="match-score">${m.score} match${m.score>1?"es":""}</span>
            </div>
            <p class="small text-muted mb-1">${m.bio || "No bio"}</p>
            <div class="small mb-1"><span class="text-accent fw-semibold">You teach them:</span> ${m.iTeach.join(", ")}</div>
            <div class="small mb-2"><span class="text-warning fw-semibold">They teach you:</span> ${m.theyTeach.join(", ")}</div>
            ${m.averageRating > 0 ? '<div class="small mb-2">' + renderStars(m.averageRating) + ' <span class="text-muted">(' + m.averageRating + '/5)</span></div>' : ""}
            <button class="btn btn-accent btn-sm send-match-btn" data-uid="${m.userId}" data-iteach='${JSON.stringify(m.iTeach)}' data-theyteach='${JSON.stringify(m.theyTeach)}'>
              <i class="bi bi-send me-1"></i>Send Match Request
            </button>
          </div>
        </div>
      </div>
    `).join("");

    el.querySelectorAll(".send-match-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const toUid     = btn.dataset.uid;
        const iTeach    = JSON.parse(btn.dataset.iteach);
        const theyTeach = JSON.parse(btn.dataset.theyteach);
        btn.disabled = true; btn.textContent = "Sending…";
        const res = await createMatchRequest(currentUid, toUid, { iTeach, theyTeach });
        if (!res) { btn.textContent = "✓ Sent!"; btn.classList.replace("btn-accent","btn-success"); }
        else { btn.textContent = res; btn.disabled = false; }
      });
    });
  }

  /* ────── Render search results ────── */
  function renderSearchResults(users) {
    const el = document.getElementById("potential-matches");
    if (!users.length) { el.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-search"></i><h5>No users found</h5></div></div>'; return; }
    el.innerHTML = users.map(u => `
      <div class="col-lg-6"><div class="match-card d-flex gap-3 align-items-start">
        <div class="match-avatar">${(u.displayName||"?")[0].toUpperCase()}</div>
        <div class="flex-grow-1">
          <h6 class="mb-0 fw-bold">${u.displayName}</h6>
          <p class="small text-muted mb-1">${u.bio||"No bio"}</p>
          <div class="small mb-1"><strong>Offers:</strong> ${(u.skillsOffered||[]).map(s=>s.name).join(", ")||"None"}</div>
          <div class="small"><strong>Wants:</strong> ${(u.skillsWanted||[]).map(s=>s.name).join(", ")||"None"}</div>
        </div>
      </div></div>
    `).join("");
  }

  /* ────── Render existing matches by status ────── */
  async function renderExistingMatches(matches) {
    const pending  = matches.filter(m => m.status === "pending");
    const accepted = matches.filter(m => m.status === "accepted");
    const rejected = matches.filter(m => m.status === "rejected");

    document.getElementById("badge-pending").textContent  = pending.length;
    document.getElementById("badge-accepted").textContent = accepted.length;
    document.getElementById("badge-rejected").textContent = rejected.length;

    for (const m of matches) {
      for (const uid of m.users) {
        if (!profileCache[uid]) profileCache[uid] = await getUserProfile(uid);
      }
    }

    renderMatchList("list-pending",  pending,  true);
    renderMatchList("list-accepted", accepted, false);
    renderMatchList("list-rejected", rejected, false);
  }

  function renderMatchList(containerId, matches, showActions) {
    const el = document.getElementById(containerId);
    if (!matches.length) { el.innerHTML = '<div class="col-12 text-muted text-center py-3">No matches here.</div>'; return; }

    el.innerHTML = matches.map(m => {
      const otherUid   = m.users.find(u => u !== currentUid);
      const other      = profileCache[otherUid] || {};
      const myTeach    = m.skillsExchange?.[currentUid] || [];
      const theirTeach = m.skillsExchange?.[otherUid] || [];
      const iAmReceiver = m.receiver === currentUid;
      const sessions   = m.sessions || [];

      let actionBtns = "";
      if (showActions && iAmReceiver) {
        actionBtns = `<button class="btn btn-success btn-sm accept-btn" data-mid="${m.matchId}"><i class="bi bi-check-lg me-1"></i>Accept</button> <button class="btn btn-danger btn-sm reject-btn" data-mid="${m.matchId}"><i class="bi bi-x-lg me-1"></i>Reject</button>`;
      } else if (showActions && !iAmReceiver) {
        actionBtns = '<span class="badge bg-secondary">Waiting for response</span>';
      }

      let extraBtns = "";
      if (m.status === "accepted") {
        extraBtns = `<button class="btn btn-outline-accent btn-sm schedule-btn" data-mid="${m.matchId}"><i class="bi bi-calendar-plus me-1"></i>Schedule</button> <button class="btn btn-outline-warning btn-sm rate-btn" data-mid="${m.matchId}" data-tuid="${otherUid}"><i class="bi bi-star me-1"></i>Rate</button> <a href="chat.html?match=${m.matchId}" class="btn btn-accent btn-sm"><i class="bi bi-chat me-1"></i>Chat</a>`;
      }

      return `<div class="col-lg-6"><div class="match-card"><div class="d-flex gap-3 align-items-start"><div class="match-avatar">${(other.displayName||"?")[0].toUpperCase()}</div><div class="flex-grow-1"><h6 class="fw-bold mb-1">${other.displayName || "User"}</h6><div class="small mb-1"><span class="text-accent fw-semibold">You teach:</span> ${myTeach.join(", ")||"N/A"}</div><div class="small mb-2"><span class="text-warning fw-semibold">You learn:</span> ${theirTeach.join(", ")||"N/A"}</div><div class="d-flex flex-wrap gap-2">${actionBtns} ${extraBtns}</div>${sessions.length ? '<div class="mt-2"><small class="fw-bold text-muted">Sessions (' + sessions.length + '):</small>' + sessions.map(s => '<div class="session-card mt-1"><small>' + (s.topic||"Session") + ' · ' + new Date(s.dateTime).toLocaleString() + ' · ' + s.duration + 'min <span class="session-status text-' + (s.status==='completed'?'success':'info') + '">' + s.status + '</span></small></div>').join("") + '</div>' : ""}</div></div></div></div>`;
    }).join("");

    el.querySelectorAll(".accept-btn").forEach(b => b.addEventListener("click", async () => { b.disabled = true; await updateMatchStatus(b.dataset.mid, "accepted"); }));
    el.querySelectorAll(".reject-btn").forEach(b => b.addEventListener("click", async () => { if (!confirm("Reject this match?")) return; b.disabled = true; await updateMatchStatus(b.dataset.mid, "rejected"); }));
    el.querySelectorAll(".schedule-btn").forEach(b => b.addEventListener("click", () => { document.getElementById("session-match-id").value = b.dataset.mid; new bootstrap.Modal(document.getElementById("sessionModal")).show(); }));
    el.querySelectorAll(".rate-btn").forEach(b => b.addEventListener("click", () => { document.getElementById("rate-target-uid").value = b.dataset.tuid; document.getElementById("rate-match-id").value = b.dataset.mid; document.getElementById("rate-value").value = 0; document.querySelectorAll("#rating-stars .bi").forEach(s => s.className = "bi bi-star"); new bootstrap.Modal(document.getElementById("rateModal")).show(); }));
  }

  /* ────── Session scheduling ────── */
  document.getElementById("save-session-btn").addEventListener("click", async () => {
    const matchId  = document.getElementById("session-match-id").value;
    const dateTime = document.getElementById("session-datetime").value;
    const duration = parseInt(document.getElementById("session-duration").value) || 60;
    const topic    = document.getElementById("session-topic").value.trim();
    const notes    = document.getElementById("session-notes").value.trim();
    if (!dateTime) { alert("Please select a date & time."); return; }

    await scheduleSession(matchId, { scheduledBy: currentUid, dt: dateTime, dur: duration, topic, notes });
    bootstrap.Modal.getInstance(document.getElementById("sessionModal")).hide();
    alert("Session scheduled!");
  });

  /* ────── Rating stars ────── */
  document.querySelectorAll("#rating-stars .bi").forEach(star => {
    star.addEventListener("click", () => {
      const val = parseInt(star.dataset.val);
      document.getElementById("rate-value").value = val;
      document.querySelectorAll("#rating-stars .bi").forEach(s => { s.className = parseInt(s.dataset.val) <= val ? "bi bi-star-fill" : "bi bi-star"; });
    });
    star.addEventListener("mouseenter", () => {
      const val = parseInt(star.dataset.val);
      document.querySelectorAll("#rating-stars .bi").forEach(s => { s.className = parseInt(s.dataset.val) <= val ? "bi bi-star-fill" : "bi bi-star"; });
    });
  });
  document.getElementById("rating-stars").addEventListener("mouseleave", () => {
    const val = parseInt(document.getElementById("rate-value").value);
    document.querySelectorAll("#rating-stars .bi").forEach(s => { s.className = parseInt(s.dataset.val) <= val ? "bi bi-star-fill" : "bi bi-star"; });
  });

  document.getElementById("submit-rating-btn").addEventListener("click", async () => {
    const targetUid = document.getElementById("rate-target-uid").value;
    const matchId   = document.getElementById("rate-match-id").value;
    const rating    = parseInt(document.getElementById("rate-value").value);
    const feedback  = document.getElementById("rate-feedback").value.trim();
    if (!rating) { alert("Please select a rating."); return; }

    await submitRating(targetUid, currentUid, matchId, rating, feedback);
    bootstrap.Modal.getInstance(document.getElementById("rateModal")).hide();
    alert("Rating submitted! Thank you.");
  });

  /* ────── Helpers ────── */
  function renderStars(avg) {
    let html = "";
    for (let i = 1; i <= 5; i++) html += '<i class="bi bi-star' + (i <= Math.round(avg) ? '-fill' : '') + '" style="color:#ffc107"></i>';
    return html;
  }

  document.getElementById("logout-btn").addEventListener("click", async () => { await logoutUser(); window.location.href = "index.html"; });

  console.log("[SS] matches-app.js ready");
}