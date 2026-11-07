document.documentElement.classList.remove("no-js");

/* ───────────── Tag colours ─────────────
   Each tag's colour comes from this list. Anything not listed is "web".
   ml = pink · sys = mint · data = yellow · web = lavender                */
const TAG_CATEGORY = {
  // ML & AI
  "PyTorch": "ml", "Transformers": "ml", "scikit-learn": "ml", "XGBoost": "ml", "BERTopic": "ml",
  "Sparse Attention": "ml", "Long-Context Modeling": "ml", "Computer Vision": "ml",
  "Active Perception": "ml", "Imitation Learning": "ml", "Knowledge Distillation": "ml", "DAgger": "ml",
  // Systems & GPU
  "C/C++": "sys", "Java": "sys", "Bash/Shell": "sys", "CUDA": "sys", "ONNX": "sys",
  "Linux/Unix": "sys", "CMake": "sys", "SLURM": "sys", "LLM Inference": "sys",
  // Data
  "Python": "data", "SQL": "data", "PySpark": "data", "NumPy": "data", "pandas": "data",
  "Databricks": "data", "PostgreSQL": "data",
};

document.querySelectorAll(".tag").forEach((el) => {
  const cat = TAG_CATEGORY[el.textContent.trim()] || "web";
  el.classList.add(`tag--${cat}`);
});

/* ───────────── GitHub icons on project cards ───────────── */
const GH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"/></svg>';
document.querySelectorAll(".gh").forEach((a) => (a.innerHTML = GH_ICON));

document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.querySelector(".hero");

/* ───────────── Scroll: fade title page into the dark base ───────────── */
const shade = document.getElementById("heroShade");
const content = document.getElementById("heroContent");
const nav = document.getElementById("nav");

function onScroll() {
  const h = hero.offsetHeight;
  const p = Math.min(Math.max(window.scrollY / h, 0), 1);
  shade.style.opacity = (p * 0.95).toFixed(3);
  if (!reduceMotion) {
    content.style.transform = `translateY(${(p * 90).toFixed(1)}px) scale(${(1 - p * 0.06).toFixed(3)})`;
  }
  content.style.opacity = Math.max(1 - p * 1.4, 0).toFixed(3);
  nav.classList.toggle("is-visible", window.scrollY > h * 0.75);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ───────────── Reveal sections + highlight current nav link ───────────── */
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); revealer.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

const links = [...document.querySelectorAll(".nav__links a")];
const sectionSpy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main .section").forEach((s) => sectionSpy.observe(s));
