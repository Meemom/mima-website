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

/* ───────────── Star stickers ─────────────
   Foil star stickers are scattered at random on every visit, keeping clear
   of the name and photo. Each one has a depth: nearer (bigger) stars shift
   more with the cursor, so the page feels layered. Their foil glint and the
   light on the paper follow the cursor too.                              */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.querySelector(".hero");
const starLayer = document.getElementById("stars");
const paper = document.querySelector(".hero__paper");
const light = document.getElementById("heroLight");
let stars = [];

function scatterStars() {
  starLayer.innerHTML = "";
  stars = [];
  const w = hero.clientWidth, h = hero.clientHeight;
  const box = document.getElementById("heroContent").getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  const pad = 26;
  const keepOut = {                     // area around the name + photo
    l: box.left - hr.left - pad, r: box.right - hr.left + pad,
    t: box.top - hr.top - pad,   b: box.bottom - hr.top + pad,
  };
  const count = Math.round(Math.min(22, Math.max(9, (w * h) / 55000)));
  const placed = [];
  let tries = 0;
  while (placed.length < count && tries < 2000) {
    tries++;
    const depth = Math.random();                       // 0 = far, 1 = near
    const size = Math.round(20 + Math.pow(depth, 1.5) * 46 + Math.random() * 8);
    const x = size / 2 + Math.random() * (w - size);
    const y = size / 2 + Math.random() * (h * 0.86 - size);   // stay above the dark fade
    if (x > keepOut.l - size / 2 && x < keepOut.r + size / 2 &&
        y > keepOut.t - size / 2 && y < keepOut.b + size / 2) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.size + size) * 0.75 + 14)) continue;
    placed.push({ x, y, size, depth });
  }

  for (const p of placed) {
    const el = document.createElement("span");
    el.className = "star" + (Math.random() < 0.3 ? " star--holo" : "");
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    el.style.setProperty("--s", `${p.size}px`);
    el.style.setProperty("--hue", `${Math.round(Math.random() * 360)}deg`);
    el.style.setProperty("--streak", `${Math.round(40 + Math.random() * 40)}deg`);
    el.innerHTML = '<span class="star__foil"></span>';
    starLayer.appendChild(el);
    stars.push({
      el, depth: p.depth,
      rot: Math.random() * 72 - 36,
      spin: (Math.random() - 0.5) * 14,
      shine: Math.random() * 100,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

let target = { x: 0, y: 0 };   // pointer position, -1..1
let pointerActive = false;
hero.addEventListener("pointermove", (e) => {
  const r = hero.getBoundingClientRect();
  target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  pointerActive = true;
});
hero.addEventListener("pointerleave", () => { pointerActive = false; });

const smooth = { x: 0, y: 0 };
let heroVisible = true;

function render(time) {
  for (const s of stars) {
    const reach = 8 + s.depth * 42;                    // px of travel
    const bob = reduceMotion ? 0 : Math.sin(time * 0.6 + s.phase) * (1 + s.depth * 2);
    const dx = smooth.x * reach;
    const dy = smooth.y * reach + bob;
    const rot = s.rot + smooth.x * s.spin;
    s.el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg)`;
    s.el.style.setProperty("--shine", `${(s.shine + smooth.x * 60 + smooth.y * 25).toFixed(1)}%`);
  }
  paper.style.transform = `translate3d(${(smooth.x * -6).toFixed(1)}px, ${(smooth.y * -6).toFixed(1)}px, 0)`;
  light.style.setProperty("--lx", `${((smooth.x + 1) * 50).toFixed(1)}%`);
  light.style.setProperty("--ly", `${((smooth.y + 1) * 50).toFixed(1)}%`);
}

function frame(t) {
  if (heroVisible) {
    const time = t / 1000;
    // no pointer (touch screens, or the cursor left): drift gently
    const tx = pointerActive ? target.x : Math.sin(time * 0.22) * 0.45;
    const ty = pointerActive ? target.y : Math.cos(time * 0.17) * 0.35;
    smooth.x += (tx - smooth.x) * 0.06;
    smooth.y += (ty - smooth.y) * 0.06;
    render(time);
  }
  requestAnimationFrame(frame);
}

function setup() {
  scatterStars();
  render(0);
}
// wait for fonts so the name's size is final before keeping stars clear of it
(document.fonts ? document.fonts.ready : Promise.resolve()).then(setup);

let lastW = window.innerWidth;
window.addEventListener("resize", () => {
  clearTimeout(setup.t);
  setup.t = setTimeout(() => {
    if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; setup(); }
  }, 200);
});

if (!reduceMotion) {
  requestAnimationFrame(frame);
  new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(hero);
}

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
