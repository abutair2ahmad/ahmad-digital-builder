import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { KIND_COLORS, type Life, type MemoryKind } from './life';

/* Layout. One turn around the core is one year of life, so every birthday
   lands on the +x axis (the "birthday line"). Radius grows with age: the core
   is childhood, the rim is old age. Two logarithmic arms of gas and dust are
   painted over the disc so it reads as a galaxy, not a record. */
const R0 = 4.2;
const RK = 62;
const EXP = 0.74;
const ARM_A = 6;
const ARM_B = 0.32;
const TAU = Math.PI * 2;

export const radiusFor = (age: number, span: number) => R0 + RK * Math.pow(Math.max(0, age) / span, EXP);
const angleFor = (age: number) => (age - Math.floor(age)) * TAU;

/* Colour follows real stellar populations: the oldest stars (childhood, at the
   core) burn gold, the youngest (recent weeks, at the edge of the light) burn
   blue-white. Weeks that have not happened are cold and faint. */
const GOLD = new THREE.Color('#FFB257');
const CREAM = new THREE.Color('#FFE4C2');
const ICE = new THREE.Color('#B4D2FF');

function livedColor(u: number, out: THREE.Color): THREE.Color {
  if (u < 0.55) return out.copy(GOLD).lerp(CREAM, u / 0.55);
  return out.copy(CREAM).lerp(ICE, Math.min(1, (u - 0.55) / 0.45));
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rand());
}

function scatter(rand: () => number, out: Float32Array, o: number, min: number, spread: number) {
  const z = rand() * 2 - 1;
  const a = rand() * TAU;
  const s = Math.sqrt(1 - z * z);
  const d = min + rand() * spread;
  out[o] = Math.cos(a) * s * d;
  out[o + 1] = z * d * 0.55;
  out[o + 2] = Math.sin(a) * s * d;
}

const WEEK_VERT = /* glsl */ `
uniform float uTime;
uniform float uForm;
uniform float uIgnite;
uniform float uScale;
uniform float uHover;
uniform float uSelected;
uniform float uFocusYear;
uniform float uPixelRatio;
attribute vec3 aStart;
attribute vec3 aColor;
attribute float aSize;
attribute float aIndex;
attribute float aState;
attribute float aMemory;
attribute float aYear;
attribute float aSeed;
varying vec3 vColor;
varying float vSpike;

void main() {
  float d = clamp(uForm * 1.7 - aSeed * 0.7, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - d, 3.0);
  vec3 p = mix(aStart, position, e);
  float a = (1.0 - e) * 2.6;
  float c = cos(a);
  float s = sin(a);
  p.xz = mat2(c, s, -s, c) * p.xz;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float since = uIgnite - aIndex;
  float lit = step(0.5, aState) * step(0.0, since);
  float flash = lit * exp(-max(since, 0.0) / 26.0);

  float tw = 0.8 + 0.2 * sin(uTime * (0.7 + aSeed * 2.3) + aSeed * 71.0);
  vec3 col = mix(vec3(0.11, 0.14, 0.25), aColor, lit);
  float size = aSize * mix(0.62, 1.0, lit);
  float glow = mix(0.55, 1.0, lit) * tw;

  if (aMemory > 0.5) {
    col = aColor;
    size = aSize;
    glow = mix(0.6, 1.0, lit) * (0.88 + 0.12 * sin(uTime * 1.3 + aSeed * 20.0));
  }
  if (aState > 1.5) {
    float pulse = 0.5 + 0.5 * sin(uTime * 2.2);
    size *= 1.0 + 0.4 * pulse * lit;
    glow = mix(0.6, 1.25, lit);
  }

  float inYear = 1.0 - step(0.5, abs(aYear - uFocusYear));
  float hot = max(1.0 - step(0.5, abs(aIndex - uHover)), 1.0 - step(0.5, abs(aIndex - uSelected)));
  glow *= 1.0 + inYear * 0.7 + hot * 1.2;
  size *= 1.0 + inYear * 0.25 + hot * 1.1 + flash * 2.4;
  col += flash * vec3(1.0, 0.85, 0.6);

  // Close up, sprites grow slower than perspective would make them, so a
  // zoomed-in view stays a field of stars instead of a wall of discs.
  float px = size * uScale / -mv.z;
  float knee = 12.0 * uPixelRatio;
  px = px < knee ? px : knee + (px - knee) * 0.28;
  vColor = col * glow;
  vSpike = aMemory;
  gl_PointSize = clamp(px, 1.6, 72.0 * uPixelRatio);
}
`;

