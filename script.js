const slides = [...document.querySelectorAll(".slide")];
const currentSlideLabel = document.querySelector("#currentSlide");
const progressFill = document.querySelector("#progressFill");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");
const overviewButton = document.querySelector("#overviewButton");
const closeOverviewButton = document.querySelector("#closeOverview");
const overview = document.querySelector("#overview");
const overviewGrid = document.querySelector("#overviewGrid");
const languageButtons = [...document.querySelectorAll("[data-set-language]")];

let currentIndex = 0;
let currentLanguage = "zh";
let scrollTimer;

const slideTitles = {
  zh: [
    "AI 会写代码，为什么仍然做不好游戏？",
    "一个典型的人机协作失败循环",
    "从表象到深层原因",
    "复杂项目所需的人类能力",
    "AI 的结构性能力边界",
    "人与 AI 的耦合问题",
    "为什么是游戏开发？",
    "学生缺少的不是 Prompt 模板",
    "课程的核心教学目标",
    "从提示—生成转向协作闭环",
  ],
  en: [
    "Why Does AI Still Struggle to Make a Good Game?",
    "A Typical Human–AI Collaboration Failure Loop",
    "From Visible Symptoms to Underlying Causes",
    "Human Capabilities for Complex Projects",
    "Structural Limitations of AI",
    "The Human–AI Coupling Problem",
    "Why Game Development?",
    "Beyond Prompt Templates",
    "The Central Learning Objective",
    "From Prompt–Generation to a Collaborative Loop",
  ],
};

const labelTranslations = new Map([
  ["COURSE INTRODUCTION · 课程导论", ["课程导论", "COURSE INTRODUCTION"]],
  ["THESIS / 核心命题", ["核心命题", "THESIS"]],
  ["Human–AI Collaboration", ["人机协作", "Human–AI Collaboration"]],
  ["From symptoms to causes · 从表象到原因", ["从表象到原因", "From symptoms to causes"]],
  ["These are trainable, general capabilities · 这些是可训练的通用能力", ["这些是可训练的通用能力", "These are trainable, general capabilities"]],
  ["Structural limitations of AI systems · AI 系统的结构性限制", ["AI 系统的结构性限制", "Structural limitations of AI systems"]],
  ["Human–AI coupling · 人机耦合", ["人机耦合", "Human–AI coupling"]],
  ["A game is a dynamic system, not a single feature · 游戏是动态系统", ["游戏是动态系统，而不是单一功能", "A game is a dynamic system, not a single feature"]],
  ["From tool literacy to collaborative competence · 从工具素养到协作能力", ["从工具素养到协作能力", "From tool literacy to collaborative competence"]],
  ["Four roles of the student · 学生的四种角色", ["学生的四种角色", "Four roles of the student"]],
  ["Next · 课程如何围绕这一闭环展开？", ["下一部分 · 课程如何围绕这一闭环展开？", "Next · How is the course structured around this loop?"]],
  ["CAPABILITY / 能力", ["能力", "CAPABILITY"]],
  ["WHAT MUST BE LEARNED / 需要学习什么", ["需要学习什么", "WHAT MUST BE LEARNED"]],
  ["PRINCIPLE / 原则", ["原则", "PRINCIPLE"]],
  ["HUMAN / 人", ["人", "HUMAN"]],
  ["AGENT / AI", ["AI", "AGENT"]],
  ["OUTCOMES / 后果", ["后果", "OUTCOMES"]],
  ["INSUFFICIENT / 不充分", ["不充分", "INSUFFICIENT"]],
  ["EDUCATIONAL PRIORITY / 教学重点", ["教学重点", "EDUCATIONAL PRIORITY"]],
  ["CORE THESIS / 核心论点", ["核心论点", "CORE THESIS"]],
  ["SLIDE OVERVIEW / 幻灯片全览", ["幻灯片全览", "SLIDE OVERVIEW"]],
  ["FINDING", ["结论", "FINDING"]],
  ["CLAIM", ["论点", "CLAIM"]],
  ["CAUTION", ["注意", "CAUTION"]],
]);

function setBilingualLabel(element, zh, en) {
  element.dataset.labelZh = zh;
  element.dataset.labelEn = en;
}

