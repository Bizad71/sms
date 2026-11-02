
const SEARCH_URL = "https://s.jina.ai/";

const $ = id => document.getElementById(id);

const messageBox = $("message");
const resultLabel = $("resultLabel");
const sourceNote = $("sourceNote");
const copyBtn = $("copyBtn");
const copyStatus = $("copyStatus");
const loveBtn = $("loveBtn");
const morningBtn = $("morningBtn");

document.querySelector(".api-panel")?.remove();

const nicknames = [
  "عشق من", "نفسم", "زندگیم", "جیگرم",
  "همه‌چیزم", "عزیز دلم", "جان دلم",
  "ماه من", "دلبرم", "قشنگ‌ترینم"
];

let currentMessage = "";
let lastNickname = "";
let usedTexts = [];

function randomNickname() {
  const choices = nicknames.filter(x => x !== lastNickname);
  lastNickname = choices[Math.floor(Math.random() * choices.length)];
  return lastNickname;
}

function cleanText(text) {
  return String(text || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPersian(text) {
  const fa = (text.match(/[آ-ی]/g) || []).length;
  const en = (text.match(/[a-zA-Z]/g) || []).length;
  return fa > en;
}

function scoreText(text, type) {
  if (text.length < 100 || text.length > 650) return -100;
  if (!isPersian(text)) return -100;

  const badWords = [
    "تبلیغات", "ثبت نام", "ورود به سایت",
    "مطالب مرتبط", "تمام حقوق محفوظ",
    "اشتراک گذاری", "کانال تلگرام",
    "منبع عکس", "کپی رایت", "نظرات کاربران"
  ];

  if (badWords.some(w => text.includes(w))) return -100;

  const words = type === "morning"
    ? ["صبح", "خورشید", "روزت", "آفتاب", "بیدار", "سپیده"]
    : ["عشق", "دوستت", "دلم", "عاشق", "قلب", "جانم", "زندگی"];

  let score = 0;

  for (const word of words) {
    if (text.includes(word)) score += 3;
  }

  if (text.length > 160) score += 2;
  if (/[.!؟]$/.test(text)) score += 2;

  return score;
}

function extractResults(data) {
  let results = [];

  function walk(obj) {
    if (!obj) return;

    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }

    if (typeof obj === "object") {
      if (obj.content || obj.description || obj.snippet) {
        results.push({
          title: obj.title || "منبع اینترنتی",
          url: obj.url || "",
          content: obj.content || obj.description || obj.snippet
        });
      }

      Object.values(obj).forEach(value => {
        if (typeof value === "object") walk(value);
      });
    }
  }

  walk(data);

  if (typeof data === "string") {
    results.push({
      title: "نتیجه جست‌وجوی وب",
      url: "",
      content: data
    });
  }

  return results;
}

async function searchWeb(type) {
  const queries = type === "morning"
    ? [
        "متن کامل صبح بخیر عاشقانه زیبا برای عشق",
        "پیام صبح بخیر عاشقانه احساسی فارسی"
      ]
    : [
        "متن کامل پیام عاشقانه احساسی فارسی",
        "جملات عاشقانه زیبا برای ابراز عشق"
      ];

  let candidates = [];

  for (const query of queries) {
    const url = SEARCH_URL + encodeURIComponent(query);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("سرویس جست‌وجوی اینترنت پاسخ نداد: " + response.status);
    }

    const data = await response.json();
    const results = extractResults(data);

    for (const result of results) {
      const content = String(result.content || "");

      const paragraphs = content
        .split(/\n+/)
        .map(cleanText)
        .filter(Boolean);

      for (const paragraph of paragraphs) {
        const score = scoreText(paragraph, type);

        if (score >= 5) {
          candidates.push({
            text: paragraph,
            title: result.title,
            url: result.url,
            score
          });
        }
      }
    }

    if (candidates.length >= 5) break;
  }

  const unique = [];
  const seen = new Set();

  for (const item of candidates) {
    const key = item.text.replace(/\s/g, "");

    if (!seen.has(key) && !usedTexts.includes(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  if (!unique.length) {
    throw new Error(
      "متن کامل و مناسبی پیدا نشد. دوباره جست‌وجو کن."
    );
  }

  unique.sort((a, b) => b.score - a.score);

  const best = unique[
    Math.floor(Math.random() * Math.min(4, unique.length))
  ];

  usedTexts.push(best.text.replace(/\s/g, ""));

  if (usedTexts.length > 30) {
    usedTexts.shift();
  }

  return best;
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

async function generate(type) {
  const isMorning = type === "morning";

  loveBtn.disabled = true;
  morningBtn.disabled = true;
  copyBtn.disabled = true;

  copyStatus.textContent = "";
  sourceNote.textContent = "";

  resultLabel.textContent = "در حال جست‌وجو در اینترنت...";

  messageBox.classList.add("loading");
  messageBox.textContent =
    "در حال پیدا کردن یک پیام عاشقانه کامل و زیبا...";

  try {
    const result = await searchWeb(type);

    const ending = isMorning
      ? `صبح بخیر ${randomNickname()} 😘😘😘 ❤️`
      : `دوستت دارم ${randomNickname()} 😘😘😘 ❤️`;

    currentMessage =
      `${result.text}\n\nــــــــــــــــــــ\n${ending}`;

    messageBox.textContent = currentMessage;
    messageBox.classList.remove("loading");

    resultLabel.textContent = isMorning
      ? "پیام صبح بخیر آماده شد"
      : "پیام عاشقانه آماده شد";

    if (result.url) {
      sourceNote.innerHTML =
        `منبع: <a href="${escapeHTML(result.url)}"
        target="_blank" rel="noopener noreferrer">
        ${escapeHTML(result.title)}</a>`;
    } else {
      sourceNote.textContent = "منبع: نتایج جست‌وجوی اینترنت";
    }

    copyBtn.disabled = false;

  } catch (error) {
    messageBox.classList.remove("loading");

    resultLabel.textContent = "خطا در جست‌وجو";

    messageBox.textContent =
      "نتوانستم پیام مناسبی پیدا کنم.\n\n" +
      error.message +
      "\n\nاتصال اینترنت را بررسی کن و دوباره امتحان کن.";

  } finally {
    loveBtn.disabled = false;
    morningBtn.disabled = false;
  }
}

loveBtn.addEventListener("click", () => generate("love"));

morningBtn.addEventListener("click", () => generate("morning"));

copyBtn.addEventListener("click", async () => {
  if (!currentMessage) return;

  try {
    await navigator.clipboard.writeText(currentMessage);
    copyStatus.textContent = "کپی شد ❤️";

  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = currentMessage;

    document.body.appendChild(textarea);
    textarea.select();

    const success = document.execCommand("copy");
    textarea.remove();

    copyStatus.textContent = success
      ? "کپی شد ❤️"
      : "کپی انجام نشد";
  }
});