const WEEK_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vSpike;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float i = exp(-r2 * 18.0) + exp(-r2 * 5.0) * 0.12;
  if (vSpike > 0.5) {
    float sx = exp(-abs(uv.y) * 34.0) * (1.0 - abs(uv.x));
    float sy = exp(-abs(uv.x) * 34.0) * (1.0 - abs(uv.y));
    i = exp(-r2 * 26.0) * 1.3 + exp(-r2 * 6.0) * 0.22 + (sx + sy) * 0.8;
  }
  i *= 1.0 - smoothstep(0.72, 1.0, sqrt(r2));
  gl_FragColor = vec4(vColor * i, 1.0);
}
`;

const DUST_VERT = /* glsl */ `
uniform float uForm;
uniform float uScale;
attribute vec3 aStart;
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;
varying vec3 vColor;

void main() {
  float d = clamp(uForm * 1.5 - aSeed * 0.5, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - d, 3.0);
  vec3 p = mix(aStart, position, e);
  float a = (1.0 - e) * 3.2;
  float c = cos(a);
  float s = sin(a);
  p.xz = mat2(c, s, -s, c) * p.xz;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vColor = aColor * (0.25 + 0.75 * e);
  gl_PointSize = clamp(aSize * uScale / -mv.z, 0.8, 320.0);
}
`;

const DUST_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  gl_FragColor = vec4(vColor * exp(-r2 * 3.4) * (1.0 - r2), 1.0);
}
`;

const SKY_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio;
  vColor = aColor * (0.7 + 0.3 * sin(uTime * (0.3 + aSeed) + aSeed * 50.0));
}
`;

const SKY_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  gl_FragColor = vec4(vColor * (1.0 - r2), 1.0);
}
`;

export interface Projected {
  x: number;
  y: number;
  visible: boolean;
  dist: number;
}

export interface MemoryMark {
  week: number;
  kind: MemoryKind;
}

const pointsMaterial = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

