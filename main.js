// ================================================================
// 網站主程式：讀 works.js 的資料，長出整個網站（含動態效果）
// 柚子平常不需要動這個檔案 — 內容都在 works.js 改
// ================================================================

// 動態效果總開關：JS 有跑起來才啟用動畫
// （沒開 JS 或很舊的裝置 → 沒有這個開關 → 內容直接全部顯示，不會壞）
document.documentElement.classList.add("js-anim");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── 小工具：把「完整網址」或「影片 ID」都轉成影片 ID ──
function toVideoId(input) {
  const raw = String(input).trim();
  const match = raw.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/);
  return match ? match[1] : raw;
}

function thumbUrl(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

// 把「參與」欄位變成一顆顆標籤；沒填就退回顯示分類
function tagsHtml(work) {
  const roles = (work.參與 || "").split(/[、,，・\s]+/).filter(Boolean);
  const colorClass = work.分類 === "動態設計" ? "tag-motion" : "tag-edit";
  return (roles.length ? roles : [work.分類])
    .map((r) => `<span class="work-tag ${colorClass}">${r}</span>`)
    .join("");
}

// ── 捲動浮現：元素進到畫面才輕輕出現 ──
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.classList.add("is-visible");
      revealObserver.unobserve(el);

      // 小黑的訊息：先顯示「輸入中…」再換成文字
      if (!REDUCED_MOTION && el.classList.contains("from-dog")) {
        const p = el.querySelector("p");
        if (p && p.dataset.fullText) {
          p.innerHTML = '<span class="typing-dots"><i></i><i></i><i></i></span>';
          setTimeout(() => { p.textContent = p.dataset.fullText; }, 520);
        }
      }

      // 出場動畫跑完就把動畫用的樣式拆掉，
      // 避免跟卡片 hover 之類的效果互相干擾
      setTimeout(() => {
        el.classList.remove("reveal", "reveal-pop", "is-visible");
        el.style.transitionDelay = "";
      }, 750 + (parseInt(el.style.transitionDelay) || 0));
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
);

// 捲動浮現的總開關（下面的金絲雀保險可能會把它關掉）
let revealEnabled = "IntersectionObserver" in window;

function watchReveal(el, delayMs = 0, pop = false) {
  if (!revealEnabled) return; // 保險已觸發 → 不再藏任何東西
  el.classList.add(pop ? "reveal-pop" : "reveal");
  if (delayMs) el.style.transitionDelay = `${delayMs}ms`;
  revealObserver.observe(el);
}

// ── 金絲雀保險 ──
// 「進入畫面」的通知機制正常時，載入後一定會立刻收到第一次通知；
// 1.6 秒內沒收到＝機制失靈（太舊的瀏覽器或特殊環境），
// 就把所有藏起來等浮現的內容直接顯示，寧可沒動畫也不能看不到內容
if (revealEnabled) {
  let ioAlive = false;
  const canary = new IntersectionObserver(() => {
    ioAlive = true;
    canary.disconnect();
  });
  canary.observe(document.body);

  setTimeout(() => {
    if (ioAlive) return;
    revealEnabled = false;
    revealObserver.disconnect();
    for (const el of document.querySelectorAll(".reveal, .reveal-pop")) {
      el.classList.remove("reveal", "reveal-pop", "is-visible");
      el.style.transitionDelay = "";
    }
  }, 1600);
}

// ── 開頭門面文字（名字逐字浮現） ──
const heroTitle = document.getElementById("heroTitle");
heroTitle.textContent = "";
[...SITE.名字].forEach((ch, i) => {
  const span = document.createElement("span");
  span.className = "char";
  span.textContent = ch;
  span.style.animationDelay = `${0.22 + i * 0.1}s`;
  heroTitle.appendChild(span);
});

document.getElementById("heroTagline").textContent = SITE.標語;
document.title = `${SITE.名字}｜${SITE.職稱}`;

// ── 作品卡片牆 ──
const grid = document.getElementById("worksGrid");
let currentFilter = "動態設計";

function renderWorks(filter) {
  grid.innerHTML = "";
  const list = WORKS.filter((w) => w.分類 === filter);

  list.forEach((work, i) => {
    const id = toVideoId(work.youtube);
    const card = document.createElement("article");
    card.className = "work-card";
    card.innerHTML = `
      <div class="work-thumb">
        <img src="${thumbUrl(id)}" alt="${work.名稱}" loading="lazy" />
        ${work.時長 ? `<span class="work-duration">${work.時長}</span>` : ""}
      </div>
      <div class="work-body">
        <div class="work-tags">${tagsHtml(work)}</div>
        <h3 class="work-title">${work.名稱}</h3>
      </div>
    `;
    card.addEventListener("click", () => openLightbox(work, id));
    watchReveal(card, (i % 4) * 70); // 同一排的卡片一張接一張出現
    grid.appendChild(card);
  });
}

renderWorks(currentFilter);

// ── 分類切換（先柔和淡出，再讓新卡片依序浮現） ──
const filterBar = document.getElementById("filterBar");

filterBar.addEventListener("click", (event) => {
  const btn = event.target.closest(".filter-btn");
  if (!btn || btn.dataset.filter === currentFilter) return;
  currentFilter = btn.dataset.filter;
  filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");

  grid.classList.add("is-switching");
  setTimeout(() => {
    renderWorks(currentFilter);
    grid.classList.remove("is-switching");
  }, 190);
});