function prepareLanguageContent() {
  document.querySelectorAll(".kicker").forEach((element) => {
    const [englishPart, chinesePart] = element.textContent.split(" / ");
    const number = englishPart.match(/^\d+\s*·/)?.[0] ?? "";
    element.innerHTML = "";

    const zh = document.createElement("span");
    zh.lang = "zh";
    zh.textContent = `${number} ${chinesePart}`.trim();

    const en = document.createElement("span");
    en.lang = "en";
    en.textContent = englishPart;

    element.append(zh, en);
  });

  const courseName = document.querySelector(".course-mark > span:last-child");
  courseName.innerHTML = '<span lang="zh">人机协作游戏开发</span><span lang="en">Collaborative Game Development</span>';

  const couplingSign = document.querySelector(".coupling-sign span");
  couplingSign.innerHTML = '<span lang="zh">相互放大</span><span lang="en">MUTUAL<br>AMPLIFICATION</span>';

  const translatableSelectors = [
    ".site-header > p",
    ".opening-note > span",
    ".finding > span",
    ".table-head span",
    ".principle-card > span",
    ".coupling-grid article > span",
    ".outcome-row > span",
    ".comparison-grid article > span",
    ".final-thesis > span",
    ".slide-footer span",
    ".overview-header h2",
  ].join(",");

  document.querySelectorAll(translatableSelectors).forEach((element) => {
    const translation = labelTranslations.get(element.textContent.trim());
    if (translation) setBilingualLabel(element, translation[0], translation[1]);
  });

  document.querySelectorAll("em, .title-en, .item-en, p[lang='en'], .cards-grid small, .secondary small, .competencies small, .role-grid small, .map-center span").forEach((element) => {
    element.lang = "en";
  });

  const contentElements = [...document.querySelectorAll(".slide *")];
  contentElements.forEach((element) => {
    if (element.closest(".slide [lang]") || element.closest("[data-label-zh]")) return;
    const meaningfulChildren = [...element.children].filter((child) => child.tagName !== "BR");
    const text = element.textContent.trim();

    if (meaningfulChildren.length === 0 && /[\u3400-\u9fff]/.test(text)) {
      element.lang = "zh";
    } else if (meaningfulChildren.length === 0 && /[A-Za-z]/.test(text)) {
      element.lang = "en";
    }
  });

  const walker = document.createTreeWalker(
    document.querySelector(".deck"),
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!/[\u3400-\u9fff]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(".slide [lang]") || parent.closest("[data-label-zh]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const chineseTextNodes = [];
  while (walker.nextNode()) chineseTextNodes.push(walker.currentNode);
  chineseTextNodes.forEach((node) => {
    const span = document.createElement("span");
    span.lang = "zh";
    span.textContent = node.nodeValue;
    node.replaceWith(span);
  });
}

function renderOverview() {
  overviewGrid.replaceChildren();
  slideTitles[currentLanguage].forEach((title, index) => {
    const card = document.createElement("article");
    card.className = "overview-card";
    card.tabIndex = 0;
    card.innerHTML = `
      <span>${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}</span>
      <h3>${title}</h3>
    `;
    card.addEventListener("click", () => goToSlide(index));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goToSlide(index);
      }
    });
    overviewGrid.appendChild(card);
  });
}

function applyLanguage(language) {
  currentLanguage = language === "en" ? "en" : "zh";
  document.body.dataset.language = currentLanguage;
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-label-zh]").forEach((element) => {
    element.textContent = element.dataset[currentLanguage === "zh" ? "labelZh" : "labelEn"];
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.setLanguage === currentLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  overviewButton.setAttribute(
    "aria-label",
    currentLanguage === "zh" ? "打开幻灯片全览" : "Open slide overview",
  );
  prevButton.setAttribute("aria-label", currentLanguage === "zh" ? "上一页" : "Previous slide");
  nextButton.setAttribute("aria-label", currentLanguage === "zh" ? "下一页" : "Next slide");
  closeOverviewButton.setAttribute("aria-label", currentLanguage === "zh" ? "关闭全览" : "Close overview");
  renderOverview();
  updateUI(currentIndex);

  try {
    localStorage.setItem("presentation-language", currentLanguage);
  } catch {
    // The language switch still works when storage is unavailable.
  }
}

function goToSlide(index) {
  const safeIndex = Math.max(0, Math.min(slides.length - 1, index));
  slides[safeIndex].scrollIntoView({ behavior: "smooth", block: "start" });
  closeOverview();
}

function updateUI(index) {
  currentIndex = index;
  currentSlideLabel.textContent = String(index + 1).padStart(2, "0");
  progressFill.style.width = `${((index + 1) / slides.length) * 100}%`;
  document.title = `${String(index + 1).padStart(2, "0")} · ${slideTitles[currentLanguage][index]}`;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === index);
  });
}

function openOverview() {
  overview.classList.add("is-open");
  overview.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeOverviewButton.focus();
}

function closeOverview() {
  overview.classList.remove("is-open");
  overview.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

prepareLanguageContent();

let savedLanguage = "zh";
try {
  savedLanguage = localStorage.getItem("presentation-language") || "zh";
} catch {
  savedLanguage = "zh";
}
applyLanguage(savedLanguage);

const observer = new IntersectionObserver(
  (entries) => {
    const visibleSlide = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visibleSlide) updateUI(slides.indexOf(visibleSlide.target));
  },
  { threshold: [0.45, 0.7] },
);

slides.forEach((slide) => observer.observe(slide));

prevButton.addEventListener("click", () => goToSlide(currentIndex - 1));
nextButton.addEventListener("click", () => goToSlide(currentIndex + 1));
overviewButton.addEventListener("click", openOverview);
closeOverviewButton.addEventListener("click", closeOverview);
languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.setLanguage));
});

document.addEventListener("keydown", (event) => {
  if (overview.classList.contains("is-open")) {
    if (event.key === "Escape") closeOverview();
    return;
  }

  if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    goToSlide(currentIndex + 1);
  }

  if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    goToSlide(currentIndex - 1);
  }

  if (event.key === "Home") {
    event.preventDefault();
    goToSlide(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    goToSlide(slides.length - 1);
  }

  if (event.key.toLowerCase() === "o") openOverview();
});

window.addEventListener(
  "wheel",
  () => {
    document.body.classList.add("is-scrolling");
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(
      () => document.body.classList.remove("is-scrolling"),
      180,
    );
  },
  { passive: true },
);
