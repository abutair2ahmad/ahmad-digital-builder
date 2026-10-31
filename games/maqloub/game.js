import * as THREE from './vendor/three.module.js';
import { LEVELS } from './levels.js';

const V3 = THREE.Vector3;
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);

// ---------------------------------------------------------------- ثوابت
const H = 0.4;            // نص حجم اللاعب (مكعب 0.8)
const GRAV = 22, SPEED = 5.5, JUMP = 7.6, TERM = 24;
const F_RANGE = 4.5;      // أبعد سطح بتقدر تلزق عليه بـ F
const SENS = 0.0024;
const CAM_DIST = 4.6;
const NET_HZ = 0.05;
const COLORS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'];
const SPAWN_OFF = [[0, 0], [1, 0], [0, 1], [1, 1]];
const ROOM_PREFIX = 'maqloub-v1-';

// ---------------------------------------------------------------- الرسم
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#game').appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1022');
scene.fog = new THREE.Fog('#0d1022', 30, 70);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
scene.add(new THREE.HemisphereLight('#dfe5ff', '#9a8fb0', 1.5));
const sun = new THREE.DirectionalLight('#ffffff', 1.3); sun.position.set(0.5, 1, 0.3); scene.add(sun);
const sun2 = new THREE.DirectionalLight('#ffd9b8', 0.7); sun2.position.set(-0.4, -0.8, -0.5); scene.add(sun2);
const camLight = new THREE.PointLight('#ffffff', 6, 12, 1.6); scene.add(camLight);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

function makeTileTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(8, 8, 48, 48);
  g.strokeStyle = 'rgba(0,0,0,0.38)'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const tileTex = makeTileTex();
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

// ---------------------------------------------------------------- صوت بسيط
let actx = null;
function beep(freq = 440, dur = 0.12, type = 'sine', vol = 0.08, slide = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, actx.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  } catch { /* ما في صوت */ }
}

// ---------------------------------------------------------------- الحالة
const state = { running: false, level: 0 };
const net = { mode: 'solo', code: '', peer: null, hostConn: null, conns: new Map() };
let L = null;
let levelGroup = new THREE.Group(); scene.add(levelGroup);
let doorMeshes = [], plateMeshes = [], exitMesh = null;
const doorCellMap = new Map();
const logic = { plates: new Set(), latched: new Set(), stay: new Set(), doors: [], exitT: 0 };

const me = {
  id: 'host', name: '', color: 0,
  p: new V3(), v: new V3(), g: new V3(0, -1, 0), f: new V3(1, 0, 0), pitch: -0.3,
  grounded: false, cd: 0, mesh: null, label: null, q: new THREE.Quaternion(),
};
const others = new Map(); // id -> {name,color,p,tp,g,f,q,mesh,label}

// ---------------------------------------------------------------- الشبكة الثلاثية
const idx = (x, y, z) => x + L.W * (y + L.H * z);
const inB = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < L.W && y < L.H && z < L.D;
function solid(x, y, z) {
  if (!inB(x, y, z)) return false;
  const i = idx(x, y, z);
  if (L.grid[i] === 1) return true;
  const d = doorCellMap.get(i);
  return d !== undefined && !logic.doors[d];
}
const solidAt = (p) => solid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
function hash(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }

function loadLevel(n) {
  state.level = n;
  L = LEVELS[n]();
  scene.remove(levelGroup);
  levelGroup.traverse((o) => { if (o.material && o.material !== blockMat) o.material.dispose?.(); });
  levelGroup = new THREE.Group(); scene.add(levelGroup);
  doorCellMap.clear(); doorMeshes = []; plateMeshes = [];
  logic.plates = new Set(); logic.latched = new Set(); logic.stay = new Set();
  logic.doors = L.doors.map(() => false); logic.exitT = 0;

  // المكعبات (بس اللي إلها وجه مكشوف)
  const list = [];
  const open = (x, y, z) => !inB(x, y, z) || L.grid[idx(x, y, z)] !== 1;
  for (let z = 0; z < L.D; z++) for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    if (L.grid[idx(x, y, z)] !== 1) continue;
    if (open(x + 1, y, z) || open(x - 1, y, z) || open(x, y + 1, z) || open(x, y - 1, z) || open(x, y, z + 1) || open(x, y, z - 1)) list.push([x, y, z]);
  }
  const im = new THREE.InstancedMesh(boxGeo, blockMat, list.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  list.forEach(([x, y, z], i) => {
    m4.makeTranslation(x + 0.5, y + 0.5, z + 0.5); im.setMatrixAt(i, m4);
    col.setHSL(L.hue, 0.3, 0.36 + hash(x, y, z) * 0.14); im.setColorAt(i, col);
  });
  levelGroup.add(im);

  // الأبواب
  L.doors.forEach((d, di) => {
    const mat = new THREE.MeshStandardMaterial({ color: '#ff9f43', emissive: '#ff6a00', emissiveIntensity: 0.6, transparent: true, opacity: 0.8, map: tileTex });
    const meshes = d.cells.map(([x, y, z]) => {
      doorCellMap.set(idx(x, y, z), di);
      const m = new THREE.Mesh(boxGeo, mat); m.position.set(x + 0.5, y + 0.5, z + 0.5); m.scale.setScalar(0.98);
      levelGroup.add(m); return m;
    });
    doorMeshes.push({ meshes, s: 1 });
  });

  // الأزرار
  const plateGeo = new THREE.BoxGeometry(0.8, 0.08, 0.8);
  for (const pl of L.plates) {
    const mat = new THREE.MeshStandardMaterial({ color: '#ff4d4d', emissive: '#ff2020', emissiveIntensity: 0.7 });
    const m = new THREE.Mesh(plateGeo, mat);
    const n = new V3(...pl.n);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), n);
    m.position.set(pl.cell[0] + 0.5, pl.cell[1] + 0.5, pl.cell[2] + 0.5).addScaledVector(n, -0.47);
    levelGroup.add(m); plateMeshes.push({ id: pl.id, m, mat, on: false });
  }

  // المخرج
  const { min, max } = L.exit;
  const size = new V3(max[0] - min[0] + 1, max[1] - min[1] + 1, max[2] - min[2] + 1);
  const center = new V3(min[0], min[1], min[2]).addScaledVector(size, 0.5);
  exitMesh = new THREE.Mesh(new THREE.BoxGeometry(size.x - 0.04, size.y - 0.04, size.z - 0.04),
    new THREE.MeshBasicMaterial({ color: '#69db7c', transparent: true, opacity: 0.22, depthWrite: false }));
  exitMesh.position.copy(center);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(exitMesh.geometry), new THREE.LineBasicMaterial({ color: '#8dffa0' }));
  exitMesh.add(edges);
  levelGroup.add(exitMesh);

  $('#lvlName').textContent = `المرحلة ${n + 1} من ${LEVELS.length}: ${L.name}`;
  $('#lvlHint').textContent = L.hint;
  respawn();
  me.q.copy(targetQuat(me.g, me.f, new THREE.Quaternion()));
  camQ.copy(cameraTargetQuat());
  pivotUp.copy(me.g).negate();
}
const blockMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.85, metalness: 0.05 });

function respawn() {
  const [sx, sy, sz] = L.spawn; const o = SPAWN_OFF[me.color % 4];
  me.p.set(sx + o[0] + 0.5, sy + H + 0.05, sz + o[1] + 0.5);
  me.v.set(0, 0, 0); me.g.set(0, -1, 0); me.f.set(...L.spawnF); me.pitch = -0.4;
}

