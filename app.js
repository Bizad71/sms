const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const apiKeyInput = document.getElementById("apiKey");
const keyStatus = document.getElementById("keyStatus");
const messageBox = document.getElementById("message");
const resultLabel = document.getElementById("resultLabel");
const sourceNote = document.getElementById("sourceNote");
const copyBtn = document.getElementById("copyBtn");
const copyStatus = document.getElementById("copyStatus");
const loveBtn = document.getElementById("loveBtn");
const morningBtn = document.getElementById("morningBtn");

const nicknames = ["عشق من", "نفسم", "زندگیم", "جیگرم", "همه‌چیزم", "قشنگ‌ترینم", "عزیز دلم", "جان دلم", "ماه من", "دلبرم"];
const recentMessages = [];
let currentMessage = "";

const savedKey = localStorage.getItem("geminiLoveApiKey");
if (savedKey) {
  apiKeyInput.value = savedKey;
  keyStatus.textContent = "کلید ذخیره شده و آماده استفاده است.";
}

document.getElementById("saveKey").addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    keyStatus.textContent = "اول کلید API را وارد کن.";
    return;
  }
  localStorage.setItem("geminiLoveApiKey", key);
  keyStatus.textContent = "کلید در همین مرورگر ذخیره شد.";
});

document.getElementById("toggleKey").addEventListener("click", () => {
  apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
});

function chooseNickname() {
  const available = nicknames.filter(n => n !== window.lastNickname);
  const selected = available[Math.floor(Math.random() * available.length)];
  window.lastNickname = selected;
  return selected;
}

function cleanText(text) {
  return text
    .replace(/^\s*["«]|["»]\s*$/g, "")
    .replace(/^(پیام عاشقانه|صبح بخیر)\s*[:：\-]\s*/i, "")
    .trim();
}

async function generateMessage(type) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    keyStatus.textContent = "برای شروع، کلید API جمنای را وارد و ذخیره کن.";
    apiKeyInput.focus();
    return;
  }

  const isMorning = type === "morning";
  const label = isMorning ? "در حال ساخت پیام صبح بخیر…" : "در حال ساخت پیام عاشقانه…";
  resultLabel.textContent = label;
  messageBox.textContent = "کمی صبر کن؛ دارم یک پیام تازه پیدا و آماده می‌کنم…";
  messageBox.classList.add("loading");
  sourceNote.textContent = "";
  copyBtn.disabled = true;
  copyStatus.textContent = "";
  loveBtn.disabled = true;
  morningBtn.disabled = true;

  const recent = recentMessages.slice(-8).join("\n---\n");
  const prompt = isMorning
    ? `با ابزار جست‌وجوی Google Search در وب، چند نمونه و ایده از پیام‌های صبح بخیر عاشقانه فارسی در سایت‌ها و منابع متفاوت پیدا کن. از آن‌ها فقط الهام بگیر و متن را عیناً کپی نکن. یک پیام صبح بخیر فارسی، بسیار لطیف، عاشقانه، صمیمی، طبیعی و خوش‌خوان بنویس؛ حدود ۳ تا ۵ جمله، نه کلیشه‌ای و نه رسمی. هر بار ایده و بیان متفاوت داشته باشد. از عبارت‌های تکراری زیر دوری کن:\n${recent}\nفقط خود پیام را برگردان؛ بدون عنوان، مقدمه، توضیح، نقل‌قول یا ایموجی.`
    : `با ابزار جست‌وجوی Google Search در وب، ایده‌هایی از نوشته‌ها و پیام‌های عاشقانه فارسی در سایت‌ها و منابع متفاوت پیدا کن. از آن‌ها فقط الهام بگیر و متن را عیناً کپی نکن. یک پیام عاشقانه فارسی، عمیق، صمیمی، دلنشین و طبیعی بنویس؛ حدود ۳ تا ۵ جمله، مناسب فرستادن برای همسر یا عشق زندگی. هر بار زاویه و بیان تازه‌ای داشته باشد و از متن‌های تکراری زیر دوری کند:\n${recent}\nفقط خود پیام را برگردان؛ بدون عنوان، مقدمه، توضیح، نقل‌قول یا ایموجی.`;

  try {
    const response = await fetch(`${API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 350 }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const apiMessage = data?.error?.message || `خطای HTTP ${response.status}`;
      throw new Error(apiMessage);
    }

    const raw = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!raw) throw new Error("جمنای پیام متنی برنگرداند. دوباره امتحان کن.");

    const body = cleanText(raw);
    const nickname = chooseNickname();
    const ending = isMorning
      ? `صبح بخیر ${nickname} 😘😘😘 ❤️`
      : `دوستت دارم ${nickname} 😘😘😘 ❤️`;
    currentMessage = `${body}\n\n—\n${ending}`;

    messageBox.textContent = currentMessage;
    messageBox.classList.remove("loading");
    resultLabel.textContent = isMorning ? "پیام صبح بخیر تو آماده است" : "پیام عاشقانه تو آماده است";
    copyBtn.disabled = false;
    recentMessages.push(body);
    if (recentMessages.length > 12) recentMessages.shift();

    const grounding = data?.candidates?.[0]?.groundingMetadata;
    const queries = grounding?.webSearchQueries || [];
    sourceNote.textContent = queries.length
      ? "با جست‌وجوی وب ساخته شده؛ ایده‌ها از منابع آنلاین گرفته شده‌اند."
      : "پیام با Gemini ساخته شده است.";
  } catch (error) {
    messageBox.textContent = `ساخت پیام انجام نشد.\n\n${error.message}\n\nکلید API، دسترسی اینترنت و فعال بودن Gemini API را بررسی کن.`;
    messageBox.classList.remove("loading");
    resultLabel.textContent = "مشکلی پیش آمد";
    sourceNote.textContent = "";
  } finally {
    loveBtn.disabled = false;
    morningBtn.disabled = false;
  }
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
