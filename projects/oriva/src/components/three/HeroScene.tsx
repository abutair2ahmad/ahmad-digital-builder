import { useEffect, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

/**
 * The hero centrepiece: a slowly breathing "skin cell" — a displaced
 * icosahedron with a fresnel sheen, a counter-rotating wire shell and a drift
 * of particles around it.
 *
 * Written directly against three.js rather than through a scene-graph wrapper:
 * it is one object, one shader and one loop, and it keeps the lazy chunk small.
 */

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vNoise;

  // Ashima Arts simplex noise (public domain)
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float slow = uTime * 0.16;
    float n1 = snoise(normal * 1.55 + vec3(0.0, slow, slow * 0.4));
    float n2 = snoise(normal * 3.30 - vec3(slow * 0.8, 0.0, 0.0));
    float disp = n1 * 0.17 + n2 * 0.055;
    vNoise = disp;

    vec3 displaced = position + normal * disp * uAmp;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uRim;
  uniform float uTime;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vNoise;

  void main() {
    float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 2.4);
    vec3 col = mix(uDeep, uMid, smoothstep(-0.20, 0.22, vNoise));
    col = mix(col, uRim, smoothstep(0.50, 1.0, fres) * 0.80);

    // A faint iridescent band so the surface reads as glass, not plastic.
    float sheen = sin(vNoise * 14.0 + uTime * 0.5) * 0.5 + 0.5;
    col += vec3(0.05, 0.03, 0.02) * sheen * (0.35 + fres);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aPhase;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.42 + aPhase) * 0.22;
    p.x += cos(uTime * 0.30 + aPhase * 1.3) * 0.16;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Clamped so a particle drifting near the camera never becomes a
    // distracting bokeh disc over the headline.
    gl_PointSize = min(aScale * uPixelRatio * (150.0 / -mv.z), 14.0 * uPixelRatio);
    vAlpha = 0.16 + 0.34 * (sin(uTime * 0.8 + aPhase) * 0.5 + 0.5);
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(uColor, soft * vAlpha);
  }
`;

interface Props {
  className?: string;
  reducedMotion?: boolean;
  /** Horizontal placement in world units on wide screens (0 = centred). */
  offsetX?: number;
}

export default function HeroScene({ className = '', reducedMotion = false, offsetX = 1.45 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return; // no WebGL — the CSS fallback underneath stays visible
    }

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 4.35);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const group = new Group();
    scene.add(group);

    // --- core blob -----------------------------------------------------------
    const coreGeo = new IcosahedronGeometry(1.02, 22);
    const coreMat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 1 },
        uDeep: { value: new Color('#05231e') },
        uMid: { value: new Color('#2b8974') },
        uRim: { value: new Color('#f0c39c') },
      },
    });
    const core = new Mesh(coreGeo, coreMat);
    group.add(core);

    // --- counter-rotating wire shell ----------------------------------------
    const shellGeo = new IcosahedronGeometry(1.62, 2);
    const shellMat = new MeshBasicMaterial({
      color: new Color('#79c9b4'),
      wireframe: true,
      transparent: true,
      opacity: 0.11,
    });
    const shell = new Mesh(shellGeo, shellMat);
    group.add(shell);

    // --- drifting particles --------------------------------------------------
    const COUNT = 70;
    const positions = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 2.0 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.75;
      positions[i * 3 + 2] = r * Math.cos(phi);
      scales[i] = 0.6 + Math.random() * 1.6;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const partGeo = new BufferGeometry();
    partGeo.setAttribute('position', new BufferAttribute(positions, 3));
    partGeo.setAttribute('aScale', new BufferAttribute(scales, 1));
    partGeo.setAttribute('aPhase', new BufferAttribute(phases, 1));
    const partMat = new ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uColor: { value: new Color('#cfe9e0') },
      },
    });
    const particles = new Points(partGeo, partMat);
    group.add(particles);

    // --- sizing --------------------------------------------------------------
    function resize() {
      const { clientWidth: w, clientHeight: h } = host!;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // The canvas is full-bleed so its edges never show as a seam; the object
      // is pushed to the right in world space instead, clearing the headline.
      const wide = w >= 1024;
      const scale = wide ? 0.92 : w < 640 ? 0.7 : 0.85;
      group.scale.setScalar(scale);

      if (wide) {
        camera.position.z = 4.7;
        group.position.set(offsetX, 0, 0);
      } else {
        // Portrait screens are narrow: fit the object to a fraction of the
        // viewport width and lift it above the copy instead of behind it.
        const halfFovTan = Math.tan((camera.fov * Math.PI) / 360);
        const targetFraction = w < 640 ? 0.52 : 0.45;
        const needed = (2.3 * scale) / targetFraction;
        camera.position.z = Math.max(4.4, needed / (2 * halfFovTan * (w / h)));
        group.position.set(0, 2 * halfFovTan * camera.position.z * 0.2, 0);
      }
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // --- interaction ---------------------------------------------------------
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    function onPointerMove(e: PointerEvent) {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    if (!reducedMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });

    // --- loop ----------------------------------------------------------------
    let raf = 0;
    let visible = true;
    const clock = new Clock();

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();

      coreMat.uniforms.uTime.value = t;
      partMat.uniforms.uTime.value = t;

      pointer.x += (target.x - pointer.x) * 0.045;
      pointer.y += (target.y - pointer.y) * 0.045;

      group.rotation.y = t * 0.11 + pointer.x * 0.28;
      group.rotation.x = Math.sin(t * 0.16) * 0.09 + pointer.y * 0.16;
      shell.rotation.y = -t * 0.16;
      shell.rotation.z = t * 0.06;
      core.position.y = Math.sin(t * 0.55) * 0.045;

      renderer.render(scene, camera);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.01 },
    );
    io.observe(host);

    if (reducedMotion) {
      // One still frame — the object is part of the composition, the motion is not.
      coreMat.uniforms.uTime.value = 1.2;
      partMat.uniforms.uTime.value = 1.2;
      group.rotation.set(0.1, 0.5, 0);
      renderer.render(scene, camera);
    } else {
      frame();
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      partGeo.dispose();
      partMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [reducedMotion, offsetX]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