// ---------------------------------------------------------------- اللاعبين
function makePlayerMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color, roughness: 0.45 }));
  g.add(body);
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' }), black = new THREE.MeshBasicMaterial({ color: '#111111' });
  for (const sx of [-0.17, 0.17]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.04), white); e.position.set(sx, 0.1, -0.41); g.add(e);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.03), black); p.position.set(sx, 0.07, -0.435); g.add(p);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  top.position.y = 0.42; g.add(top); // علامة "فوق" عشان تعرف وين جاذبية صاحبك
  scene.add(g);
  return g;
}
function makeLabel(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.roundRect(8, 8, 240, 48, 14); g.fill();
  g.font = '600 30px "IBM Plex Sans Arabic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.direction = 'rtl'; g.fillStyle = color; g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false }));
  s.scale.set(0.34, 0.085, 1); s.renderOrder = 10; scene.add(s);
  return s;
}
function ensureMe() {
  if (me.mesh) { scene.remove(me.mesh); }
  me.mesh = makePlayerMesh(COLORS[me.color]);
}
function addOther(id, name, color) {
  if (others.has(id)) return others.get(id);
  const o = { id, name, color, p: new V3(), tp: new V3(), g: new V3(0, -1, 0), f: new V3(1, 0, 0), q: new THREE.Quaternion(), fresh: true,
    mesh: makePlayerMesh(COLORS[color]), label: makeLabel(name, COLORS[color]) };
  others.set(id, o); renderPlayers();
  return o;
}
function removeOther(id) {
  const o = others.get(id); if (!o) return;
  scene.remove(o.mesh); scene.remove(o.label); others.delete(id); renderPlayers();
}
function renderPlayers() {
  const rows = [[me.name + ' (انت)', me.color], ...[...others.values()].map((o) => [o.name, o.color])];
  $('#players').innerHTML = rows.map(([n, c]) => `<div><i style="background:${COLORS[c]}"></i>${escapeHtml(n)}</div>`).join('');
}
addEventListener('pagehide', () => { try { net.peer?.destroy(); } catch { /* */ } });
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- الاتجاهات
const _m = new THREE.Matrix4(), _r = new V3(), _u = new V3(), _z = new V3();
function targetQuat(g, f, out) {
  _u.copy(g).negate(); _r.crossVectors(f, _u).normalize(); _z.copy(f).negate();
  _m.makeBasis(_r, _u, _z); return out.setFromRotationMatrix(_m);
}
const camQ = new THREE.Quaternion(), pivotUp = new V3(0, 1, 0);
function lookDir(out) {
  const U = _u.copy(me.g).negate();
  return out.copy(me.f).multiplyScalar(Math.cos(me.pitch)).addScaledVector(U, Math.sin(me.pitch)).normalize();
}
const _q = new THREE.Quaternion(), _l = new V3(), _y = new V3();
function cameraTargetQuat() {
  lookDir(_l);
  const U = new V3().copy(me.g).negate();
  const R = new V3().crossVectors(me.f, U).normalize();
  _z.copy(_l).negate(); _y.crossVectors(_z, R);
  _m.makeBasis(R, _y, _z); return _q.setFromRotationMatrix(_m);
}

