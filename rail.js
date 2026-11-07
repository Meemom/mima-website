/* ───────────── Projects album rail ─────────────
   Turns the project list into a fan of record sleeves. The focused sleeve
   sits in front; neighbours tilt, turn away and recede. Drag/swipe, the
   arrow keys, the arrows or the ruler ticks move through them. Clicking
   the focused sleeve opens the project on GitHub. Inspired by React Bits' Album Rail, written from scratch.

   Tweak these: */
const RAIL = {
  fan: 6,          // tilt of neighbours, degrees
  turn: 22,        // how far neighbours turn away, degrees
  depth: 0.5,      // how far neighbours recede
  spread: 0.62,    // gap to first neighbours, as a fraction of cover width
  stack: 0.3,      // gap between outer covers
  visible: 3,      // covers shown on each side
  dim: 0.45,       // how much side covers darken
  autoplay: 4,     // seconds between auto-advances (0 = off)
};

(function albumRail() {
  const rail = document.getElementById("rail");
  if (!rail) return;
  const data = [...rail.querySelectorAll(".rail__item")].map((li, i) => ({
    title: li.querySelector("h3").textContent.trim(),
    desc: li.querySelector("p").textContent.trim(),
    href: li.querySelector("a").href,
    color: li.dataset.color || "pink",
    motif: li.dataset.motif || "dots",
    no: String(i + 1).padStart(2, "0"),
  }));
  const n = data.length;
  if (!n) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* build */
  const stage = document.createElement("div");
  stage.className = "rail__stage";
  const cards = data.map((d, i) => {
    const card = document.createElement("div");
    card.className = `rail__card cover--${d.color}`;
    card.dataset.i = i;
    card.innerHTML = `
      <div class="rail__cover motif--${d.motif}">
        <span class="cover__no">${d.no}</span>
        <span class="cover__artist">jemima silaen</span>
        <span class="cover__title"></span>
      </div>`;
    card.querySelector(".cover__title").textContent = d.title;
    stage.appendChild(card);
    return card;
  });

  const caption = document.createElement("div");
  caption.className = "rail__caption";
  caption.setAttribute("aria-live", "polite");
  caption.innerHTML = `
    <h3 class="rail__title"></h3>
    <p class="rail__desc"></p>
    <div class="rail__actions">
      <a class="rail__gh" target="_blank" rel="noopener">GitHub <span aria-hidden="true">↗</span></a>
    </div>`;

  const ruler = document.createElement("div");
  ruler.className = "rail__ruler";
  ruler.innerHTML = `
    <button class="rail__arrow" type="button" data-dir="-1" aria-label="Previous project">‹</button>
    <div class="rail__ticks"></div>
    <button class="rail__arrow" type="button" data-dir="1" aria-label="Next project">›</button>`;
  const ticks = data.map((d, i) => {
    const t = document.createElement("button");
    t.type = "button";
    t.className = "rail__tick";
    t.setAttribute("aria-label", d.title);
    t.addEventListener("click", () => goTo(i));
    ruler.querySelector(".rail__ticks").appendChild(t);
    return t;
  });

  rail.append(stage, caption, ruler);
  rail.classList.add("is-ready");

  /* state */
  let pos = 0;          // where the rail is now (float, unbounded for looping)
  let target = 0;       // where it is heading (integer)
  let active = -1;
  let hovering = false;
  let dragging = false;
  let visible = false;
  const mod = (a, m) => ((a % m) + m) % m;

  function goTo(i) {             // shortest way round to item i
    const cur = mod(Math.round(target), n);
    let d = i - cur;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    target = Math.round(target) + d;
    kick();
  }
  const step = (dir) => { target = Math.round(target) + dir; kick(); };

  const openActive = () => window.open(data[active].href, "_blank", "noopener");

  function updateCaption() {
    const d = data[active];
    caption.classList.remove("is-in");
    void caption.offsetWidth;                         // restart the fade
    caption.querySelector(".rail__title").textContent = d.title;
    caption.querySelector(".rail__desc").textContent = d.desc;
    const gh = caption.querySelector(".rail__gh");
    gh.href = d.href;
    gh.setAttribute("aria-label", `${d.title} on GitHub`);
    caption.classList.add("is-in");
    ticks.forEach((t, i) => t.classList.toggle("is-active", i === active));
  }

  /* layout */
  function layout() {
    const w = cards[0].offsetWidth;
    for (let i = 0; i < n; i++) {
      let k = mod(i - pos + n / 2, n) - n / 2;       // signed offset from focus
      const a = Math.abs(k), s = Math.sign(k), near = Math.min(a, 1);
      const x = s * (RAIL.spread * near + RAIL.stack * Math.max(a - 1, 0)) * w;
      const z = -a * RAIL.depth * w * 0.6;
      const ry = -s * near * RAIL.turn;
      const rz = s * near * RAIL.fan;
      const c = cards[i];
      c.style.transform = `translate3d(${x.toFixed(1)}px, ${(near * w * 0.03).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      c.style.zIndex = String(100 - Math.round(a * 10));
      c.style.setProperty("--shade", (Math.min(a, 1) * RAIL.dim).toFixed(3));
      const hidden = a > RAIL.visible + 0.5;
      c.style.opacity = hidden ? "0" : String(Math.min(1, RAIL.visible + 1 - a));
      c.style.pointerEvents = hidden ? "none" : "";
    }
    const now = mod(Math.round(pos), n);
    if (now !== active) {
      active = now;
      cards.forEach((c, i) => c.classList.toggle("is-active", i === active));
      updateCaption();
    }
  }

  let raf = 0;
  function tick() {
    raf = 0;
    if (!dragging) {
      const d = target - pos;
      pos = reduce || Math.abs(d) < 0.001 ? target : pos + d * 0.14;
    }
    layout();
    if (dragging || pos !== target) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  /* drag / swipe with momentum */
  let startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, moved = false;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = false;
    startX = lastX = e.clientX; startPos = pos; lastT = performance.now(); vel = 0;
    stage.setPointerCapture(e.pointerId);
    kick();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const w = cards[0].offsetWidth * RAIL.spread;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    pos = startPos - dx / w;
    const t = performance.now();
    vel = (e.clientX - lastX) / Math.max(t - lastT, 1);   // px per ms
    lastX = e.clientX; lastT = t;
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    if (!moved && e && e.type === "pointerup") {           // a tap, not a drag
      stage.releasePointerCapture?.(e.pointerId);
      const card = document.elementFromPoint(e.clientX, e.clientY)?.closest(".rail__card");
      if (card) {
        const i = +card.dataset.i;
        if (i === active) openActive();
        else goTo(i);
        return;
      }
    }
    const w = cards[0].offsetWidth * RAIL.spread;
    target = Math.round(pos - (vel * 180) / w);          // fling
    kick();
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  ruler.querySelectorAll(".rail__arrow").forEach((b) => b.addEventListener("click", () => step(+b.dataset.dir)));
  rail.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    else if (e.key === "Enter" && e.target === rail) { openActive(); e.preventDefault(); }
  });
  // sideways trackpad swipes move the rail; normal vertical scrolling is left alone
  let wheelLock = 0;
  stage.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
    e.preventDefault();
    const t = performance.now();
    if (t - wheelLock < 350) return;
    wheelLock = t;
    step(e.deltaX > 0 ? 1 : -1);
  }, { passive: false });

  /* autoplay: pauses while hovered, dragged or off-screen */
  rail.addEventListener("pointerenter", () => (hovering = true));
  rail.addEventListener("pointerleave", () => (hovering = false));
  new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.4 }).observe(rail);
  if (RAIL.autoplay > 0 && !reduce) {
    setInterval(() => {
      if (visible && !hovering && !dragging && document.activeElement !== rail) step(1);
    }, RAIL.autoplay * 1000);
  }

  window.addEventListener("resize", kick);
  layout();
})();
