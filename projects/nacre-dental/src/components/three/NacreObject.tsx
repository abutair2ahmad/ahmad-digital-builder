'use client';

import { useEffect, useRef } from 'react';

/**
 * The one piece of 3D on the site.
 *
 * It is a nacre form — the iridescent layering of mother-of-pearl, which is the
 * same optical behaviour a good ceramist builds into a veneer. That is the only
 * reason it is here: it says something about the craft rather than decorating
 * the page.
 *
 * Guards, in order: reduced-motion users and narrow viewports never load the
 * module at all (see HeroVisual); the renderer caps device pixel ratio at 1.75;
 * the animation loop stops whenever the canvas leaves the viewport or the tab
 * is hidden; and every GPU resource is disposed on unmount.
 */
export default function NacreObject() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import('three');
      if (disposed || !host) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, 5.2);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setClearAlpha(0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';

      const uniforms = {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uBase: { value: new THREE.Color('#f7f1e8') },
        uDeep: { value: new THREE.Color('#1f4238') },
        uWarm: { value: new THREE.Color('#c9a473') },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vView;
          varying vec3 vPos;

          void main() {
            vec3 transformed = position;
            // A barely-there swell keeps the silhouette from reading as a
            // perfect CG sphere.
            float swell = sin(position.y * 3.0 + uTime * 0.25) * 0.012
                        + cos(position.x * 2.4 - uTime * 0.18) * 0.010;
            transformed += normal * swell;

            vec4 world = modelMatrix * vec4(transformed, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(cameraPosition - world.xyz);
            vPos = transformed;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec2  uPointer;
          uniform vec3  uBase;
          uniform vec3  uDeep;
          uniform vec3  uWarm;
          varying vec3 vNormal;
          varying vec3 vView;
          varying vec3 vPos;

          float hash(vec3 p) {
            p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }

          float noise(vec3 x) {
            vec3 i = floor(x);
            vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                  mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
              mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                  mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
              f.z);
          }

          void main() {
            vec3 N = normalize(vNormal);
            vec3 V = normalize(vView);
            float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);

            // Layered growth lines, as in a real shell.
            float layers = noise(vPos * 4.2 + vec3(0.0, uTime * 0.05, 0.0)) * 0.6
                         + noise(vPos * 11.0) * 0.25;

            // Thin-film interference: hue rotates with view angle and depth.
            float phase = fresnel * 2.1 + layers * 1.4 + uTime * 0.035 + uPointer.x * 0.25;
            vec3 iridescence = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.28, 0.55) + phase));
            iridescence = mix(iridescence, uWarm, 0.35);

            vec3 keyDir = normalize(vec3(-0.45 + uPointer.x * 0.3, 0.85 + uPointer.y * 0.25, 0.7));
            float key = clamp(dot(N, keyDir), 0.0, 1.0);
            float specular = pow(key, 42.0);

            vec3 colour = mix(uDeep, uBase, smoothstep(0.05, 0.95, key * 0.75 + 0.35));
            colour = mix(colour, iridescence, fresnel * 0.62);
            colour += specular * 0.55;
            colour = mix(colour, uBase, 0.12);

            float alpha = clamp(0.62 + fresnel * 0.5, 0.0, 1.0);
            gl_FragColor = vec4(colour, alpha);
          }
        `,
      });

      // The object must stay inside the camera frustum. Anything larger paints
      // the whole canvas and turns its rectangular edge into a visible box on
      // the page behind it.
      const geometry = new THREE.SphereGeometry(1.42, 128, 128);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.z = -0.32;
      scene.add(mesh);

      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };

      const onPointerMove = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });

      const resize = () => {
        const { clientWidth, clientHeight } = host;
        if (!clientWidth || !clientHeight) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      let running = true;
      let frame = 0;
      const clock = new THREE.Clock();

      const render = () => {
        if (!running) return;
        frame = requestAnimationFrame(render);
        const elapsed = clock.getElapsedTime();

        pointer.x += (target.x - pointer.x) * 0.045;
        pointer.y += (target.y - pointer.y) * 0.045;

        uniforms.uTime.value = elapsed;
        uniforms.uPointer.value.set(pointer.x, pointer.y);

        mesh.rotation.y = elapsed * 0.11 + pointer.x * 0.22;
        mesh.rotation.x = Math.sin(elapsed * 0.16) * 0.09 - pointer.y * 0.16;

        renderer.render(scene, camera);
      };

      const start = () => {
        if (running) return;
        running = true;
        clock.start();
        frame = requestAnimationFrame(render);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(frame);
      };

      // Only render while visible.
      const visibility = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { threshold: 0.05 },
      );
      visibility.observe(host);

      const onVisibilityChange = () => (document.hidden ? stop() : start());
      document.addEventListener('visibilitychange', onVisibilityChange);

      frame = requestAnimationFrame(render);

      cleanup = () => {
        stop();
        visibility.disconnect();
        observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pointermove', onPointerMove);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden />;
}