// ---------------------------------------------------------------- التحكم
const keys = new Set();
const want = { flip: false, wall: false };
const typing = () => document.activeElement && document.activeElement.tagName === 'INPUT';
addEventListener('keydown', (e) => {
  if (typing() || !state.running) return;
  keys.add(e.code);
  if (e.code === 'KeyG') want.flip = true;
  if (e.code === 'KeyF') want.wall = true;
  if (e.code === 'KeyR') { respawn(); toast('رجعت للبداية'); }
  if (e.code === 'KeyN' && net.mode !== 'client') nextLevel();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
canvas.addEventListener('click', () => { if (state.running && document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) want.wall = true;
  if (e.button === 2) want.flip = true;
});
document.addEventListener('pointerlockchange', () => {
  $('#lockTip').classList.toggle('hidden', document.pointerLockElement === canvas);
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  turn(-e.movementX * SENS, -e.movementY * SENS);
});
function turn(yaw, pitch) {
  const U = new V3().copy(me.g).negate();
  me.f.applyAxisAngle(U, yaw);
  me.f.addScaledVector(U, -me.f.dot(U)).normalize();
  me.pitch = Math.max(-1.35, Math.min(1.15, me.pitch + pitch));
}

// ---------------------------------------------------------------- تغيير الجاذبية
const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((a) => new V3(...a));
function flipGravity() {
  if (me.cd > 0) return;
  me.g.negate(); me.cd = 0.3; beep(300, 0.25, 'triangle', 0.08, 300);
}
// شو السطح اللي بتصوّب عليه؟
function wallTarget() {
  const l = lookDir(new V3());
  let best = null, bd = 0.35;
  for (const a of AXES) {
    if (a.equals(me.g)) continue;
    const d = a.dot(l); if (d > bd) { bd = d; best = a; }
  }
  if (!best) return null;
  const q = new V3();
  for (let t = 0.45; t <= F_RANGE; t += 0.2) {
    q.copy(me.p).addScaledVector(best, t);
    if (solidAt(q)) return { a: best, cell: q.clone().floor() };
  }
  return null;
}
function wallGravity() {
  if (me.cd > 0) return;
  const t = wallTarget();
  if (!t) { toast('ما في سطح قريب بهالاتجاه'); beep(160, 0.12, 'square', 0.04); return; }
  const oldU = new V3().copy(me.g).negate();
  me.g.copy(t.a);
  const nf = me.f.clone().addScaledVector(t.a, -me.f.dot(t.a));
  if (nf.lengthSq() < 0.01) nf.copy(oldU).addScaledVector(t.a, -oldU.dot(t.a));
  me.f.copy(nf.normalize());
  me.v.multiplyScalar(0.3); me.cd = 0.3;
  beep(520, 0.2, 'triangle', 0.08, -200);
}

// ---------------------------------------------------------------- الفيزياء
function overlapsGrid(p) {
  const x0 = Math.floor(p.x - H), x1 = Math.floor(p.x + H);
  const y0 = Math.floor(p.y - H), y1 = Math.floor(p.y + H);
  const z0 = Math.floor(p.z - H), z1 = Math.floor(p.z + H);
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solid(x, y, z)) return true;
  return false;
}
function moveAxis(ax, d) {
  const old = me.p[ax];
  me.p[ax] += d;
  let hit = false;
  if (overlapsGrid(me.p)) {
    hit = true;
    me.p[ax] = d > 0 ? Math.floor(me.p[ax] + H) - H - 1e-4 : Math.floor(me.p[ax] - H) + 1 + H + 1e-4;
    if (overlapsGrid(me.p)) me.p[ax] = old;
  }
  for (const o of others.values()) {
    if (Math.abs(me.p.x - o.p.x) < 2 * H && Math.abs(me.p.y - o.p.y) < 2 * H && Math.abs(me.p.z - o.p.z) < 2 * H) {
      hit = true;
      me.p[ax] = d > 0 ? o.p[ax] - 2 * H - 1e-3 : o.p[ax] + 2 * H + 1e-3;
      if (overlapsGrid(me.p)) me.p[ax] = old;
    }
  }
  return hit;
}
const _wish = new V3(), _vt = new V3(), _R = new V3(), _U = new V3();
function physics(dt) {
  _U.copy(me.g).negate();
  _R.crossVectors(me.f, _U).normalize();
  let ix = 0, iz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
  if (keys.has('KeyD')) ix += 1;
  if (keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowLeft') || keys.has('KeyQ')) turn(2.4 * dt, 0);
  if (keys.has('ArrowRight') || keys.has('KeyE')) turn(-2.4 * dt, 0);
  _wish.copy(me.f).multiplyScalar(iz).addScaledVector(_R, ix);
  if (_wish.lengthSq() > 0) _wish.normalize().multiplyScalar(SPEED);

  const along = me.v.dot(me.g);
  _vt.copy(me.v).addScaledVector(me.g, -along);
  _vt.lerp(_wish, 1 - Math.exp(-(me.grounded ? 16 : (_wish.lengthSq() > 0 ? 5 : 9)) * dt));
  let a2 = Math.min(TERM, along + GRAV * dt);
  if (keys.has('Space') && me.grounded) { a2 = -JUMP; beep(660, 0.08, 'sine', 0.04); }
  me.v.copy(_vt).addScaledVector(me.g, a2);

  me.grounded = false;
  for (const ax of ['x', 'y', 'z']) {
    const d = me.v[ax] * dt; if (d === 0) continue;
    if (moveAxis(ax, d)) {
      if (me.g[ax] !== 0 && Math.sign(d) === Math.sign(me.g[ax])) me.grounded = true;
      me.v[ax] = 0;
    }
  }
}
function outOfBounds() {
  const m = 8;
  return me.p.x < -m || me.p.y < -m || me.p.z < -m || me.p.x > L.W + m || me.p.y > L.H + m || me.p.z > L.D + m;
}

// ---------------------------------------------------------------- منطق المرحلة (عند المضيف)
function allPositions() { return [me.p, ...[...others.values()].map((o) => o.tp)]; }
function hostLogic(dt) {
  const all = allPositions();
  const solo = others.size === 0;
  const active = new Set();
  for (const pl of L.plates) {
    const [x, y, z] = pl.cell, e = 0.15;
    const on = all.some((p) => p.x > x - e && p.x < x + 1 + e && p.y > y - e && p.y < y + 1 + e && p.z > z - e && p.z < z + 1 + e);
    if (on) { active.add(pl.id); if (solo || pl.latch) logic.latched.add(pl.id); }
    if (logic.latched.has(pl.id)) active.add(pl.id);
  }
  logic.plates = active;
  logic.doors = L.doors.map((d, i) => {
    const c = d.mode === 'all' ? d.plates.every((id) => active.has(id)) : d.plates.some((id) => active.has(id));
    if (c && d.stay) logic.stay.add(i);
    return c || logic.stay.has(i);
  });
  const { min, max } = L.exit;
  const inside = all.every((p) => p.x > min[0] && p.x < max[0] + 1 && p.y > min[1] && p.y < max[1] + 1 && p.z > min[2] && p.z < max[2] + 1);
  if (inside) { logic.exitT += dt; if (logic.exitT > 1.2) nextLevel(); } else logic.exitT = 0;
}
function nextLevel() {
  const n = state.level + 1;
  const win = n >= LEVELS.length;
  broadcast({ t: 'lvl', n: win ? 0 : n, win });
  goLevel(win ? 0 : n, win);
}
function goLevel(n, win) {
  beep(523, 0.15, 'sine', 0.08); setTimeout(() => beep(659, 0.15, 'sine', 0.08), 140); setTimeout(() => beep(784, 0.3, 'sine', 0.08), 280);
  if (win) banner('خلّصتوا كل المراحل! 🎉', 'رجعنا من الأول، ورجّوا الشباب مين أسرع');
  else banner(`المرحلة ${n + 1}`, LEVELS[n]().name);
  loadLevel(n);
}

// ---------------------------------------------------------------- الرسم كل فريم
const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: '#ffb547', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
marker.visible = false; scene.add(marker);
let camDist = CAM_DIST;
const _tq = new THREE.Quaternion(), _look = new V3(), _piv = new V3(), _tmp = new V3();
let prevPlates = new Set();

function updateVisuals(dt) {
  const k = (r) => 1 - Math.exp(-r * dt);
  // انا
  targetQuat(me.g, me.f, _tq); me.q.slerp(_tq, k(14));
  me.mesh.position.copy(me.p); me.mesh.quaternion.copy(me.q);
  // الباقيين
  for (const o of others.values()) {
    if (o.fresh) { o.p.copy(o.tp); o.fresh = false; } else o.p.lerp(o.tp, k(14));
    targetQuat(o.g, o.f, _tq); o.q.slerp(_tq, k(12));
    o.mesh.position.copy(o.p); o.mesh.quaternion.copy(o.q);
    o.label.position.copy(o.p).addScaledVector(_tmp.copy(o.g).negate(), 0.75);
    o.label.visible = o.p.distanceTo(camera.position) > 1.6;
  }
  // الأبواب
  doorMeshes.forEach((dm, i) => {
    const target = logic.doors[i] ? 0.02 : 0.98;
    dm.s += (target - dm.s) * k(10);
    for (const m of dm.meshes) { m.scale.setScalar(dm.s); m.visible = dm.s > 0.05; }
  });
  // الأزرار
  for (const pm of plateMeshes) {
    const on = logic.plates.has(pm.id);
    if (on !== pm.on) { pm.on = on; pm.mat.color.set(on ? '#40ff7a' : '#ff4d4d'); pm.mat.emissive.set(on ? '#20c050' : '#ff2020'); }
  }
  for (const id of logic.plates) if (!prevPlates.has(id)) beep(880, 0.1, 'square', 0.04);
  for (const id of prevPlates) if (!logic.plates.has(id)) beep(330, 0.1, 'square', 0.04);
  prevPlates = new Set(logic.plates);
  // المخرج
  exitMesh.material.opacity = 0.16 + 0.1 * Math.sin(performance.now() / 300);
  const bar = $('#exitBar');
  bar.style.opacity = logic.exitT > 0 ? 1 : 0; bar.firstChild.style.width = `${Math.min(100, (logic.exitT / 1.2) * 100)}%`;

  // الكاميرا
  camQ.slerp(cameraTargetQuat(), k(12));
  pivotUp.lerp(_tmp.copy(me.g).negate(), k(10));
  _piv.copy(me.p).addScaledVector(pivotUp, 0.9);
  _look.set(0, 0, -1).applyQuaternion(camQ);
  let dist = CAM_DIST;
  for (let t = 0.3; t <= CAM_DIST; t += 0.1) {
    _tmp.copy(_piv).addScaledVector(_look, -t);
    if (solidAt(_tmp)) { dist = Math.max(0.35, t - 0.3); break; }
  }
  camDist = dist < camDist ? dist : camDist + (dist - camDist) * k(4);
  camera.position.copy(_piv).addScaledVector(_look, -camDist);
  camera.quaternion.copy(camQ);
  camLight.position.copy(camera.position);
  me.mesh.visible = camDist > 0.9;

  // وين رح تلزق لو كبست F
  const wt = me.cd > 0 ? null : wallTarget();
  $('#cross').classList.toggle('ok', !!wt);
  if (wt) {
    marker.visible = true;
    marker.position.set(wt.cell.x + 0.5, wt.cell.y + 0.5, wt.cell.z + 0.5).addScaledVector(wt.a, -0.51);
    marker.quaternion.setFromUnitVectors(new V3(0, 0, 1), wt.a);
  } else marker.visible = false;
}

// ---------------------------------------------------------------- الحلقة
let last = performance.now(), netAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.running && L && !window.__manual) tick(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
function tick(dt) {
  {
    me.cd = Math.max(0, me.cd - dt);
    if (want.flip) { want.flip = false; flipGravity(); }
    if (want.wall) { want.wall = false; wallGravity(); }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < steps; i++) physics(dt / steps);
    if (outOfBounds()) { respawn(); toast('وقعت برّا! رجعت للبداية'); beep(200, 0.3, 'sawtooth', 0.05, -120); }
    if (net.mode !== 'client') hostLogic(dt);
    netAcc += dt;
    if (netAcc >= NET_HZ) { netAcc = 0; netTick(); }
    updateVisuals(dt);
  }
}

// ---------------------------------------------------------------- واجهة
let toastTimer = 0, bannerTimer = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.style.opacity = 0), 2200); }
function banner(big, small = '') {
  const b = $('#banner'); b.innerHTML = `${escapeHtml(big)}<small>${escapeHtml(small)}</small>`; b.style.opacity = 1;
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (b.style.opacity = 0), 2600);
}
function menuMsg(m) { $('#menuMsg').textContent = m; }
function setBusy(b) { for (const id of ['#hostBtn', '#joinBtn', '#soloBtn']) $(id).disabled = b; }

