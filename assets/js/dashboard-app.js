/**
 * ============================================================
 * SwapSkills — dashboard-app.js (v2 — fixes applied)
 * ============================================================
 * Fixes:
 * 1. Logout/Home button now properly interactive
 * 2. Chat pill shows unread count (1, 2, 9+)
 * 3. Matches pill shows total match count
 * 4. All matches displayed in "All Matches Overview" section
 * ============================================================
 */

const $ = id => document.getElementById(id);
const esc = s => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };

let UID = null, UNAME = "", PC = {}, skD = { offered: [], wanted: [] };
let aMid = null, aCRef = null, setupModal = null;

/* ── Wait for SS ── */
async function waitForSS() {
  if (window.SS) return;
  await new Promise(r => { const i = setInterval(() => { if (window.SS) { clearInterval(i); r(); } }, 30); });
}

/* ── Init ── */
export async function init() {
  await waitForSS();
  const {
    auth, observeAuth, logoutUser, getUserProfile, updateUserProfile,
    addSkill, removeSkill, getUserSkills, findMatches, createMatchRequest,
    updateMatchStatus, listenToMatches, sendMessage, listenToChat,
    stopListeningToChat, scheduleSession, submitRating, searchUsersBySkill,
    isProfileIncomplete, CATS, toggleDarkMode, signOut,
    initChatNotifications, setActiveChatForNotif
  } = SS;

  // ── Logout button — attach handler immediately and robustly ──
  const logoutBtn = $("logout-btn");
  if (logoutBtn) {
    // Remove any potential inline handlers and add fresh one
    logoutBtn.onclick = null;
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await logoutUser();
      location.href = "index.html";
    });
  }

  // ── Home link ──
  const homeLink = $("home-link") || document.querySelector('#navmenu a[href="index.html"]');
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      location.href = "index.html";
    });
  }

  // ── Auto-logout alert ──
  if (sessionStorage.getItem("ss-auto-logout") === "true") {
    $("auto-logout-alert")?.classList.remove("d-none");
    sessionStorage.removeItem("ss-auto-logout");
  }

  // ── Category dropdowns ──
  ["sk-cat", "su-oc", "su-wc"].forEach(id => {
    const s = $(id); if (!s) return;
    CATS.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; s.appendChild(o); });
  });

  // ── Dark mode FAB ──
  $("dark-fab").onclick = toggleDarkMode;

  // ── Auth guard ──
  $("loader-msg").textContent = "Checking auth…";

  observeAuth(async user => {
    if (!user) { location.href = "auth.html"; return; }
    UID = user.uid;
    UNAME = user.displayName || user.email || "User";
    $("loader-msg").textContent = "Loading profile…";

    let p = await getUserProfile(UID);
    if (!p) {
      await updateUserProfile(UID, { uid: UID, displayName: UNAME, email: user.email || "", bio: "", skillsOffered: [], skillsWanted: [], averageRating: 0 });
      p = await getUserProfile(UID);
    }

    // First-time setup
    if (isProfileIncomplete(p)) {
      $("su-name").value = p.displayName || UNAME;
      setupModal = new bootstrap.Modal($("setupModal"));
      setupModal.show();
    }

    fillDash(p, user);
    await loadSkills();

    // Matches listener
    listenToMatches(UID, async matches => {
      const acc = matches.filter(m => m.status === "accepted");
      const pen = matches.filter(m => m.status === "pending");
      $("s-mat").textContent = acc.length;

      // Update matches pill badge (show total pending + accepted)
      const matchBadge = $("match-notif-badge");
      const totalMatches = matches.length;
      if (totalMatches > 0) {
        matchBadge.textContent = totalMatches > 9 ? "9+" : totalMatches;
        matchBadge.classList.remove("d-none");
      } else {
        matchBadge.classList.add("d-none");
      }

      fillRecent(matches.slice(0, 5));
      await fillExisting(matches);
      fillAllMatches(matches);
      fillChatSb(acc);

      // Init chat notifications for unread badges
      initChatNotifications(UID, acc, (total, perMatch) => {
        const badge = $("chat-notif-badge");
        if (total > 0) {
          badge.textContent = total > 9 ? "9+" : total;
          badge.classList.remove("d-none");
        } else {
          badge.classList.add("d-none");
        }
        // Per-contact badges in sidebar
        document.querySelectorAll(".ch-c").forEach(el => {
          const mid = el.dataset.m;
          const cnt = perMatch[mid] || 0;
          const b = el.querySelector(".contact-badge");
          if (b) {
            if (cnt > 0) { b.textContent = cnt > 9 ? "9+" : cnt; b.classList.remove("d-none"); }
            else { b.classList.add("d-none"); }
          }
        });
      });
    });

    $("page-loader").classList.add("d-none");
    $("app").classList.remove("d-none");
  });

  /* ════════════════════════════════════════════
     DASHBOARD TAB
     ════════════════════════════════════════════ */
  function fillDash(p, u) {
    $("uname").textContent = p.displayName || u.displayName || "User";
    $("p-name").value = p.displayName || "";
    $("p-email").value = p.email || u.email || "";
    $("p-bio").value = p.bio || "";
    $("s-off").textContent = (p.skillsOffered || []).length;
    $("s-wan").textContent = (p.skillsWanted || []).length;
    $("s-rat").textContent = p.averageRating > 0 ? p.averageRating + "/5" : "—";
    rBadge("d-off", p.skillsOffered || [], false);
    rBadge("d-wan", p.skillsWanted || [], true);
  }

  $("save-bio").onclick = async () => {
    const r = await updateUserProfile(UID, { bio: $("p-bio").value.trim() });
    flash("bio-msg", r.success ? "Saved!" : "Error: " + r.error, r.success ? "success" : "danger");
  };

  // Setup modal
  $("su-save").onclick = async () => {
    const n = $("su-name").value.trim();
    if (!n) { flash("su-msg", "Enter name", "danger"); return; }
    await updateUserProfile(UID, { displayName: n, bio: $("su-bio").value.trim() });
    const on = $("su-on").value.trim();
    if (on) await addSkill(UID, { name: on, category: $("su-oc").value, level: $("su-ol").value }, "offered");
    const wn = $("su-wn").value.trim();
    if (wn) await addSkill(UID, { name: wn, category: $("su-wc").value, level: $("su-wl").value }, "wanted");
    const p2 = await getUserProfile(UID);
    if (p2) fillDash(p2, SS.auth.currentUser);
    await loadSkills();
    setupModal?.hide();
    flash("bio-msg", "Profile set up!", "success");
  };
  $("su-skip").onclick = () => setupModal?.hide();

  /* ════════════════════════════════════════════
     SKILLS TAB
     ════════════════════════════════════════════ */
  async function loadSkills() {
    skD = await getUserSkills(UID);
    rList("l-off", skD.offered, "offered", "c-off");
    rList("l-wan", skD.wanted, "wanted", "c-wan");
    rBadge("d-off", skD.offered, false);
    rBadge("d-wan", skD.wanted, true);
    $("s-off").textContent = skD.offered.length;
    $("s-wan").textContent = skD.wanted.length;
  }

  function rList(cid, arr, type, cntId) {
    const el = $(cid); $(cntId).textContent = arr.length;
    if (!arr.length) { el.innerHTML = '<div class="empty-state py-3"><p>None yet.</p></div>'; return; }
    el.innerHTML = '<div class="d-flex flex-wrap gap-2">' + arr.map(s =>
      `<span class="skill-badge ${type === 'wanted' ? 'wanted' : ''}">${esc(s.name)} <small>(${esc(s.category)}·${esc(s.level)})</small> <i class="bi bi-x-circle-fill rm-sk" data-id="${s.id}" data-t="${type}"></i></span>`
    ).join("") + '</div>';
    el.querySelectorAll(".rm-sk").forEach(b => b.onclick = async () => {
      const a = b.dataset.t === "offered" ? skD.offered : skD.wanted;
      const o = a.find(s => s.id === b.dataset.id);
      if (!o || !confirm(`Remove "${o.name}"?`)) return;
      await removeSkill(UID, o, b.dataset.t);
      await loadSkills();
    });
  }

  $("add-sk").onclick = async () => {
    const n = $("sk-name").value.trim();
    if (!n) { flash("sk-msg", "Enter skill name", "danger"); return; }
    await addSkill(UID, { name: n, category: $("sk-cat").value, level: $("sk-lvl").value, description: $("sk-desc").value.trim() }, document.querySelector('input[name="skT"]:checked').value);
    flash("sk-msg", `"${n}" added!`, "success");
    $("sk-name").value = ""; $("sk-desc").value = "";
    await loadSkills();
  };

  /* ════════════════════════════════════════════
     MATCHES TAB
     ════════════════════════════════════════════ */
  $("m-auto").onclick = async () => {
    const btn = $("m-auto"); btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Searching…';
    const m = await findMatches(UID);
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-magic me-1"></i>Auto-Find';
    $("m-title").textContent = "Potential Matches";
    const el = $("m-pot");
    if (!m.length) { el.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-emoji-frown"></i><h5>No matches</h5><p>Add more skills.</p></div></div>'; return; }
    el.innerHTML = m.map(x => `<div class="col-lg-6"><div class="match-card d-flex gap-3"><div class="match-avatar">${x.displayName[0].toUpperCase()}</div><div class="flex-grow-1"><div class="d-flex justify-content-between mb-1"><h6 class="mb-0 fw-bold">${esc(x.displayName)}</h6><span class="match-score">${x.score}</span></div><p class="small text-muted mb-1">${esc(x.bio)}</p><div class="small mb-1 text-accent fw-semibold">You teach: ${x.iTeach.join(", ")}</div><div class="small mb-2 text-warning fw-semibold">They teach: ${x.theyTeach.join(", ")}</div><button class="btn btn-accent btn-sm sm-btn" data-u="${x.userId}" data-i='${JSON.stringify(x.iTeach)}' data-t='${JSON.stringify(x.theyTeach)}'><i class="bi bi-send me-1"></i>Send</button></div></div></div>`).join("");
    el.querySelectorAll(".sm-btn").forEach(b => b.onclick = async () => {
      b.disabled = true; b.textContent = "…";
      const e = await createMatchRequest(UID, b.dataset.u, { iTeach: JSON.parse(b.dataset.i), theyTeach: JSON.parse(b.dataset.t) });
      b.textContent = e || "✓ Sent!";
      if (!e) b.classList.replace("btn-accent", "btn-success");
    });
  };

  $("m-sbtn").onclick = async () => {
    const q = $("m-search").value.trim(); if (!q) return;
    const u = (await searchUsersBySkill(q)).filter(x => x.uid !== UID);
    $("m-title").textContent = `Results for "${q}"`;
    const el = $("m-pot");
    if (!u.length) { el.innerHTML = '<div class="col-12"><div class="empty-state"><h5>None found</h5></div></div>'; return; }
    el.innerHTML = u.map(x => `<div class="col-lg-6"><div class="match-card d-flex gap-3"><div class="match-avatar">${(x.displayName || "?")[0].toUpperCase()}</div><div><h6 class="fw-bold">${esc(x.displayName)}</h6><div class="small">Offers: ${(x.skillsOffered || []).map(s => s.name).join(", ") || "None"}</div><div class="small">Wants: ${(x.skillsWanted || []).map(s => s.name).join(", ") || "None"}</div></div></div></div>`).join("");
  };
  $("m-search").onkeypress = e => { if (e.key === "Enter") $("m-sbtn").click(); };

  async function fillExisting(ms) {
    const pen = ms.filter(m => m.status === "pending"), acc = ms.filter(m => m.status === "accepted"), rej = ms.filter(m => m.status === "rejected");
    $("b-pen").textContent = pen.length; $("b-acc").textContent = acc.length; $("b-rej").textContent = rej.length;
    for (const m of ms) for (const u of m.users) if (!PC[u]) PC[u] = await getUserProfile(u);
    mList("ml-pen", pen, true); mList("ml-acc", acc, false); mList("ml-rej", rej, false);
  }

  /* ── Render ALL matches in overview section ── */
  function fillAllMatches(ms) {
    const el = $("ml-all");
    if (!el) return;
    if (!ms.length) { el.innerHTML = '<div class="col-12 text-muted text-center py-3">No matches yet.</div>'; return; }
    el.innerHTML = ms.map(m => {
      const oid = m.users.find(u => u !== UID), o = PC[oid] || {};
      const mt = m.skillsExchange?.[UID] || [], tt = m.skillsExchange?.[oid] || [];
      const statusBadge = {
        pending: '<span class="badge bg-warning text-dark">Pending</span>',
        accepted: '<span class="badge bg-success">Accepted</span>',
        rejected: '<span class="badge bg-danger">Rejected</span>'
      }[m.status] || '<span class="badge bg-secondary">Unknown</span>';
      return `<div class="col-lg-6"><div class="match-card"><div class="d-flex gap-3"><div class="match-avatar">${(o.displayName || "?")[0].toUpperCase()}</div><div class="flex-grow-1"><div class="d-flex justify-content-between align-items-center mb-1"><h6 class="fw-bold mb-0">${esc(o.displayName || "User")}</h6>${statusBadge}</div><div class="small mb-1 text-accent">Teach: ${mt.join(", ") || "—"}</div><div class="small text-warning">Learn: ${tt.join(", ") || "—"}</div></div></div></div></div>`;
    }).join("");
  }

  function mList(cid, ms, showAct) {
    const el = $(cid);
    if (!ms.length) { el.innerHTML = '<div class="col-12 text-muted text-center py-3">None.</div>'; return; }
    el.innerHTML = ms.map(m => {
      const oid = m.users.find(u => u !== UID), o = PC[oid] || {}, mt = m.skillsExchange?.[UID] || [], tt = m.skillsExchange?.[oid] || [];
      let act = "";
      if (showAct && m.receiver === UID) act = `<button class="btn btn-success btn-sm ab" data-m="${m.matchId}"><i class="bi bi-check-lg"></i> Accept</button> <button class="btn btn-danger btn-sm rb" data-m="${m.matchId}"><i class="bi bi-x-lg"></i> Reject</button>`;
      else if (showAct) act = '<span class="badge bg-secondary">Waiting…</span>';
      let ex = "";
      if (m.status === "accepted") ex = `<button class="btn btn-outline-accent btn-sm schb" data-m="${m.matchId}"><i class="bi bi-calendar-plus"></i></button> <button class="btn btn-outline-warning btn-sm rtb" data-m="${m.matchId}" data-u="${oid}"><i class="bi bi-star"></i></button> <button class="btn btn-accent btn-sm ocb" data-m="${m.matchId}"><i class="bi bi-chat"></i> Chat</button>`;
      return `<div class="col-lg-6"><div class="match-card"><div class="d-flex gap-3"><div class="match-avatar">${(o.displayName || "?")[0].toUpperCase()}</div><div class="flex-grow-1"><h6 class="fw-bold mb-1">${esc(o.displayName || "User")}</h6><div class="small mb-1 text-accent">Teach: ${mt.join(", ") || "—"}</div><div class="small mb-2 text-warning">Learn: ${tt.join(", ") || "—"}</div><div class="d-flex flex-wrap gap-2">${act} ${ex}</div></div></div></div></div>`;
    }).join("");
    el.querySelectorAll(".ab").forEach(b => b.onclick = async () => { b.disabled = true; await updateMatchStatus(b.dataset.m, "accepted"); });
    el.querySelectorAll(".rb").forEach(b => b.onclick = async () => { if (confirm("Reject?")) { b.disabled = true; await updateMatchStatus(b.dataset.m, "rejected"); } });
    el.querySelectorAll(".schb").forEach(b => b.onclick = () => { $("sess-mid").value = b.dataset.m; new bootstrap.Modal($("sessModal")).show(); });
    el.querySelectorAll(".rtb").forEach(b => b.onclick = () => { $("rt-uid").value = b.dataset.u; $("rt-mid").value = b.dataset.m; $("rt-val").value = 0; document.querySelectorAll("#rt-stars .bi").forEach(s => s.className = "bi bi-star"); new bootstrap.Modal($("rateModal")).show(); });
    el.querySelectorAll(".ocb").forEach(b => b.onclick = () => {
      document.querySelector('[data-bs-target="#t-chat"]').click();
      setTimeout(() => { document.querySelector(`.ch-c[data-m="${b.dataset.m}"]`)?.click(); }, 200);
    });
  }

  // Session
  $("sess-save").onclick = async () => {
    const dt = $("sess-dt").value; if (!dt) { alert("Pick date"); return; }
    await scheduleSession($("sess-mid").value, { scheduledBy: UID, dt, dur: +$("sess-dur").value || 60, topic: $("sess-top").value.trim() });
    bootstrap.Modal.getInstance($("sessModal")).hide(); alert("Scheduled!");
  };

  // Rating stars
  document.querySelectorAll("#rt-stars .bi").forEach(s => {
    s.onclick = () => { $("rt-val").value = s.dataset.v; uSt(+s.dataset.v); };
    s.onmouseenter = () => uSt(+s.dataset.v);
  });
  $("rt-stars").onmouseleave = () => uSt(+$("rt-val").value);
  function uSt(v) { document.querySelectorAll("#rt-stars .bi").forEach(s => s.className = +s.dataset.v <= v ? "bi bi-star-fill" : "bi bi-star"); }
  $("rt-submit").onclick = async () => {
    const r = +$("rt-val").value; if (!r) { alert("Select rating"); return; }
    await submitRating($("rt-uid").value, UID, $("rt-mid").value, r, $("rt-fb").value.trim());
    bootstrap.Modal.getInstance($("rateModal")).hide(); alert("Rated!");
  };

  /* ════════════════════════════════════════════
     CHAT TAB
     ════════════════════════════════════════════ */
  function fillChatSb(acc) {
    const el = $("ch-list");
    if (!acc.length) { el.innerHTML = '<div class="text-center text-muted py-4 small">No conversations.</div>'; return; }
    el.innerHTML = acc.map(m => {
      const oid = m.users.find(u => u !== UID), o = PC[oid] || {};
      return `<div class="chat-contact ch-c ${aMid === m.matchId ? 'active' : ''}" data-m="${m.matchId}">
        <div class="d-flex align-items-center gap-2 position-relative">
          <div class="match-avatar" style="width:38px;height:38px;font-size:.9rem;flex-shrink:0">${(o.displayName || "?")[0].toUpperCase()}</div>
          <div class="overflow-hidden"><div class="fw-bold text-truncate">${esc(o.displayName || "User")}</div></div>
          <span class="contact-badge d-none position-absolute" style="top:-2px;right:4px">0</span>
        </div></div>`;
    }).join("");
    el.querySelectorAll(".ch-c").forEach(c => c.onclick = () => {
      const m = acc.find(x => x.matchId === c.dataset.m);
      if (m) openChat(m);
      el.querySelectorAll(".ch-c").forEach(x => x.classList.remove("active"));
      c.classList.add("active");
      // Clear notification for this chat
      setActiveChatForNotif(m?.matchId);
      const b = c.querySelector(".contact-badge");
      if (b) b.classList.add("d-none");
    });
  }

  function openChat(m) {
    if (aCRef) stopListeningToChat(aCRef);
    aMid = m.matchId;
    setActiveChatForNotif(aMid);
    const oid = m.users.find(u => u !== UID), o = PC[oid] || {};
    $("ch-name").textContent = o.displayName || "User";
    $("ch-info").textContent = `Teach: ${(m.skillsExchange?.[UID] || []).join(", ")} · Learn: ${(m.skillsExchange?.[oid] || []).join(", ")}`;
    const av = $("ch-av"); av.textContent = (o.displayName || "?")[0].toUpperCase(); av.style.display = "flex";
    $("ch-msgs").innerHTML = "";
    $("ch-inp").classList.remove("d-none");
    let lastDateStr = "";
    aCRef = listenToChat(aMid, msg => {
      const el = $("ch-msgs"), mine = msg.senderId === UID;
      const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;
      // Date separator
      if (msgDate) {
        const dateStr = msgDate.toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" });
        if (dateStr !== lastDateStr) {
          lastDateStr = dateStr;
          const sep = document.createElement("div");
          sep.className = "text-center my-3";
          sep.innerHTML = `<span style="background:var(--surface-color,#f0f0f0);padding:4px 16px;border-radius:50px;font-size:.75rem;color:#888;border:1px solid #e0e0e0">${dateStr}</span>`;
          el.appendChild(sep);
        }
      }
      const t = msgDate ? msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      const b = document.createElement("div"); b.className = `chat-bubble ${mine ? "sent" : "received"}`;
      b.innerHTML = `${!mine ? `<div class="small fw-bold mb-1" style="opacity:.8">${esc(msg.senderName || "User")}</div>` : ""}<div>${esc(msg.text)}</div><span class="bubble-time">${t}</span>`;
      el.appendChild(b); el.scrollTop = el.scrollHeight;
    });
  }

  // When switching away from chat tab, clear active
  document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
    tab.addEventListener("shown.bs.tab", () => {
      if (!tab.dataset.bsTarget?.includes("t-chat")) {
        setActiveChatForNotif(null);
      }
    });
  });

  $("ch-send").onclick = doSend;
  $("ch-txt").onkeypress = e => { if (e.key === "Enter") doSend(); };
  function doSend() {
    const i = $("ch-txt"), t = i.value.trim();
    if (!t || !aMid) return;
    sendMessage(aMid, UID, UNAME, t);
    i.value = ""; i.focus();
  }

  /* ════════════════════════════════════════════
     HELPERS
     ════════════════════════════════════════════ */
  function rBadge(id, arr, w) {
    const el = $(id);
    if (!arr.length) { el.innerHTML = '<span class="text-muted small">None yet.</span>'; return; }
    el.innerHTML = arr.map(s => `<span class="skill-badge ${w ? 'wanted' : ''}">${esc(s.name)} <small>(${esc(s.category)})</small></span>`).join("");
  }

  function fillRecent(ms) {
    const el = $("rec-mat");
    if (!ms.length) { el.innerHTML = '<div class="empty-state py-3"><i class="bi bi-people"></i><h5>No matches</h5></div>'; return; }
    el.innerHTML = ms.map(m => {
      const o = m.users.find(u => u !== UID);
      const b = { pending: '<span class="badge bg-warning text-dark">Pending</span>', accepted: '<span class="badge bg-success">Accepted</span>', rejected: '<span class="badge bg-danger">Rejected</span>' }[m.status];
      return `<div class="d-flex align-items-center justify-content-between py-2 border-bottom"><div><strong>${m.initiator === UID ? "Sent" : "Received"}</strong> ${b}<div class="small text-muted">Teach: ${(m.skillsExchange?.[UID] || []).join(", ") || "—"} · Learn: ${(m.skillsExchange?.[o] || []).join(", ") || "—"}</div></div><button class="btn btn-sm btn-outline-accent" onclick="document.querySelector('[data-bs-target=&quot;#t-match&quot;]').click()">View</button></div>`;
    }).join("");
  }

  function flash(id, msg, type) {
    const el = $(id); el.textContent = msg;
    el.className = `alert alert-${type} mt-2 mb-0 py-2 small`;
    el.classList.remove("d-none");
    setTimeout(() => el.classList.add("d-none"), 3000);
  }

  console.log("✅ dashboard-app.js ready");
}