// ── 影片彈出視窗 ──
const lightbox = document.getElementById("lightbox");
const lightboxFrame = document.getElementById("lightboxFrame");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxTags = document.getElementById("lightboxTags");
const lightboxDesc = document.getElementById("lightboxDesc");

function openLightbox(work, id) {
  lightboxFrame.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
  lightboxTitle.textContent = work.名稱;
  lightboxTags.innerHTML = tagsHtml(work);
  lightboxDesc.textContent = work.說明 || "";
  lightboxDesc.style.display = work.說明 ? "" : "none";
  document.getElementById("lightboxYt").href = `https://www.youtube.com/watch?v=${id}`;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden"; // 背景不捲動
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxFrame.src = ""; // 停止播放
  document.body.style.overflow = "";
}

document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
document.getElementById("lightboxBackdrop").addEventListener("click", closeLightbox);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
});

// ── Showreel 按鈕：直接用彈出視窗播主打影片 ──
document.getElementById("reelButton").addEventListener("click", () => {
  openLightbox({ 名稱: "Showreel", 分類: "動態設計", 說明: "" }, toVideoId(SITE.showreel));
});

// ── 聊聊我吧！（讀 ABOUT_CHAT 長出對話） ──
// 頭像：優先用 assets/ 裡的插畫（yuzi.png/jpg＝毅勳、kuro.png/jpg＝小黑），
// 找不到圖檔時自動退回文字頭像，所以圖還沒放也不會壞
const aboutChat = document.getElementById("aboutChat");

function makeAvatar(isMe, hiddenSpacer) {
  const span = document.createElement("span");
  span.className = `chat-avatar ${isMe ? "avatar-me" : "avatar-dog"}`;
  if (hiddenSpacer) {
    span.style.visibility = "hidden";
    return span;
  }
  const img = document.createElement("img");
  img.alt = isMe ? "毅勳" : "小黑";
  img.src = `assets/${isMe ? "yuzi" : "kuro"}.png`;
  img.onerror = () => {
    if (!img.dataset.triedJpg) {
      img.dataset.triedJpg = "1";
      img.src = `assets/${isMe ? "yuzi" : "kuro"}.jpg`;
    } else {
      span.textContent = isMe ? "勳" : "黑"; // 沒有圖檔 → 文字頭像
    }
  };
  span.appendChild(img);
  return span;
}

ABOUT_CHAT.forEach((line, index) => {
  const isMe = line.誰 === "毅勳";
  const samePrevious = index > 0 && ABOUT_CHAT[index - 1].誰 === line.誰;
  const row = document.createElement("div");
  row.className = `chat-row ${isMe ? "from-me" : "from-dog"}${samePrevious ? " follow" : ""}`;
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.innerHTML = `
    ${samePrevious ? "" : `<span class="chat-name">${line.誰}</span>`}
    <p></p>
  `;
  const p = bubble.querySelector("p");
  p.textContent = line.說;
  p.dataset.fullText = line.說;
  row.appendChild(makeAvatar(isMe, samePrevious));
  row.appendChild(bubble);
  watchReveal(row, (index % 4) * 110, true); // 泡泡一句一句彈出
  aboutChat.appendChild(row);
});

// ── 簡歷卡的自我介紹（讀 INTRO 長出段落） ──
const resumeIntro = document.getElementById("resumeIntro");

INTRO.forEach((paragraph, index) => {
  const p = document.createElement("p");
  if (index === 0) p.className = "intro-lead"; // 第一句當開場白，字重加粗
  p.textContent = paragraph;
  resumeIntro.appendChild(p);
});

// ── 簡歷卡的「近期作品」年表 ──
const recentList = document.getElementById("recentList");

for (const item of RECENT_WORKS) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="recent-year">${item.年份}</span><span class="recent-title">${item.名稱}</span>`;
  recentList.appendChild(li);
}

// ── 聯絡方式 ──
const contactList = document.getElementById("contactList");
const contacts = [
  { label: `✉️ ${SITE.email}`, href: `mailto:${SITE.email}` },
  { label: `📷 Instagram @${SITE.instagram}`, href: `https://www.instagram.com/${SITE.instagram}/` },
  { label: `💬 LINE ID：${SITE.lineId}`, href: null },
];

for (const c of contacts) {
  const li = document.createElement("li");
  if (c.href) {
    li.innerHTML = `<a href="${c.href}" target="_blank" rel="noopener">${c.label}</a>`;
  } else {
    li.innerHTML = `<span class="contact-plain">${c.label}</span>`;
  }
  contactList.appendChild(li);
}

// ── 其他區塊的捲動浮現 ──
for (const el of document.querySelectorAll(
  ".section-title, .filter-bar, .chat-window, .resume-card, .contact-list, .section-divider"
)) {
  watchReveal(el);
}

// ── 頁首陰影＋右下角快速跳轉的顯示時機 ──
const siteHeader = document.querySelector(".site-header");
const quickNav = document.getElementById("quickNav");

addEventListener(
  "scroll",
  () => {
    siteHeader.classList.toggle("scrolled", scrollY > 10);
    // 捲過門面 6 成高度才浮現快速跳轉
    quickNav.classList.toggle("show", scrollY > innerHeight * 0.6);
  },
  { passive: true }
);