function startGame(level) {
  $('#menu').classList.add('hidden'); $('#hud').classList.remove('hidden');
  $('#roomBox').classList.toggle('hidden', net.mode === 'solo');
  $('#roomCode').textContent = net.code;
  ensureMe(); renderPlayers();
  loadLevel(level);
  state.running = true;
  banner(`المرحلة ${level + 1}`, L.name);
}
function backToMenu(msg) {
  state.running = false;
  for (const id of [...others.keys()]) removeOther(id);
  try { net.peer?.destroy(); } catch { /* */ }
  net.peer = null; net.hostConn = null; net.conns.clear(); net.mode = 'solo';
  document.exitPointerLock?.();
  $('#hud').classList.add('hidden'); $('#menu').classList.remove('hidden');
  setBusy(false); menuMsg(msg || '');
}

const getName = () => ($('#nameIn').value.trim() || 'لاعب').slice(0, 14);
$('#nameIn').value = localStorage.getItem('maqloub-name') || '';
if (params.get('room')) $('#codeIn').value = params.get('room').toUpperCase().slice(0, 4);

$('#soloBtn').onclick = () => {
  me.name = getName(); localStorage.setItem('maqloub-name', me.name);
  net.mode = 'solo'; me.id = 'host'; me.color = 0; startGame(0);
};
$('#hostBtn').onclick = () => { me.name = getName(); localStorage.setItem('maqloub-name', me.name); hostRoom(0); };
$('#joinBtn').onclick = () => {
  const code = $('#codeIn').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) { menuMsg('الكود لازم يكون 4 حروف'); return; }
  me.name = getName(); localStorage.setItem('maqloub-name', me.name); joinRoom(code);
};
$('#codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#joinBtn').click(); });
$('#copyBtn').onclick = async () => {
  const url = `${location.origin}${location.pathname}?room=${net.code}`;
  try { await navigator.clipboard.writeText(url); toast('انسخ الرابط! ابعته للشباب'); } catch { prompt('انسخ الرابط:', url); }
};

