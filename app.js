// جست‌وجوی واقعی وب بدون کلید API؛ منبع: Purili Search API
const SEARCH_API = "https://puri.li/api/search";
const CONTEXT_API = "https://puri.li/api/context";

const apiKeyInput = document.getElementById("apiKey");
const keyPanel = document.querySelector(".api-panel");
if (keyPanel) keyPanel.style.display = "none";

const messageBox = document.getElementById("message");
const resultLabel = document.getElementById("resultLabel");
const sourceNote = document.getElementById("sourceNote");
const copyBtn = document.getElementById("copyBtn");
const copyStatus = document.getElementById("copyStatus");
const loveBtn = document.getElementById("loveBtn");
const morningBtn = document.getElementById("morningBtn");

const nicknames = ["عشق من", "نفسم", "زندگیم", "جیگرم", "همه‌چیزم", "قشنگ‌ترینم", "عزیز دلم", "جان دلم", "ماه من", "دلبرم"];
const usedUrls = new Set();
let currentMessage = "";
let lastNickname = "";

function chooseNickname() {
  const options = nicknames.filter(x => x !== lastNickname);
  lastNickname = options[Math.floor(Math.random() * options.length)];
  return lastNickname;
}

function cleanText(value) {
  return (value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMessage(text, type) {
  const normalized = cleanText(text);
  if (!normalized) return "";

  // متن صفحه را به جمله‌ها تقسیم می‌کنیم و جمله‌های مرتبط را برمی‌داریم.
  const sentences = normalized
    .split(/(?<=[.!؟!?۔])\s+|[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 28 && s.length <= 420);

  const terms = type === "morning"
    ? ["صبح", "خورشید", "بیدار", "روزت", "صبحگاهی", "سپیده"]
    : ["عشق", "دوستت", "دلم", "عاشق", "محبت", "قلب", "عزیز"];

  const relevant = sentences.filter(s => terms.some(t => s.includes(t)));
  const pool = relevant.length ? relevant : sentences;
  if (!pool.length) return normalized.slice(0, 420);

  // از بین بخش‌های مرتبط، موردی تازه انتخاب می‌شود.
  const start = Math.floor(Math.random() * pool.length);
  const chosen = [];
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const item = pool[(start + i) % pool.length];
    if (!chosen.includes(item)) chosen.push(item);
  }
  return chosen.join(" ").slice(0, 700);
}

async function searchWeb(query) {
  const url = `${SEARCH_API}?q=${encodeURIComponent(query)}&page=1`;
  const response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`سرویس جست‌وجو پاسخ نداد (HTTP ${response.status}).`);
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function fetchPageText(result) {
  const response = await fetch(`${CONTEXT_API}?url=${encodeURIComponent(result.url)}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) return "";
  const data = await response.json();
  return cleanText([data.title, data.summary, data.content, ...(data.passages || [])].join(" "));
}

async function findOnlineMessage(type) {
  const queries = type === "morning"
    ? ["متن صبح بخیر عاشقانه برای عشق زندگی", "پیام صبح بخیر احساسی عاشقانه فارسی"]
    : ["متن پیام عاشقانه احساسی فارسی برای عشق", "جملات عاشقانه زیبا و احساسی فارسی"];

  let allResults = [];
  for (const query of queries) {
    const results = await searchWeb(query);
    allResults.push(...results);
    if (allResults.length >= 5) break;
  }

  const unique = [];
  const seen = new Set();
  for (const item of allResults) {
    if (item?.url && !seen.has(item.url)) {
      seen.add(item.url);
      unique.push(item);
    }
  }

  // نتیجه‌های استفاده‌نشده در اولویت‌اند؛ اگر همه استفاده شدند، چرخه از نو شروع می‌شود.
  let candidates = unique.filter(x => !usedUrls.has(x.url));
  if (!candidates.length) {
    usedUrls.clear();
    candidates = unique;
  }
  if (!candidates.length) throw new Error("برای این موضوع نتیجه‌ای پیدا نشد. کمی بعد دوباره امتحان کن.");

  // چند صفحه را امتحان می‌کنیم تا متن قابل استفاده پیدا شود.
  for (const item of candidates.sort(() => Math.random() - 0.5).slice(0, 5)) {
    usedUrls.add(item.url);
    let pageText = "";
    try { pageText = await fetchPageText(item); } catch (_) {}
    const excerpt = extractMessage(pageText || item.description || item.title, type);
    if (excerpt && excerpt.length >= 25) {
      return { text: excerpt, title: cleanText(item.title) || "منبع اینترنتی", url: item.url };
    }
  }
  throw new Error("نتایج پیدا شدند، اما متن قابل استخراج از صفحات در دسترس نبود. دوباره امتحان کن.");
}

async function generateMessage(type) {
  resultLabel.textContent = type === "morning" ? "در حال جست‌وجوی پیام صبح بخیر…" : "در حال جست‌وجوی پیام عاشقانه…";
  messageBox.textContent = "دارم در اینترنت جست‌وجو می‌کنم و متن مناسب را از یک صفحه پیدا می‌کنم…";
  messageBox.classList.add("loading");
  sourceNote.textContent = "";
  copyBtn.disabled = true;
  copyStatus.textContent = "";
  loveBtn.disabled = true;
  morningBtn.disabled = true;

  try {
    const found = await findOnlineMessage(type);
    const ending = type === "morning"
      ? `صبح بخیر ${chooseNickname()} 😘😘😘 ❤️`
      : `دوستت دارم ${chooseNickname()} 😘😘😘 ❤️`;
    currentMessage = `${found.text}\n\n—\n${ending}`;
    messageBox.textContent = currentMessage;
    messageBox.classList.remove("loading");
    resultLabel.textContent = type === "morning" ? "پیام صبح بخیر پیدا شد" : "پیام عاشقانه پیدا شد";
    sourceNote.innerHTML = `منبع: <a href="${found.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(found.title)}</a>`;
    copyBtn.disabled = false;
  } catch (error) {
    messageBox.textContent = `نتوانستم پیام را از اینترنت دریافت کنم.\n\n${error.message}\n\nاتصال اینترنت را بررسی کن و دوباره بزن.`;
    messageBox.classList.remove("loading");
    resultLabel.textContent = "جست‌وجو ناموفق بود";
  } finally {
    loveBtn.disabled = false;
    morningBtn.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

loveBtn.addEventListener("click", () => generateMessage("love"));
morningBtn.addEventListener("click", () => generateMessage("morning"));

copyBtn.addEventListener("click", async () => {
  if (!currentMessage) return;
  try {
    await navigator.clipboard.writeText(currentMessage);
    copyStatus.textContent = "پیام کپی شد ❤️";
  } catch {
    const helper = document.createElement("textarea");
    helper.value = currentMessage;
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand("copy");
    helper.remove();
    copyStatus.textContent = ok ? "پیام کپی شد ❤️" : "کپی خودکار ممکن نشد؛ متن را انتخاب کن.";
  }
});
