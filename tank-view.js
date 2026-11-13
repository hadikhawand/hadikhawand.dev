// three.js scene for the parametric tank. All model dimensions are in metres.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { tColor } from './tank.js';

const BG = 0x101318;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => 1 - Math.pow(1 - clamp01(v), 3);
const STAGGER = 0.55;   // build animation: delay between courses

export async function createView(wrap, onHover) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const canvas = renderer.domElement;
  canvas.className = 'tank-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D model of a storage tank. Drag to rotate.');
  wrap.prepend(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 28, 62);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(12, 22, 10);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd7ff, 0x0b0d10, 0.35));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
  const HOME_DIR = new THREE.Vector3(15, 9.5, 17).normalize();
  const BASE_DIST = 24;
  camera.position.copy(HOME_DIR).multiplyScalar(BASE_DIST);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;   // keep the page scroll wheel working; zoom via buttons
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.7;
  canvas.style.touchAction = 'pan-y';   // vertical swipes still scroll the page on phones
  let idleTimer = 0;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idleTimer); });
  controls.addEventListener('end', () => {
    clearTimeout(idleTimer);
    if (!reduceMotion) idleTimer = setTimeout(() => { controls.autoRotate = true; }, 6000);
  });

  // Materials
  const mat = {
    dark: new THREE.MeshStandardMaterial({ color: 0x5d6672, metalness: 0.6, roughness: 0.45 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xb9c1ca, metalness: 0.55, roughness: 0.4, side: THREE.DoubleSide }),
    deck: new THREE.MeshStandardMaterial({ color: 0x8b949f, metalness: 0.5, roughness: 0.5 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.2, roughness: 0.5 }),
    stair: new THREE.MeshStandardMaterial({ color: 0x8a939e, metalness: 0.5, roughness: 0.5 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0, roughness: 0.95 }),
    liquid: new THREE.MeshStandardMaterial({ color: 0x0f766e, emissive: 0x0a3d3a, metalness: 0.1, roughness: 0.15, transparent: true, opacity: 0.82 }),
    person: new THREE.MeshStandardMaterial({ color: 0x5eead4, emissive: 0x134e48, roughness: 0.5 }),
  };
  const courseMats = [];

  const world = new THREE.Group();
  scene.add(world);
  const model = new THREE.Group();
  world.add(model);

  let p = null;          // current parameters
  let parts = null;      // references for animation
  let build = reduceMotion ? 999 : 0;
  let explode = 0;
  let level = 0;
  let zoomF = 1;
  let distNow = BASE_DIST;
  let hoverables = [];
  let hi = -1;

  // ---- geometry helpers ----
  // Ring around the y axis; with `cut`, leaves out the quarter facing the default camera.
  function ring(R, tube, cut) {
    const g = new THREE.TorusGeometry(R, tube, 8, 160, cut ? Math.PI * 1.5 : Math.PI * 2);
    g.rotateX(Math.PI / 2);
    if (cut) g.rotateY(-Math.PI / 2);
    return g;
  }
  const visibleAngle = (th, cut) => {
    if (!cut) return true;
    const a = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return a > Math.PI / 2 + 0.05 && a < Math.PI * 2 - 0.05;
  };
  const polar = (R, th, y) => new THREE.Vector3(R * Math.sin(th), y, R * Math.cos(th));

  function disposeTree(obj) {
    obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  function styleCourses() {
    if (!p || !parts) return;
    parts.courses.forEach((c, i) => {
      const m = courseMats[i];
      if (p.thick) {
        const [r, g, b] = tColor(c.t);
        m.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
        m.metalness = 0.15;
        m.roughness = 0.55;
      } else {
        const shade = i % 2 ? 0xaeb6c0 : 0xb8c0ca;
        m.color.setHex(shade);
        m.metalness = 0.55;
        m.roughness = 0.38;
      }
      m.emissive.setHex(i === hi ? 0x5eead4 : 0x000000);
      m.emissiveIntensity = p.thick ? 0.25 : 0.18;
    });
  }

  function rebuild(params, metrics, first = false) {
    p = { ...params };
    disposeTree(model);
    model.clear();
    if (first) { level = 0; build = reduceMotion ? 999 : 0; }

    const r = p.D / 2;
    const H = p.H;
    const n = p.n;
    const ch = H / n;
    const cut = p.cutaway;
    const th0 = cut ? Math.PI / 2 : 0;
    const thL = cut ? Math.PI * 1.5 : Math.PI * 2;
    const SEG = 112;
    const tube = Math.max(0.035, p.D * 0.0011);

    while (courseMats.length < n) {
      courseMats.push(new THREE.MeshStandardMaterial({ color: 0xc7ced6, metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide }));
    }

    // Foundation, bottom plate, ground grid
    const found = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.7, r + 0.95, 0.5, SEG), mat.concrete);
    found.position.y = -0.25;
    model.add(found);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.25, r + 0.25, 0.04, SEG), mat.dark);
    bottom.position.y = 0.02;
    model.add(bottom);
    const divs = 2 * Math.max(8, Math.ceil((p.D * 1.8) / 5));
    const grid = new THREE.GridHelper(divs * 5, divs, 0x2f3742, 0x222831);   // 5 m squares
    grid.position.y = -0.5;
    grid.material.transparent = true;
    grid.material.opacity = 0.8;
    model.add(grid);

    // Shell courses
    const courses = metrics.cs.map((c, i) => {
      const g = new THREE.Group();
      const geo = new THREE.CylinderGeometry(r, r, 1, SEG, 1, true, th0, thL);
      geo.translate(0, 0.5, 0);
      const plate = new THREE.Mesh(geo, courseMats[i]);
      plate.userData.course = i;
      g.add(plate);
      const seam = new THREE.Mesh(ring(r + tube * 0.4, tube, cut), mat.dark);
      seam.position.y = ch;
      g.add(seam);
      model.add(g);
      return { g, plate, seam, y0: c.y0, h: ch, t: c.t };
    });

    // Roof
    const roofG = new THREE.Group();
    let rh = 0;
    if (p.roof === 'cone') {
      rh = r * 0.18;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 1.01, rh, SEG, 1, true, th0, thL), mat.roof);
      cone.position.y = rh / 2;
      roofG.add(cone);
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 16), mat.dark);
      vent.position.y = rh + 0.2;
      roofG.add(vent);
    } else if (p.roof === 'dome') {
      const R = p.D;                     // radius of curvature = 1.0 D
      const a = Math.asin(r / R);
      rh = R * (1 - Math.cos(a));
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(R, SEG, 28, cut ? Math.PI : 0, thL, 0, a),
        mat.roof
      );
      dome.position.y = -R * Math.cos(a);
      roofG.add(dome);
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 16), mat.dark);
      vent.position.y = rh + 0.2;
      roofG.add(vent);
    } else {
      // Open top with a wind girder just below the rim
      const girder = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.9, SEG, 1, 0, thL),
        mat.roof
      );
      girder.geometry.rotateX(-Math.PI / 2);
      girder.position.y = -1.0;
      roofG.add(girder);
    }
    // Handrail around the rim (safety yellow) with posts
    const railH = 1.05;
    const railTube = Math.max(0.04, p.D * 0.0009);
    const rail = new THREE.Mesh(ring(r - 0.1, railTube, cut), mat.rail);
    rail.position.y = railH;
    roofG.add(rail);
    const postCount = Math.min(140, Math.max(16, Math.round((Math.PI * p.D) / 2.4)));
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(railTube * 0.8, railTube * 0.8, railH, 6), mat.rail, postCount);
    const tmp = new THREE.Object3D();
    let used = 0;
    for (let k = 0; k < postCount; k++) {
      const th = (k / postCount) * Math.PI * 2;
      if (!visibleAngle(th, cut)) continue;
      tmp.position.copy(polar(r - 0.1, th, railH / 2));
      tmp.updateMatrix();
      posts.setMatrixAt(used++, tmp.matrix);
    }
    posts.count = used;
    roofG.add(posts);
    model.add(roofG);

    // Floating roof deck rides on the liquid
    let deck = null;
    if (p.roof === 'floating') {
      deck = new THREE.Group();
      const d = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.975, r * 0.975, 0.7, SEG), mat.deck);
      d.position.y = 0.35;
      deck.add(d);
      const rim = new THREE.Mesh(ring(r * 0.975, 0.12, false), mat.dark);
      rim.position.y = 0.7;
      deck.add(rim);
      model.add(deck);
    }

    // Liquid (unit height, scaled to the level each frame)
    const liqGeo = new THREE.CylinderGeometry(r * 0.985, r * 0.985, 1, SEG);
    liqGeo.translate(0, 0.5, 0);
    const liquid = new THREE.Mesh(liqGeo, mat.liquid);
    model.add(liquid);

    // Extras: spiral stair, nozzles, manway, person for scale
    const extras = new THREE.Group();
    const steps = Math.max(12, Math.round(H / 0.2));
    const rStair = r + 0.65;
    const dTh = Math.min(0.27 / rStair, 2.4 / steps);
    const thS = -2.75;
    const stepMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.05, 1.0), mat.stair, steps);
    const railPts = [];
    const stringerPts = [];
    for (let k = 0; k < steps; k++) {
      const th = thS + k * dTh;
      const y = ((k + 1) / steps) * H;
      tmp.position.copy(polar(rStair, th, y));
      tmp.rotation.set(0, th, 0);
      tmp.updateMatrix();
      stepMesh.setMatrixAt(k, tmp.matrix);
      if (k % 3 === 0 || k === steps - 1) {
        railPts.push(polar(rStair + 0.5, th, y + 0.95));
        stringerPts.push(polar(rStair + 0.5, th, y - 0.12));
      }
    }
    extras.add(stepMesh);
    const stairRail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), steps, Math.max(0.035, railTube), 6), mat.rail);
    const stringer = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stringerPts), steps, 0.07, 6), mat.stair);
    extras.add(stairRail, stringer);

    const nozzle = (th, y, rad, len, cover) => {
      const g = new THREE.Group();
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 24), mat.dark);
      neck.geometry.rotateX(Math.PI / 2);
      neck.position.z = len / 2;
      g.add(neck);
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(rad * (cover ? 1.35 : 1.6), rad * (cover ? 1.35 : 1.6), cover ? 0.1 : 0.07, 32), cover ? mat.roof : mat.dark);
      flange.geometry.rotateX(Math.PI / 2);
      flange.position.z = len;
      g.add(flange);
      g.position.copy(polar(r - 0.05, th, y));
      g.rotation.y = th;
      return g;
    };
    extras.add(nozzle(1.85, 1.0, 0.2, 0.75, false));
    extras.add(nozzle(2.3, 1.0, 0.15, 0.65, false));
    extras.add(nozzle(-0.5, 0.95, 0.38, 0.5, true));   // manway

    const person = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.0, 4, 10), mat.person);
    body.position.y = 0.72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat.person);
    head.position.y = 1.48;
    person.add(body, head);
    body.userData.person = head.userData.person = true;
    person.position.copy(polar(r + 2.6, -3.0, -0.5));
    extras.add(person);
    model.add(extras);

    parts = { courses, roofG, deck, liquid, extras, stepMesh, stairRail, stringer, rh, gap: ch * 0.5 };
    hoverables = [...courses.map((c) => c.plate), body, head];

    // Fit: largest of width or height maps to ~9 scene units
    const s = 9 / Math.max(p.D, (H + rh) * 1.2);
    model.scale.setScalar(s);
    styleCourses();
    apply(0);
  }

  function update(params) {
    p = { ...params };
    styleCourses();
  }

  // ---- per-frame ----
  let targetY = 3;
  function apply(dt) {
    if (!parts) return;
    const n = p.n;
    const H = p.H;
    const endBuild = n * STAGGER + 2.2;
    if (build < endBuild) build += dt * (endBuild / 2.2);
    explode += ((p.exploded ? 1 : 0) - explode) * Math.min(1, dt * 7);
    if (reduceMotion) explode = p.exploded ? 1 : 0;
    const E = explode;
    const gap = parts.gap;

    parts.courses.forEach((c, i) => {
      const k = ease(build - i * STAGGER);
      c.g.position.y = c.y0 + i * gap * E;
      c.plate.scale.y = Math.max(0.0001, c.h * k);
      c.plate.visible = k > 0.001;
      c.seam.visible = k > 0.98;
    });
    const kr = ease(build - n * STAGGER);
    parts.roofG.visible = kr > 0.001;
    parts.roofG.position.y = H + n * gap * E + (1 - kr) * H * 0.35;

    const ke = build - n * STAGGER - 0.6;
    parts.extras.visible = ke > 0;
    const stairOn = E < 0.03;
    parts.stepMesh.visible = parts.stairRail.visible = parts.stringer.visible = stairOn;

    const want = ke > 0 ? Math.max(0.02, p.fill * H) : 0.0001;
    level = reduceMotion ? want : level + (want - level) * Math.min(1, dt * 3);
    parts.liquid.scale.y = Math.max(0.0001, level);
    parts.liquid.visible = level > 0.01;
    if (parts.deck) {
      parts.deck.visible = ke > 0;
      parts.deck.position.y = Math.max(0.3, level - 0.35);
    }

    const s = model.scale.x;
    targetY = s * (H + n * gap * E + parts.rh) * 0.45;
  }

  // ---- hover picking ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) return onHover(null);
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hoverables, false).find((h) => h.object.visible && h.object.parent.visible);
    if (!hit) return onHover(null);
    if (hit.object.userData.person) onHover('person', e.clientX, e.clientY);
    else onHover(hit.object.userData.course, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', () => onHover(null));

  function highlight(i) {
    hi = i;
    styleCourses();
  }

  // ---- sizing ----
  let aspect = 1;
  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  // ---- loop, paused while off screen ----
  let running = false;
  let last = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    apply(dt);
    controls.target.y += (targetY - controls.target.y) * Math.min(1, dt * 5);
    const wantDist = BASE_DIST * zoomF * Math.max(1, 1.3 / aspect);
    distNow += (wantDist - distNow) * Math.min(1, dt * 6);
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, distNow);
    controls.update();
    renderer.render(scene, camera);
  }
  new IntersectionObserver((entries) => {
    const vis = entries.some((e) => e.isIntersecting);
    if (vis && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!vis) {
      running = false;
    }
  }).observe(wrap);

  return {
    rebuild,
    update,
    highlight,
    zoom(f) { zoomF = Math.min(1.7, Math.max(0.5, zoomF * f)); },
    reset() {
      zoomF = 1;
      camera.position.copy(controls.target).addScaledVector(HOME_DIR, distNow);
      controls.autoRotate = !reduceMotion;
    },
  };
}