// ---------------------------------------------------------------- الأونلاين (PeerJS)
function peerOpts() {
  const o = { debug: 1 };
  if (params.get('peerhost')) {
    o.host = params.get('peerhost'); o.port = +(params.get('peerport') || 9000);
    o.path = params.get('peerpath') || '/'; o.secure = params.get('peersecure') === '1';
    o.config = { iceServers: [] };
  }
  return o;
}
const randCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
const r3 = (v) => [Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000];

function hostRoom(tries) {
  if (typeof Peer === 'undefined') { menuMsg('ما قدرنا نحمّل مكتبة الاتصال'); return; }
  setBusy(true); menuMsg('عم نفتح الغرفة…');
  const code = randCode();
  const peer = new Peer(ROOM_PREFIX + code, peerOpts());
  net.peer = peer;
  peer.on('open', () => {
    net.mode = 'host'; net.code = code; me.id = 'host'; me.color = 0;
    history.replaceState(null, '', `${location.pathname}?room=${code}${keepPeerParams()}`);
    startGame(0); toast('الغرفة جاهزة! ابعت الكود للشباب');
  });
  peer.on('connection', (conn) => {
    conn.on('data', (msg) => hostHandle(conn, msg));
    conn.on('close', () => hostDrop(conn));
    conn.on('error', () => hostDrop(conn));
  });
  peer.on('disconnected', () => { if (state.running) { toast('انقطع الاتصال بسيرفر الربط، عم نعيد…'); try { peer.reconnect(); } catch { /* */ } } });
  peer.on('error', (e) => {
    if (e.type === 'unavailable-id' && tries < 5) { peer.destroy(); hostRoom(tries + 1); return; }
    if (!state.running) { setBusy(false); menuMsg(errText(e)); } else toast(errText(e));
  });
}
function keepPeerParams() {
  const keep = ['peerhost', 'peerport', 'peerpath', 'peersecure'].filter((k) => params.get(k)).map((k) => `&${k}=${encodeURIComponent(params.get(k))}`);
  return keep.join('');
}
function errText(e) {
  if (e.type === 'peer-unavailable') return 'ما في غرفة بهالكود، أو صاحبك سكّرها';
  if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) return 'مشكلة بالاتصال بالإنترنت أو بسيرفر الربط، جرّب كمان مرة';
  if (e.type === 'browser-incompatible') return 'المتصفح ما بدعم اللعب أونلاين';
  return 'صار خطأ: ' + (e.type || e.message || e);
}
function hostHandle(conn, msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.t === 'hello') {
    if (others.size >= 3) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 400); return; }
    const used = new Set([me.color, ...[...others.values()].map((o) => o.color)]);
    const color = [0, 1, 2, 3].find((c) => !used.has(c));
    const name = String(msg.name || 'لاعب').slice(0, 14);
    net.conns.set(conn.peer, conn);
    addOther(conn.peer, name, color);
    conn.send({ t: 'welcome', id: conn.peer, color, level: state.level });
    toast(`${name} دخل الغرفة`); beep(700, 0.15, 'sine', 0.06);
  } else if (msg.t === 's') {
    const o = others.get(conn.peer); if (!o) return;
    o.lastSeen = performance.now();
    if (Array.isArray(msg.p)) o.tp.set(+msg.p[0] || 0, +msg.p[1] || 0, +msg.p[2] || 0);
    if (Array.isArray(msg.g)) o.g.set(...msg.g.map(Number)).normalize();
    if (Array.isArray(msg.f)) o.f.set(...msg.f.map(Number)).normalize();
  }
}
function hostDrop(conn) {
  if (!net.conns.has(conn.peer)) return;
  net.conns.delete(conn.peer);
  const o = others.get(conn.peer);
  if (o) toast(`${o.name} طلع`);
  removeOther(conn.peer);
}
function broadcast(msg) { for (const c of net.conns.values()) if (c.open) c.send(msg); }

