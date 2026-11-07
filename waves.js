/* ───────────── Halftone waves (WebGL) ─────────────
   A lit halftone surface: a grid of dots whose size follows the light on a
   slowly folding "silk" surface. Moving the cursor drags ripples through it
   and clicking drops a bigger splash. Inspired by React Bits' Pattern Waves,
   written from scratch with no libraries.

   If WebGL isn't available, the CSS halftone in styles.css shows instead.

   Tweak these: */
const WAVES = {
  spacing: 11,          // grid spacing in CSS px
  markSize: 0.95,       // biggest dot as a fraction of a cell
  speed: 0.35,          // drift speed of the silk folds
  heading: 20,          // direction the folds travel, in degrees
  depth: 0.95,          // how strongly the folds catch the light
  shine: 0.8,           // strength of the bright glints
  contrast: 1.5,
  rippleStrength: 1.0,  // cursor ripples
  color: [250, 197, 244],   // dot colour (pink)
  accent: [255, 240, 252],  // glint colour
};

(function halftoneWaves() {
  const host = document.getElementById("halftone");
  const hero = document.querySelector(".hero");
  if (!host || !hero) return;

  const canvas = document.createElement("canvas");
  canvas.className = "halftone__gl";
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return;                                   // keep the CSS fallback
  host.appendChild(canvas);

  const TRAIL = 24;
  const vert = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

  const frag = `
precision highp float;
uniform vec2  uRes;       // canvas size in device px
uniform float uDpr;
uniform float uTime;      // silk clock (scaled by speed)
uniform float uClock;     // real seconds, for ripples
uniform float uSpacing;
uniform float uMark;
uniform vec2  uHeading;
uniform float uDepth;
uniform float uShine;
uniform float uContrast;
uniform float uRipple;
uniform vec3  uColor;
uniform vec3  uAccent;
uniform float uAppear;
uniform vec3  uMouse;     // xy in css px, z = hover amount 0..1
uniform vec4  uTrail[${TRAIL}];  // x, y, start time, strength

const float UNIT = 520.0;

float silk(vec2 css, float t) {
  vec2 size = uRes / uDpr;
  vec2 q = (css - 0.5 * size) / UNIT;
  vec2 side = vec2(-uHeading.y, uHeading.x);
  float u = dot(q, uHeading);
  float v = dot(q, side);
  float bend = 0.9 * sin(v * 1.7 + t * 0.15) + 0.55 * sin(v * 3.1 - u * 1.3 + t * 0.11) + 0.4 * sin(v * 1.6 + t * 0.2);
  float phase = u * 5.5 + bend - t * 0.45;
  float swell = 0.65 + 0.35 * sin(u * 1.3 + v * 0.9 + t * 0.07);
  float fold = sin(phase) + 0.32 * sin(2.0 * phase + 1.3);
  float fine = 0.16 * sin(u * 13.75 + bend * 1.9 - t * 0.9 + 2.1);
  return (fold + fine) * swell;
}

float ripples(vec2 css) {
  float h = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec4 tr = uTrail[i];
    float age = uClock - tr.z;
    if (tr.w <= 0.0 || age < 0.0 || age > 3.5) continue;
    float d = distance(css, tr.xy);
    float x = d - age * 240.0;                    // expanding ring
    float ring = sin(x * 0.05) * exp(-x * x / 9000.0);
    h += ring * exp(-age * 1.3) * tr.w;
  }
  // a soft swell that follows the cursor
  float m = distance(css, uMouse.xy);
  h += 0.9 * uMouse.z * exp(-m * m / 18000.0);
  return h * uRipple;
}

float heightAt(vec2 css) { return silk(css, uTime) + ripples(css); }

void main() {
  vec2 css = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 cell = floor(css / uSpacing);
  vec2 c = (cell + 0.5) * uSpacing;
  vec2 local = css - c;

  // light the surface at the cell centre
  float e = uSpacing;
  float h  = heightAt(c);
  float hx = heightAt(c + vec2(e, 0.0)) - h;
  float hy = heightAt(c + vec2(0.0, e)) - h;
  vec2 grad = vec2(hx, hy) / e * UNIT * uDepth * 0.4;
  vec3 n = normalize(vec3(-grad, 1.0));
  vec3 light = normalize(vec3(-0.35, 0.55, 0.75));
  float diffuse = clamp(dot(n, light), 0.0, 1.0);
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, halfway), 0.0, 1.0), 120.0) * uShine;
  float hollow = 0.7 + 0.3 * clamp(h * 0.5 + 0.5, 0.0, 1.0);
  float tone = clamp(diffuse * hollow * 0.8 + spec, 0.0, 1.0);
  tone = clamp((tone - 0.42) * uContrast + 0.42, 0.0, 1.0);
  float level = pow(tone, 2.2);

  // intro: dots grow outward from the centre
  vec2 size = uRes / uDpr;
  float reach = length(c - 0.5 * size) / (0.5 * length(size));
  float appear = smoothstep(reach - 0.05, reach + 0.3, uAppear * 1.35);

  float r = 0.5 * uSpacing * uMark * sqrt(level) * appear;
  float aa = 0.8 / uDpr;
  float dotMask = 1.0 - smoothstep(r - aa, r + aa, length(local));
  float a = dotMask * (0.3 + 0.7 * level);
  vec3 col = mix(uColor, uAccent, clamp(spec * 1.6, 0.0, 1.0));
  gl_FragColor = vec4(col * a, a);
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vert), fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ["uRes", "uDpr", "uTime", "uClock", "uSpacing", "uMark", "uHeading", "uDepth", "uShine", "uContrast",
   "uRipple", "uColor", "uAccent", "uAppear", "uMouse", "uTrail"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  const rad = (WAVES.heading * Math.PI) / 180;
  gl.uniform1f(U.uSpacing, WAVES.spacing);
  gl.uniform1f(U.uMark, WAVES.markSize);
  gl.uniform2f(U.uHeading, Math.cos(rad), Math.sin(rad));
  gl.uniform1f(U.uDepth, WAVES.depth);
  gl.uniform1f(U.uShine, WAVES.shine);
  gl.uniform1f(U.uContrast, WAVES.contrast);
  gl.uniform1f(U.uRipple, WAVES.rippleStrength);
  gl.uniform3f(U.uColor, ...WAVES.color.map((v) => v / 255));
  gl.uniform3f(U.uAccent, ...WAVES.accent.map((v) => v / 255));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // cap to keep it light
    const w = host.clientWidth, h = host.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uDpr, dpr);
  }
  resize();
  new ResizeObserver(resize).observe(host);

  // pointer → ripple trail
  const trail = new Float32Array(TRAIL * 4);
  let head = 0, last = null;
  const mouse = { x: 0, y: 0, hover: 0, target: 0 };
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  function addRipple(x, y, strength) {
    trail.set([x, y, now(), strength], head * 4);
    head = (head + 1) % TRAIL;
  }
  hero.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    mouse.x = x; mouse.y = y; mouse.target = 1;
    const t = now();
    if (!last || Math.hypot(x - last.x, y - last.y) > 36 || t - last.t > 0.12) {
      const speed = last ? Math.min(Math.hypot(x - last.x, y - last.y) / Math.max(t - last.t, 0.016) / 900, 1) : 0.3;
      addRipple(x, y, 0.35 + 0.65 * speed);
      last = { x, y, t };
    }
  });
  hero.addEventListener("pointerleave", () => { mouse.target = 0; last = null; });
  hero.addEventListener("pointerdown", (e) => {
    const r = host.getBoundingClientRect();
    addRipple(e.clientX - r.left, e.clientY - r.top, 2.2);   // a splash
  });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(hero);

  function render() {
    const t = now();
    mouse.hover += (mouse.target - mouse.hover) * 0.08;
    gl.uniform1f(U.uTime, reduce ? 4.0 : t * WAVES.speed / 0.35);
    gl.uniform1f(U.uClock, t);
    gl.uniform1f(U.uAppear, reduce ? 1 : Math.min(t / 2, 1));
    gl.uniform3f(U.uMouse, mouse.x, mouse.y, mouse.hover);
    gl.uniform4fv(U.uTrail, trail);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  host.classList.add("halftone--gl");
  if (reduce) {
    render();
    new ResizeObserver(() => render()).observe(host);
    return;
  }
  (function loop() {
    if (visible) render();
    requestAnimationFrame(loop);
  })();
})();