export class Galaxy {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);
  readonly controls: OrbitControls;
  readonly reduced: boolean;

  life: Life | null = null;
  positions = new Float32Array(0);
  introDone = true;
  allowAutoRotate = true;
  onIntroDone: (() => void) | null = null;
  onFrame: (() => void) | null = null;
  onUserMove: (() => void) | null = null;

  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private u = {
    uTime: { value: 0 },
    uForm: { value: 1 },
    uIgnite: { value: 1e7 },
    uScale: { value: 600 },
    uHover: { value: -1 },
    uSelected: { value: -1 },
    uFocusYear: { value: -100 },
    uPixelRatio: { value: 1 },
  };
  private weekMat: THREE.ShaderMaterial;
  private weekGeo: THREE.BufferGeometry | null = null;
  private weekPts: THREE.Points | null = null;
  private baseColor = new Float32Array(0);
  private baseSize = new Float32Array(0);
  private guides = new THREE.Group();
  private links = new THREE.Group();
  private introAt = 0;
  private last = performance.now();
  private idleSince = performance.now();
  private rig: { target: THREE.Vector3 | null; dist: number | null } = { target: null, dist: null };
  private shift = { x: 0, y: 0, tx: 0, ty: 0 };
  private size = { w: 1, h: 1 };
  private hover = -1;
  private selected = -1;
  private tmp = new THREE.Vector3();
  private mat = new THREE.Matrix4();

  static supported(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  constructor(canvas: HTMLCanvasElement, opts: { reduced: boolean; mobile: boolean }) {
    this.reduced = opts.reduced;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.6 : 2));
    this.renderer.setClearColor(0x05060a, 1);
    this.u.uPixelRatio.value = this.renderer.getPixelRatio();

    this.camera.position.set(0, 96, 115);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 520;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.autoRotateSpeed = 0.28;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('start', () => {
      this.rig.target = null;
      this.rig.dist = null;
      this.idleSince = Infinity;
      this.onUserMove?.();
    });
    this.controls.addEventListener('end', () => {
      this.idleSince = performance.now();
    });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.32, 0.1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.weekMat = pointsMaterial(WEEK_VERT, WEEK_FRAG, this.u);
    this.scene.add(this.buildSky(opts.mobile));
    this.scene.add(this.buildDust(opts.mobile));
    this.scene.add(this.guides, this.links);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.tick());
  }

  /* ---------- building ---------- */

  setLife(life: Life, marks: MemoryMark[], intro: boolean): void {
    this.life = life;
    if (this.weekPts) {
      this.scene.remove(this.weekPts);
      this.weekGeo?.dispose();
    }

    const n = life.total;
    const pos = new Float32Array(n * 3);
    const start = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const idx = new Float32Array(n);
    const state = new Float32Array(n);
    const mem = new Float32Array(n);
    const year = new Float32Array(n);
    const seed = new Float32Array(n);
    const rand = mulberry32(Math.floor(life.birth / 86_400_000) + 17);
    const nowAge = Math.max(0.5, life.ages[life.nowIndex]);
    const c = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const age = life.ages[i];
      const r = radiusFor(age, life.span);
      const th = angleFor(age);
      const gap = (RK * EXP * Math.pow(Math.max(age, 0.5) / life.span, EXP - 1)) / life.span;
      const rr = r + (rand() - 0.5) * gap * 0.55;
      const y = gauss(rand) * (0.12 + 1.5 * Math.exp(-r / 6));
      pos[i * 3] = rr * Math.cos(th);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = -rr * Math.sin(th);
      scatter(rand, start, i * 3, 70, 160);

      // star size follows the gap to its neighbour on the same orbit, so the core never melts into one blob
      const arm = Math.pow(0.5 + 0.5 * Math.cos(2 * (th - Math.log(Math.max(r, ARM_A) / ARM_A) / ARM_B)), 2);
      const along = (TAU * r) / 52;
      size[i] = Math.min(1.35, Math.max(0.42, along * 0.9)) * (0.85 + 0.4 * arm);
      idx[i] = i;
      year[i] = life.years[i];
      seed[i] = 0.82 * (i / n) + 0.18 * rand();
      state[i] = i < life.nowIndex ? 1 : i === life.nowIndex ? 2 : 0;

      if (i === life.nowIndex) {
        c.setRGB(1.5, 1.5, 1.6);
        size[i] = 2.6;
      } else {
        livedColor(age / nowAge, c).multiplyScalar(0.62 + 0.3 * Math.min(1, r / 14));
      }
      c.toArray(col, i * 3);
    }
    this.positions = pos;
    this.baseColor = col.slice();
    this.baseSize = size.slice();

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aIndex', new THREE.BufferAttribute(idx, 1));
    g.setAttribute('aState', new THREE.BufferAttribute(state, 1));
    g.setAttribute('aMemory', new THREE.BufferAttribute(mem, 1));
    g.setAttribute('aYear', new THREE.BufferAttribute(year, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400);
    this.weekGeo = g;
    this.weekPts = new THREE.Points(g, this.weekMat);
    this.weekPts.frustumCulled = false;
    this.scene.add(this.weekPts);

    this.buildGuides(life);
    this.setMemories(marks);
    this.hover = -1;
    this.selected = -1;
    this.syncFocus();

    if (intro && !this.reduced) {
      this.introAt = performance.now();
      this.introDone = false;
      this.u.uForm.value = 0;
      this.u.uIgnite.value = -1;
      this.setGuideOpacity(0);
    } else {
      this.finishIntro();
    }
  }

  setMemories(marks: MemoryMark[]): void {
    const g = this.weekGeo;
    const life = this.life;
    if (!g || !life) return;
    const col = g.getAttribute('aColor') as THREE.BufferAttribute;
    const size = g.getAttribute('aSize') as THREE.BufferAttribute;
    const mem = g.getAttribute('aMemory') as THREE.BufferAttribute;
    (col.array as Float32Array).set(this.baseColor);
    (size.array as Float32Array).set(this.baseSize);
    (mem.array as Float32Array).fill(0);

    const c = new THREE.Color();
    for (const m of marks) {
      if (m.week < 0 || m.week >= life.total) continue;
      c.set(KIND_COLORS[m.kind]).multiplyScalar(1.25);
      c.toArray(col.array as Float32Array, m.week * 3);
      (size.array as Float32Array)[m.week] = m.week === life.nowIndex ? 3.4 : 3.6;
      (mem.array as Float32Array)[m.week] = 1;
    }
    col.needsUpdate = true;
    size.needsUpdate = true;
    mem.needsUpdate = true;
    this.buildLinks(marks.map((m) => m.week).sort((a, b) => a - b));
  }

  private buildGuides(life: Life): void {
    for (const child of [...this.guides.children]) {
      const line = child as THREE.Line;
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      this.guides.remove(line);
    }
    const ringMat = () =>
      new THREE.LineBasicMaterial({ color: 0xf2b866, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let age = 10; age <= life.span; age += 10) {
      const r = radiusFor(age, life.span);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 256; k++) {
        const a = (k / 256) * TAU;
        pts.push(new THREE.Vector3(r * Math.cos(a), 0, -r * Math.sin(a)));
      }
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat());
      ring.userData.base = age === life.span ? 0.05 : 0.1;
      this.guides.add(ring);
    }
    const meridian = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(R0 * 0.6, 0, 0),
        new THREE.Vector3(radiusFor(life.span, life.span) + 3, 0, 0),
      ]),
      ringMat(),
    );
    meridian.userData.base = 0.32;
    this.guides.add(meridian);
    this.setGuideOpacity(1);
  }

  private setGuideOpacity(k: number): void {
    for (const child of this.guides.children) {
      const m = (child as THREE.Line).material as THREE.LineBasicMaterial;
      m.opacity = (child.userData.base as number) * k;
    }
    this.links.visible = k > 0.01;
  }

  private buildLinks(weeks: number[]): void {
    for (const child of [...this.links.children]) {
      const line = child as THREE.Line;
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      this.links.remove(line);
    }
    const life = this.life;
    if (!life || weeks.length === 0) return;
    const at = (i: number) => new THREE.Vector3(this.positions[i * 3], this.positions[i * 3 + 1], this.positions[i * 3 + 2]);
    const past = weeks.filter((w) => w < life.nowIndex);
    const future = weeks.filter((w) => w > life.nowIndex);

    if (past.length) {
      const pts = [...past, life.nowIndex].map(at);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xf2b866, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      this.links.add(line);
    }
    if (future.length) {
      const pts = [life.nowIndex, ...future].map(at);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: 0x9dbbff, dashSize: 1.1, gapSize: 0.9, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      line.computeLineDistances();
      this.links.add(line);
    }
  }

  private buildDust(mobile: boolean): THREE.Points {
    const dust = mobile ? 14_000 : 32_000;
    const neb = mobile ? 55 : 95;
    const n = dust + neb;
    const rand = mulberry32(7);
    const pos = new Float32Array(n * 3);
    const start = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    const warm = new THREE.Color('#FFB46A');
    const rose = new THREE.Color('#E0789F');
    const violet = new THREE.Color('#8E7BFF');
    const teal = new THREE.Color('#4CB8D8');
    const haze = new THREE.Color('#8F9BC4');
    const c = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const isNeb = i >= dust;
      const roll = rand();
      let r: number;
      let th: number;
      let y: number;
      if (!isNeb && roll < 0.16) {
        r = Math.abs(gauss(rand)) * 6.5;
        th = rand() * TAU;
        y = gauss(rand) * 2.6 * Math.exp(-r / 9);
        c.copy(warm).multiplyScalar(0.04 + rand() * 0.07);
        size[i] = 0.35 + rand() * 0.7;
      } else if (isNeb || roll < 0.8) {
        const arm = rand() < 0.5 ? 0 : Math.PI;
        r = isNeb ? ARM_A + 6 + rand() * 58 : ARM_A + Math.pow(rand(), 0.85) * 78;
        th = Math.log(r / ARM_A) / ARM_B + arm + gauss(rand) * (0.22 + r / 260);
        y = gauss(rand) * (0.5 + 0.8 * Math.exp(-r / 14));
        const m = rand();
        c.copy(m < 0.4 ? rose : m < 0.75 ? violet : teal).lerp(warm, Math.exp(-r / 12));
        if (isNeb) {
          c.multiplyScalar(0.008 + rand() * 0.012);
          size[i] = 10 + rand() * 18;
        } else {
          c.multiplyScalar(0.03 + rand() * 0.08);
          size[i] = 0.3 + rand() * 0.9;
        }
      } else {
        r = Math.sqrt(rand()) * 82;
        th = rand() * TAU;
        y = gauss(rand) * 0.7;
        c.copy(haze).multiplyScalar(0.02 + rand() * 0.04);
        size[i] = 0.3 + rand() * 0.6;
      }
      pos[i * 3] = r * Math.cos(th);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = -r * Math.sin(th);
      scatter(rand, start, i * 3, 90, 200);
      c.toArray(col, i * 3);
      seed[i] = Math.min(1, r / 85) * 0.8 + rand() * 0.2;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(g, pointsMaterial(DUST_VERT, DUST_FRAG, this.u));
    pts.frustumCulled = false;
    return pts;
  }

  private buildSky(mobile: boolean): THREE.Points {
    const n = mobile ? 1600 : 2800;
    const rand = mulberry32(3);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    const c = new THREE.Color();
    const tints = ['#FFFFFF', '#CFE0FF', '#FFE2C4', '#FFD0D8'];
    for (let i = 0; i < n; i++) {
      const z = rand() * 2 - 1;
      const a = rand() * TAU;
      const s = Math.sqrt(1 - z * z);
      pos[i * 3] = Math.cos(a) * s * 1800;
      pos[i * 3 + 1] = z * 1800;
      pos[i * 3 + 2] = Math.sin(a) * s * 1800;
      c.set(tints[Math.floor(rand() * tints.length)]).multiplyScalar(0.15 + Math.pow(rand(), 3) * 0.75);
      c.toArray(col, i * 3);
      size[i] = 1.2 + Math.pow(rand(), 4) * 2.6;
      seed[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(g, pointsMaterial(SKY_VERT, SKY_FRAG, this.u));
    pts.frustumCulled = false;
    return pts;
  }

  /* ---------- state from the UI ---------- */

  setHover(i: number): void {
    this.hover = i;
    this.syncFocus();
  }

  setSelected(i: number): void {
    this.selected = i;
    this.syncFocus();
  }

  private syncFocus(): void {
    this.u.uHover.value = this.hover;
    this.u.uSelected.value = this.selected;
    const life = this.life;
    const f = this.hover >= 0 ? this.hover : this.selected;
    this.u.uFocusYear.value = life && f >= 0 ? life.years[f] : -100;
  }

  /** Moves the drawn picture by (dx, dy) CSS pixels so panels never cover the subject. */
  setShift(dx: number, dy: number): void {
    this.shift.tx = dx;
    this.shift.ty = dy;
  }

  finishIntro(): void {
    this.u.uForm.value = 1;
    this.u.uIgnite.value = 1e7;
    this.setGuideOpacity(1);
    if (!this.introDone) {
      this.introDone = true;
      this.onIntroDone?.();
    }
  }

  /** Number of weeks lit so far, for the counter that runs with the intro. */
  get ignited(): number {
    const life = this.life;
    if (!life) return 0;
    return Math.max(0, Math.min(life.nowIndex + 1, Math.floor(this.u.uIgnite.value) + 1));
  }

  overviewDistance(): number {
    const span = this.life?.span ?? 90;
    const r = radiusFor(span, span);
    const aspect = this.size.w / this.size.h;
    return (r * 1.9) / Math.max(0.55, Math.min(aspect, 1));
  }

  flyTo(i: number, dist = 15): void {
    if (i < 0 || i * 3 >= this.positions.length) return;
    this.rig.target = new THREE.Vector3(this.positions[i * 3], this.positions[i * 3 + 1], this.positions[i * 3 + 2]);
    this.rig.dist = dist;
    this.idleSince = performance.now();
  }

  flyHome(): void {
    this.rig.target = new THREE.Vector3();
    this.rig.dist = this.overviewDistance();
    this.idleSince = performance.now();
  }

  /** Places the camera for the first view without animation. */
  frameHome(): void {
    const d = this.overviewDistance();
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, Math.cos(0.88) * d, Math.sin(0.88) * d);
    this.controls.update();
  }

  /* ---------- reading the picture ---------- */

  project(i: number, out: Projected): Projected {
    this.tmp.set(this.positions[i * 3], this.positions[i * 3 + 1], this.positions[i * 3 + 2]);
    return this.projectPoint(this.tmp, out);
  }

  projectPoint(p: THREE.Vector3, out: Projected): Projected {
    out.dist = p.distanceTo(this.camera.position);
    this.tmp.copy(p).project(this.camera);
    out.visible = this.tmp.z > -1 && this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.15 && Math.abs(this.tmp.y) < 1.15;
    out.x = ((this.tmp.x + 1) / 2) * this.size.w;
    out.y = ((1 - this.tmp.y) / 2) * this.size.h;
    return out;
  }

  /** Nearest star to a screen point, within `radius` CSS pixels. Memories and "now" are easier to hit. */
  pick(clientX: number, clientY: number, radius: number, special: Set<number>): number {
    const life = this.life;
    if (!life || !this.introDone) return -1;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const e = this.mat.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse).elements;
    const p = this.positions;
    const { w, h } = this.size;
    let best = -1;
    let bestD = radius * radius;
    for (let i = 0; i < life.total; i++) {
      const px = p[i * 3];
      const py = p[i * 3 + 1];
      const pz = p[i * 3 + 2];
      const cw = e[3] * px + e[7] * py + e[11] * pz + e[15];
      if (cw <= 0.1) continue;
      const sx = ((e[0] * px + e[4] * py + e[8] * pz + e[12]) / cw + 1) * 0.5 * w;
      const sy = (1 - (e[1] * px + e[5] * py + e[9] * pz + e[13]) / cw) * 0.5 * h;
      let d = (sx - x) * (sx - x) + (sy - y) * (sy - y);
      if (special.has(i) || i === life.nowIndex) d *= 0.35;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  /** A framed, label-free picture of the whole galaxy for the poster. */
  snapshot(): HTMLCanvasElement {
    this.finishIntro();
    const cam = this.camera;
    const savedPos = cam.position.clone();
    const savedTarget = this.controls.target.clone();
    const savedHover = this.u.uHover.value;
    const savedSel = this.u.uSelected.value;
    const savedYear = this.u.uFocusYear.value;
    this.u.uHover.value = -1;
    this.u.uSelected.value = -1;
    this.u.uFocusYear.value = -100;
    cam.clearViewOffset();

    // Frame the lit part of the life generously; the faint future stays at the edges.
    const life = this.life;
    const span = life?.span ?? 90;
    const full = radiusFor(span, span) + 6;
    const lit = life ? radiusFor(life.ages[life.nowIndex], span) : full;
    const r = Math.min(full, Math.max(28, lit * 1.65));
    const aspect = this.size.w / this.size.h;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = r / (tan * Math.min(aspect, 0.96));
    const az = Math.atan2(savedPos.x - savedTarget.x, savedPos.z - savedTarget.z);
    const polar = 0.62;
    cam.position.set(Math.sin(az) * Math.sin(polar) * dist, Math.cos(polar) * dist, Math.cos(az) * Math.sin(polar) * dist);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    this.composer.render(0);

    const out = document.createElement('canvas');
    out.width = this.renderer.domElement.width;
    out.height = this.renderer.domElement.height;
    out.getContext('2d')?.drawImage(this.renderer.domElement, 0, 0);

    cam.position.copy(savedPos);
    this.controls.target.copy(savedTarget);
    this.u.uHover.value = savedHover;
    this.u.uSelected.value = savedSel;
    this.u.uFocusYear.value = savedYear;
    this.controls.update();
    return out;
  }

  /* ---------- loop ---------- */

  resize(): void {
    const canvas = this.renderer.domElement;
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio();
    this.u.uScale.value = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.u.uPixelRatio.value = pr;
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.u.uTime.value = now / 1000;

    if (!this.introDone && this.life) {
      const e = (now - this.introAt) / 1000;
      this.u.uForm.value = Math.min(1, e / 3);
      const k = Math.min(1, Math.max(0, (e - 1.7) / 3.6));
      const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.u.uIgnite.value = this.life.nowIndex * eased - 1 + (k >= 1 ? (e - 5.3) * 600 : 0);
      this.setGuideOpacity(Math.min(1, Math.max(0, (e - 3) / 1.5)));
      if (e > 6.6) this.finishIntro();
    }

    const follow = this.reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    if (this.rig.target) {
      const delta = this.tmp.copy(this.rig.target).sub(this.controls.target).multiplyScalar(follow);
      this.controls.target.add(delta);
      this.camera.position.add(delta);
      if (this.rig.target.distanceToSquared(this.controls.target) < 1e-4) this.rig.target = null;
    }
    if (this.rig.dist !== null) {
      const off = this.tmp.copy(this.camera.position).sub(this.controls.target);
      const len = off.length();
      const next = len + (this.rig.dist - len) * follow;
      this.camera.position.copy(this.controls.target).add(off.setLength(next));
      if (Math.abs(next - this.rig.dist) < 0.05) this.rig.dist = null;
    }

    const sk = this.reduced ? 1 : 1 - Math.exp(-dt * 4);
    this.shift.x += (this.shift.tx - this.shift.x) * sk;
    this.shift.y += (this.shift.ty - this.shift.y) * sk;
    if (Math.abs(this.shift.x) > 0.5 || Math.abs(this.shift.y) > 0.5) {
      this.camera.setViewOffset(this.size.w, this.size.h, -this.shift.x, -this.shift.y, this.size.w, this.size.h);
    } else if (this.camera.view?.enabled) {
      this.camera.clearViewOffset();
    }

    this.controls.autoRotate =
      this.allowAutoRotate && this.introDone && !this.reduced && !this.rig.target && now - this.idleSince > 7000;
    this.controls.update(dt);
    this.camera.updateMatrixWorld();
    this.onFrame?.();
    this.composer.render(dt);
  }
}