function joinRoom(code) {
  if (typeof Peer === 'undefined') { menuMsg('ما قدرنا نحمّل مكتبة الاتصال'); return; }
  setBusy(true); menuMsg('عم ندخل…');
  const peer = new Peer(peerOpts());
  net.peer = peer;
  let joined = false;
  const timer = setTimeout(() => { if (!joined) backToMenu('ما ردّت الغرفة. تأكد من الكود وإن صاحبك لسا فاتحها'); }, 15000);
  peer.on('open', () => {
    const conn = peer.connect(ROOM_PREFIX + code, { reliable: true });
    net.hostConn = conn;
    conn.on('open', () => conn.send({ t: 'hello', name: me.name }));
    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'welcome') {
        joined = true; clearTimeout(timer);
        net.mode = 'client'; net.code = code; me.id = msg.id; me.color = msg.color | 0;
        net.lastSeen = performance.now();
        startGame(msg.level | 0); toast('دخلت! يلا');
      } else if (msg.t === 'full') {
        clearTimeout(timer); backToMenu('الغرفة مليانة (4 لاعبين بالأكثر)');
      } else if (msg.t === 'w' && state.running) {
        net.lastSeen = performance.now();
        clientWorld(msg);
      } else if (msg.t === 'lvl' && state.running) {
        goLevel(msg.n | 0, !!msg.win);
      }
    });
    conn.on('close', () => { clearTimeout(timer); if (state.running || joined) backToMenu('المضيف سكّر الغرفة أو انقطع الاتصال'); });
  });
  peer.on('error', (e) => { clearTimeout(timer); if (!state.running) backToMenu(errText(e)); else toast(errText(e)); });
}
function clientWorld(msg) {
  if ((msg.lv | 0) !== state.level) return;
  const seen = new Set();
  for (const [id, name, color, p, g, f] of msg.ps) {
    if (id === me.id) continue;
    seen.add(id);
    const o = others.get(id) || addOther(id, name, color);
    o.tp.set(...p); o.g.set(...g); o.f.set(...f);
  }
  for (const id of [...others.keys()]) if (!seen.has(id)) removeOther(id);
  logic.plates = new Set(msg.pl);
  logic.doors = msg.d;
  logic.exitT = msg.e || 0;
}
function netTick() {
  const now = performance.now();
  if (net.mode === 'client' && now - (net.lastSeen || now) > 7000) { backToMenu('انقطع الاتصال بالمضيف'); return; }
  if (net.mode === 'host') {
    for (const [id, c] of net.conns) {
      const o = others.get(id);
      if (o && now - (o.lastSeen || now) > 10000) { try { c.close(); } catch { /* */ } hostDrop(c); }
    }
    const ps = [[me.id, me.name, me.color, r3(me.p), r3(me.g), r3(me.f)],
      ...[...others.values()].map((o) => [o.id, o.name, o.color, r3(o.tp), r3(o.g), r3(o.f)])];
    broadcast({ t: 'w', lv: state.level, ps, pl: [...logic.plates], d: logic.doors, e: logic.exitT });
  } else if (net.mode === 'client' && net.hostConn?.open) {
    net.hostConn.send({ t: 's', p: r3(me.p), g: r3(me.g), f: r3(me.f) });
  }
}

// للاختبار من الكونسول
window.__maqloub = { tick, me, state, logic, others, net, loadLevel, wallGravity, flipGravity, turn, keys, get L() { return L; } };
