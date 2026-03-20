/**
 * SwapSkills — skills-app.js
 * Skills management: add, remove, list offered/wanted
 */

async function waitForSS() {
  if (window.SS) return;
  await new Promise(r => { const i = setInterval(() => { if (window.SS) { clearInterval(i); r(); } }, 40); });
}

export async function init() {
  await waitForSS();

  const { observeAuth, logoutUser, getUserSkills, addSkill, removeSkill, SKILL_CATEGORIES } = SS;

  let currentUid = null;
  let skillsData = { offered: [], wanted: [] };

  // Populate category dropdown
  const catSel = document.getElementById("skill-category");
  (SKILL_CATEGORIES || SS.CATS).forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; catSel.appendChild(o); });

  // Auth guard
  observeAuth(async (user) => {
    if (!user) { window.location.href = "auth.html"; return; }
    currentUid = user.uid;
    await loadSkills();
    document.getElementById("page-loader").classList.add("d-none");
    document.getElementById("page-content").classList.remove("d-none");
    if (typeof AOS !== "undefined") AOS.init({ duration: 600, easing: "ease-in-out", once: true });
  });

  // Load & render
  async function loadSkills() {
    skillsData = await getUserSkills(currentUid);
    render("list-offered", skillsData.offered, "offered", "count-offered");
    render("list-wanted",  skillsData.wanted,  "wanted",  "count-wanted");
  }

  function render(containerId, skills, type, countId) {
    const el = document.getElementById(containerId);
    document.getElementById(countId).textContent = skills.length;
    if (!skills.length) {
      el.innerHTML = '<div class="empty-state py-3"><i class="bi bi-' + (type==='offered'?'lightbulb':'book') + '"></i><p>No ' + type + ' skills yet.</p></div>';
      return;
    }
    el.innerHTML = '<div class="d-flex flex-wrap gap-2">' + skills.map(s =>
      '<span class="skill-badge ' + (type==='wanted'?'wanted':'') + '">' +
        s.name + ' <small>(' + s.category + ' · ' + s.level + ')</small>' +
        ' <i class="bi bi-x-circle-fill remove-skill" data-id="' + s.id + '" data-type="' + type + '"></i>' +
      '</span>'
    ).join("") + '</div>';

    el.querySelectorAll(".remove-skill").forEach(btn => {
      btn.addEventListener("click", async () => {
        const skillId = btn.dataset.id;
        const t       = btn.dataset.type;
        const arr     = t === "offered" ? skillsData.offered : skillsData.wanted;
        const obj     = arr.find(s => s.id === skillId);
        if (!obj) return;
        if (!confirm('Remove "' + obj.name + '" from your ' + t + ' skills?')) return;
        await removeSkill(currentUid, obj, t);
        await loadSkills();
      });
    });
  }

  // Add skill
  document.getElementById("add-skill-btn").addEventListener("click", async () => {
    const name  = document.getElementById("skill-name").value.trim();
    const cat   = document.getElementById("skill-category").value;
    const level = document.getElementById("skill-level").value;
    const desc  = document.getElementById("skill-desc").value.trim();
    const type  = document.querySelector('input[name="skillType"]:checked').value;

    if (!name) return showSkillAlert("Please enter a skill name.", "danger");

    await addSkill(currentUid, { name, category: cat, level, description: desc }, type);
    showSkillAlert('"' + name + '" added to ' + type + ' skills!', "success");
    document.getElementById("skill-name").value = "";
    document.getElementById("skill-desc").value = "";
    await loadSkills();
  });

  function showSkillAlert(msg, type) {
    const el = document.getElementById("skill-alert");
    el.textContent = msg;
    el.className = 'alert alert-' + type + ' mt-2 mb-0 py-2 small';
    el.classList.remove("d-none");
    setTimeout(() => el.classList.add("d-none"), 3000);
  }

  document.getElementById("logout-btn").addEventListener("click", async () => { await logoutUser(); window.location.href = "index.html"; });

  console.log("[SS] skills-app.js ready");
}