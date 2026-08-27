import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import {
  getGroundPlaneY,
  getBurstProgressStep,
  getInstrumentSceneState,
  getInteractionResponseStep,
  getModelDragRotation,
  getModelDragReturnStep,
  getMobileSceneComposition,
  getParticleColor,
  getPointerNdc,
  getRenderPixelRatio,
  recenterVectorTriplets,
  getScrollSceneState,
  getScrollTransitionStep,
  getTunnelReleaseAmount,
  shouldRenderFormShadows,
  shouldUpdateParticlePointer
} from './model-effects.js';
import { getSpectacleScrollState } from './interactive-effects.js';
import { enableMeshRaycastAcceleration } from './mesh-raycast.js';
import { mountMotionEffects } from './motion-effects.js';
import { mountInstrumentControls, mountReadingResponses, mountTextInteractions } from './text-interactions.js';
import './styles.css';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const stateLabel = document.querySelector('#state-label');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(getRenderPixelRatio(window.devicePixelRatio, window.innerWidth));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xeef0ec, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.55, 7.4);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

scene.add(new THREE.HemisphereLight(0xfff9e3, 0xa4b8ac, 2.2));
const keyLight = new THREE.DirectionalLight(0xfff3cf, 3.5);
keyLight.position.set(4, 6, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -7;
keyLight.shadow.camera.right = 7;
keyLight.shadow.camera.top = 7;
keyLight.shadow.camera.bottom = -7;
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 20;
keyLight.shadow.normalBias = 0.016;
keyLight.shadow.bias = -0.00008;
keyLight.shadow.radius = 3;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xcfe4ff, 1.2);
fillLight.position.set(-5, 2, 2);
scene.add(fillLight);

const assetRoot = new THREE.Group();
assetRoot.position.y = -0.2;
scene.add(assetRoot);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 18),
  new THREE.ShadowMaterial({ color: 0x7b867e, opacity: 0.18 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.frustumCulled = false;
floor.visible = false;
scene.add(floor);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.minDistance = 4.8;
controls.maxDistance = 10;
controls.minPolarAngle = Math.PI * 0.33;
controls.maxPolarAngle = Math.PI * 0.66;
controls.target.set(0, -0.2, 0);
controls.autoRotate = false;
controls.enableRotate = false;

let model;
let particleSystem;
let particleColors;
let particleCount = 0;
let loadError = false;
let targetScroll = 0;
let smoothScroll = 0;
let targetMorph = 0;
let smoothMorph = 0;
let targetBurst = 0;
let smoothBurst = 0;
let burstRetreating = false;
let targetRotation = 0;
let smoothRotation = 0;
let pointer = new THREE.Vector2(0, 0);
let pointerTarget = new THREE.Vector2(0, 0);
let hasPointer = false;
let pointerPresence = 0;
let time = 0;
let lastFrameTime = 0;
let lastRaycastPointer = new THREE.Vector2(99, 99);
let lastRaycastRotation = Number.POSITIVE_INFINITY;
let lastRaycastPosition = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
let lastRaycastScale = Number.POSITIVE_INFINITY;
let pointerHasHit = false;
const pointerRaycaster = new THREE.Raycaster();
pointerRaycaster.firstHitOnly = true;
const pointerLocal = new THREE.Vector3();
const particlePointerTarget = new THREE.Vector3();
const previousParticlePointer = new THREE.Vector3();
const particlePointerMotion = new THREE.Vector3();
let hasParticlePointer = false;
const modelDrag = {
  yaw: 0,
  pitch: 0,
  isDragging: false,
  pointerId: null,
  lastX: 0,
  lastY: 0
};
let motionEffects;
let modelReady = false;
let loadFailed = false;
let modelIntroStarted = false;
let modelIntroTimeline;
let instrumentControls;
let applicationVisible = false;
const instrumentMotion = {
  modelPitch: 0,
  modelYaw: 0,
  modelRoll: 0,
  modelWarmth: 0,
  modelBreath: 0,
  lightX: 0,
  lightY: 0,
  lightIntensity: 0,
  lightWarmth: 0,
  surfaceRoughness: 1,
  surfaceGloss: 0,
  surfaceDistortion: 0,
  particleVibration: 0,
  particleSpeed: 0,
  particleRandomness: 0,
  particleInteraction: 0,
  typographySignal: 0
};
const baseKeyLight = { x: 4, y: 6, z: 6, intensity: 3.5 };
const baseKeyLightColor = new THREE.Color(0xfff3cf);
const warmKeyLightColor = new THREE.Color(0xffdd7b);
const warmMaterialTint = new THREE.Color(0xffe47b);
const polishedSpecular = new THREE.Color(0xfff4bf);
const BASE_MODEL_SATURATION = 1.14;
const modelEntrance = {
  opacity: 0,
  scale: 0.82,
  squash: 1.18,
  lift: 0.22,
  tilt: 0.1,
  roll: -0.05
};

function setInstrumentState(state) {
  const next = getInstrumentSceneState(state);
  gsap.to(instrumentMotion, {
    modelPitch: next.model.pitch,
    modelYaw: next.model.yaw,
    modelRoll: next.model.roll,
    modelWarmth: next.model.warmth,
    modelBreath: next.model.breath,
    lightX: next.light.x,
    lightY: next.light.y,
    lightIntensity: next.light.intensity,
    lightWarmth: next.light.warmth,
    surfaceRoughness: next.surface.roughness,
    surfaceGloss: next.surface.glossLevel,
    surfaceDistortion: next.surface.distortion,
    particleVibration: next.particles.vibration,
    particleSpeed: next.particles.speed,
    particleRandomness: next.particles.randomness,
    particleInteraction: next.particles.interaction,
    typographySignal: next.typography.signal,
    duration: 0.72,
    ease: 'power3.out',
    overwrite: 'auto'
  });
}

function playModelIntro() {
  if (!model) return;

  modelIntroTimeline?.kill();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    Object.assign(modelEntrance, { opacity: 1, scale: 1, squash: 1, lift: 0, tilt: 0, roll: 0 });
    return;
  }

  gsap.set(modelEntrance, { opacity: 0, scale: 0.82, squash: 1.18, lift: 0.22, tilt: 0.1, roll: -0.05 });
  modelIntroTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
    .to(modelEntrance, {
      opacity: 1,
      scale: 1.04,
      squash: 0.9,
      lift: 0.02,
      tilt: -0.035,
      roll: 0.025,
      duration: 0.62,
      ease: 'power3.out'
    })
    .to(modelEntrance, {
      scale: 1,
      squash: 1,
      lift: 0,
      tilt: 0,
      roll: 0,
      duration: 0.82,
      ease: 'elastic.out(1, 0.42)'
    }, '-=0.12');
}

function syncIntroState() {
  if (!motionEffects || !applicationVisible) return;
  if (loadFailed) {
    motionEffects.revealFallback();
    return;
  }
  if (modelReady) {
    motionEffects.playIntro();
    if (!modelIntroStarted) {
      modelIntroStarted = true;
      playModelIntro();
    }
  }
}

const loader = new FBXLoader();
loader.load(
  '/models/奶娃blender.fbx',
  (fbx) => {
    model = fbx;
    normalizeModel(model);
    assetRoot.add(model);
    model.updateMatrixWorld(true);
    waitForTextureMaps(model);
  },
  undefined,
  (error) => {
    loadError = true;
    loadFailed = true;
    syncIntroState();
    loading.innerHTML = '<span class="loading-dot"></span><span>MODEL LOAD ERROR</span>';
    console.error('FBX load failed', error);
  }
);

function normalizeModel(root) {
  root.position.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.85 / maxSize;
  root.scale.setScalar(scale);
  root.position.copy(center).multiplyScalar(-scale);
  root.traverse((child) => {
    if (!child.isMesh) return;
    enableMeshRaycastAcceleration(child);
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;
      material.transparent = true;
      material.userData.baseOpacity = material.opacity ?? 1;
      material.userData.baseRoughness = material.roughness ?? 0.64;
      material.userData.baseMetalness = material.metalness ?? 0.02;
      material.userData.baseShininess = material.shininess ?? 30;
      material.userData.baseSpecular = material.specular?.clone?.() ?? new THREE.Color(0x1c180a);
      material.userData.dissolve = 0;
      material.userData.surfaceDistortion = 0;
      material.alphaMap = null;
      material.alphaTest = 0;
      material.side = THREE.DoubleSide;
      if (material.emissive) material.emissive.set(0x000000);
      if ('emissiveMap' in material) material.emissiveMap = null;
      if ('roughness' in material) material.roughness = material.roughness ?? 0.64;
      if ('metalness' in material) material.metalness = material.metalness ?? 0.02;
      material.vertexColors = false;
      if (material.map) {
        material.color.set(0xffffff);
      } else {
        material.color.set(0xf3d861);
      }
      material.userData.baseColor = material.color.clone();
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uDissolve = { value: material.userData.dissolve };
        shader.uniforms.uSurfaceDistortion = { value: material.userData.surfaceDistortion };
        shader.uniforms.uDistortionTime = { value: 0 };
        shader.uniforms.uColorSaturation = { value: BASE_MODEL_SATURATION };
        shader.vertexShader = `uniform float uSurfaceDistortion;\nuniform float uDistortionTime;\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec3 liquidDirection = normalize(position + vec3(0.0001));
          float liquidWave = sin((position.y - position.x * 0.58) * 12.0 + uDistortionTime * 0.0022);
          transformed += liquidDirection * liquidWave * uSurfaceDistortion * 0.055;`
        );
        shader.fragmentShader = `uniform float uDissolve;\nuniform float uColorSaturation;\n${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(vec3(luma), diffuseColor.rgb, uColorSaturation);`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <alphatest_fragment>',
          `#include <alphatest_fragment>
          float dissolveNoise = fract(sin(dot(floor(gl_FragCoord.xy * 0.72), vec2(12.9898, 78.233))) * 43758.5453);
          if (dissolveNoise < uDissolve) discard;`
        );
        material.userData.dissolveShader = shader;
      };
      material.customProgramCacheKey = () => 'naiwa-dissolve-v1';
      material.needsUpdate = true;
    });
  });
  root.updateMatrixWorld(true);
  root.userData.groundY = new THREE.Box3().setFromObject(root).min.y;
}

function gaussianRandom() {
  const u = Math.max(Math.random(), 0.000001);
  const v = Math.max(Math.random(), 0.000001);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function createTextureSampler(texture) {
  const image = texture?.image;
  const width = image?.naturalWidth || image?.videoWidth || image?.width;
  const height = image?.naturalHeight || image?.videoHeight || image?.height;
  if (!image || !width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  try {
    context.drawImage(image, 0, 0, width, height);
    return { data: context.getImageData(0, 0, width, height).data, width, height, flipY: texture.flipY };
  } catch {
    return null;
  }
}

function getMeshTextureSampler(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const textured = materials.find((material) => material?.map?.image);
  return textured ? createTextureSampler(textured.map) : null;
}

function sampleTextureColor(textureSampler, uv, out = { r: 0.88, g: 0.72, b: 0.18 }) {
  if (!textureSampler || !uv) return out;
  const u = ((uv.x % 1) + 1) % 1;
  const v = ((uv.y % 1) + 1) % 1;
  const x = Math.min(textureSampler.width - 1, Math.max(0, Math.floor(u * (textureSampler.width - 1))));
  const yUv = textureSampler.flipY ? 1 - v : v;
  const y = Math.min(textureSampler.height - 1, Math.max(0, Math.floor(yUv * (textureSampler.height - 1))));
  const offset = (y * textureSampler.width + x) * 4;
  out.r = textureSampler.data[offset] / 255;
  out.g = textureSampler.data[offset + 1] / 255;
  out.b = textureSampler.data[offset + 2] / 255;
  return out;
}

function waitForTextureMaps(root, retries = 45) {
  const textures = [];
  root.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material?.map) textures.push(material.map);
    });
  });
  const ready = textures.length === 0 || textures.every((texture) => texture.image && (texture.image.naturalWidth || texture.image.width));
  if (ready || retries <= 0) {
    buildParticles(root);
    modelReady = true;
    syncIntroState();
    return;
  }
  requestAnimationFrame(() => waitForTextureMaps(root, retries - 1));
}

function getGeometrySurfaceArea(geometry) {
  const position = geometry.attributes.position;
  if (!position) return 0;

  const index = geometry.index;
  const triangleCount = Math.floor((index ? index.count : position.count) / 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();
  let area = 0;

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const ai = index ? index.getX(offset) : offset;
    const bi = index ? index.getX(offset + 1) : offset + 1;
    const ci = index ? index.getX(offset + 2) : offset + 2;
    a.fromBufferAttribute(position, ai);
    b.fromBufferAttribute(position, bi);
    c.fromBufferAttribute(position, ci);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    area += cross.crossVectors(ab, ac).length() * 0.5;
  }

  return area;
}

function buildParticles(root) {
  const points = [];
  const normals = [];
  const drifts = [];
  const bursts = [];
  const scales = [];
  const phases = [];
  const colors = [];
  const color = new THREE.Color();
  const sampleMeshes = [];

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;
    const area = getGeometrySurfaceArea(child.geometry);
    if (area > 0) sampleMeshes.push({ mesh: child, area, textureSampler: getMeshTextureSampler(child) });
  });

  const totalArea = sampleMeshes.reduce((sum, entry) => sum + entry.area, 0);
  const surfaceSamples = window.innerWidth < 760 ? 12000 : 22000;
  let sampled = 0;

  const addSplat = (point, normal, inset, textureColor) => {
    const splatPoint = point.clone().addScaledVector(normal, -inset);
    const drift = new THREE.Vector3(gaussianRandom(), gaussianRandom(), gaussianRandom()).multiplyScalar(0.19);
    const burst = splatPoint.clone().multiplyScalar(0.48).add(drift);
    if (burst.lengthSq() < 0.0001) burst.set(gaussianRandom(), gaussianRandom(), gaussianRandom());
    burst.z *= 0.36;
    burst.normalize().multiplyScalar(0.62 + Math.min(0.86, Math.abs(gaussianRandom()) * 0.38));

    points.push(splatPoint.x, splatPoint.y, splatPoint.z);
    normals.push(normal.x, normal.y, normal.z);
    drifts.push(drift.x, drift.y, drift.z);
    bursts.push(burst.x, burst.y, burst.z);
    scales.push(0.82 + Math.random() * 0.48);
    phases.push(Math.random() * Math.PI * 2);
    const particleColor = getParticleColor(textureColor);
    color.setRGB(particleColor.r, particleColor.g, particleColor.b);
    colors.push(color.r, color.g, color.b);
  };

  sampleMeshes.forEach(({ mesh, area, textureSampler }, meshIndex) => {
    const remainingMeshes = sampleMeshes.length - meshIndex;
    const remainingSamples = surfaceSamples - sampled;
    const sampleCount = meshIndex === sampleMeshes.length - 1
      ? remainingSamples
      : Math.max(1, Math.round((area / totalArea) * surfaceSamples));
    const sampler = new MeshSurfaceSampler(mesh).build();
    const local = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const uv = new THREE.Vector2();
    const textureColor = { r: 0.88, g: 0.72, b: 0.18 };
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const quota = Math.min(sampleCount, remainingSamples - (remainingMeshes - 1));
    for (let i = 0; i < quota; i += 1) {
      sampler.sample(local, normal, undefined, uv);
      mesh.localToWorld(local);
      assetRoot.worldToLocal(local);
      normal.applyMatrix3(normalMatrix).normalize();
      sampleTextureColor(textureSampler, uv, textureColor);
      addSplat(local, normal, 0, textureColor);
      addSplat(local, normal, 0.024 + Math.random() * 0.052, textureColor);
    }
    sampled += quota;
  });
  const particleCenter = new THREE.Vector3();
  for (let index = 0; index < points.length; index += 3) {
    particleCenter.x += points[index];
    particleCenter.y += points[index + 1];
    particleCenter.z += points[index + 2];
  }
  particleCenter.multiplyScalar(1 / Math.max(1, points.length / 3));
  recenterVectorTriplets(drifts);
  recenterVectorTriplets(bursts);
  particleCount = points.length / 3;
  particleColors = new Float32Array(colors);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('aDrift', new THREE.BufferAttribute(new Float32Array(drifts), 3));
  geometry.setAttribute('aBurst', new THREE.BufferAttribute(new Float32Array(bursts), 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(new Float32Array(scales), 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(phases), 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uSize: { value: 0.118 },
      uTransition: { value: 0 },
      uBurst: { value: 0 },
      uDistortion: { value: 0 },
      uTunnel: { value: 0 },
      uInstrumentVibration: { value: 0 },
      uParticleSpeed: { value: 0 },
      uParticleRandomness: { value: 0 },
      uParticleInteraction: { value: 0 },
      uParticleCenter: { value: particleCenter },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector3() },
      uPointerActive: { value: 0 },
      uPointerMotion: { value: new THREE.Vector3() }
    },
    vertexShader: `
      attribute vec3 color;
      attribute vec3 aNormal;
      attribute vec3 aDrift;
      attribute vec3 aBurst;
      attribute float aScale;
      attribute float aPhase;
      varying vec3 vColor;
      uniform float uSize;
      uniform float uTransition;
      uniform float uBurst;
      uniform float uDistortion;
      uniform float uTunnel;
      uniform float uInstrumentVibration;
      uniform float uParticleSpeed;
      uniform float uParticleRandomness;
      uniform float uParticleInteraction;
      uniform vec3 uParticleCenter;
      uniform float uTime;
      uniform vec3 uPointer;
      uniform float uPointerActive;
      uniform vec3 uPointerMotion;
      void main() {
        vColor = color;
        float entered = smoothstep(0.0, 0.68, uTransition);
        float splash = sin(clamp(uTransition, 0.0, 1.0) * 3.14159265);
        float signalTime = uTime * (1.0 + uParticleSpeed * 8.5);
        float breath = sin(aPhase + signalTime * 0.00055) * 0.009 * entered;
        float speedFlow = sin(aPhase * 3.7 + signalTime * 0.0018);
        float burst = smoothstep(0.0, 1.0, uBurst);
        float burstRelease = burst;
        float releaseSettle = 1.0 - smoothstep(0.0, 0.24, burstRelease);
        vec3 splatPosition = position;
        splatPosition += aDrift * (0.035 + splash * 1.34) * releaseSettle;
        splatPosition += aNormal * (0.016 + splash * 0.12 + breath) * releaseSettle;
        float chaosWave = sin(aPhase * 6.0 + signalTime * 0.00135) * uParticleRandomness;
        splatPosition += aDrift * chaosWave * 0.34 * entered * (1.0 - burst) * releaseSettle;
        splatPosition += aNormal * chaosWave * 0.038 * entered * (1.0 - burst) * releaseSettle;
        splatPosition += aDrift * speedFlow * 0.09 * uParticleSpeed * entered * (1.0 - burst) * releaseSettle;
        vec3 interactionVector = position - uPointer;
        float interactionDistance = max(length(interactionVector), 0.0001);
        float interactionInfluence = exp(-interactionDistance * interactionDistance * 1.55);
        float ripple = sin(interactionDistance * 14.0 - signalTime * 0.008 + aPhase * 1.7) * 0.5 + 0.5;
        float interactionStrength = interactionInfluence * (0.22 + ripple * 0.15) * uPointerActive * uParticleInteraction;
        vec3 radialDirection = interactionVector / interactionDistance;
        vec3 swirlAxis = normalize(aNormal + vec3(0.0001, 0.0, 0.0));
        vec3 tangentDirection = cross(swirlAxis, radialDirection);
        tangentDirection /= max(length(tangentDirection), 0.0001);
        float pointerSpeed = clamp(length(uPointerMotion) * 6.2, 0.0, 1.0);
        float swirlStrength = interactionInfluence * (0.045 + pointerSpeed * 0.16 + ripple * 0.05) * uPointerActive * uParticleInteraction;
        vec3 microDirection = normalize(aDrift + aNormal * 0.42 + vec3(sin(aPhase * 7.0), cos(aPhase * 5.0), sin(aPhase * 3.0)) * 0.08);
        vec3 interactionDirection = normalize(radialDirection * 0.72 + aNormal * 0.22 + microDirection * 0.16);
        splatPosition += interactionDirection * interactionStrength * uTransition * (1.0 - burst) * releaseSettle;
        splatPosition += tangentDirection * swirlStrength * uTransition * (1.0 - burst) * releaseSettle;
        splatPosition += aDrift * interactionInfluence * (0.022 + ripple * 0.065) * uPointerActive * uParticleInteraction * uTransition * (1.0 - burst) * releaseSettle;
        splatPosition.y += sin(signalTime * 0.0012 + aPhase * 11.0) * 0.014 * interactionInfluence * uPointerActive * uParticleInteraction * uTransition * (1.0 - burst) * releaseSettle;
        float distortionWave = sin((position.y + position.x * 0.62 + uTime * 0.00085) * 12.0 + aPhase) * uDistortion;
        splatPosition += aNormal * distortionWave * 0.085 * releaseSettle;
        float instrumentWave = sin(aPhase * 5.0 + signalTime * 0.0011) * uInstrumentVibration;
        splatPosition += aNormal * instrumentWave * 0.032 * entered * (1.0 - burst) * releaseSettle;
        vec3 tunnelDirection = normalize(vec3(splatPosition.xy * 0.28 + aDrift.xy * 0.12, 1.0));
        splatPosition += tunnelDirection * uTunnel * (1.24 + aScale * 0.42) * releaseSettle;
        splatPosition += aBurst * (4.7 * burstRelease);
        float releaseMotion = burstRelease * sin(uTime * 0.00135);
        float releaseSwirl = burstRelease * cos(uTime * 0.00135);
        vec3 centeredSwirl = vec3(-aBurst.y, aBurst.x, 0.0);
        splatPosition += aBurst * (releaseMotion * 0.075);
        splatPosition += centeredSwirl * (releaseSwirl * 0.035);
        splatPosition -= uParticleCenter * entered;
        vec4 viewPosition = modelViewMatrix * vec4(splatPosition, 1.0);
        float pulse = 1.0 + sin(signalTime * 0.00055 + aPhase) * 0.045 * uTransition;
        float interactionPulse = 1.0 + ripple * 0.12 * interactionInfluence * uPointerActive * uParticleInteraction * uTransition * (1.0 - burst) * releaseSettle;
        float releasePulse = 1.0 + sin(uTime * 0.00135) * 0.055 * burstRelease;
        gl_PointSize = uSize * aScale * (300.0 / max(1.0, -viewPosition.z)) * mix(0.16, 1.0, entered) * mix(1.0, 1.18, burstRelease) * pulse * interactionPulse * releasePulse;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uOpacity;
      uniform float uBurst;
      void main() {
        vec2 centered = gl_PointCoord * 2.0 - 1.0;
        float radiusSquared = dot(centered, centered);
        if (radiusSquared > 1.0) discard;
        float gaussian = exp(-radiusSquared * 4.5);
        float alpha = gaussian * uOpacity * mix(1.0, 0.88, uBurst);
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    toneMapped: false
  });
  particleSystem = new THREE.Points(geometry, material);
  particleSystem.frustumCulled = false;
  assetRoot.add(particleSystem);
}

function setModelState(opacity, dissolve, surfaceDistortion = 0) {
  if (!model) return;
  const surfaceRoughness = THREE.MathUtils.clamp(instrumentMotion.surfaceRoughness, 0, 1);
  const surfaceGloss = THREE.MathUtils.clamp(instrumentMotion.surfaceGloss, 0, 1);
  const glossResponse = Math.pow(surfaceGloss, 1.5);
  const roughnessResponse = Math.pow(1 - surfaceRoughness, 1.65);
  const phongShininess = 4 + roughnessResponse * (10 + glossResponse * 172);
  model.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;
      material.opacity = (material.userData.baseOpacity ?? 1) * opacity;
      material.depthWrite = dissolve < 0.03;
      if ('roughness' in material) material.roughness = THREE.MathUtils.lerp(0.08, 0.96, surfaceRoughness);
      if ('metalness' in material) material.metalness = THREE.MathUtils.clamp((material.userData.baseMetalness ?? 0.02) + glossResponse * 0.34, 0, 0.5);
      if ('shininess' in material) material.shininess = phongShininess;
      if (material.specular && material.userData.baseSpecular) {
        material.specular.copy(material.userData.baseSpecular).lerp(polishedSpecular, glossResponse);
      }
      if ('reflectivity' in material) material.reflectivity = THREE.MathUtils.lerp(0.08, 0.9, glossResponse);
      if (material.color && material.userData.baseColor) {
        material.color.copy(material.userData.baseColor).lerp(warmMaterialTint, instrumentMotion.modelWarmth);
      }
      material.userData.dissolve = dissolve;
      material.userData.surfaceDistortion = surfaceDistortion;
      if (material.userData.dissolveShader) {
        material.userData.dissolveShader.uniforms.uDissolve.value = dissolve;
        material.userData.dissolveShader.uniforms.uSurfaceDistortion.value = surfaceDistortion;
        material.userData.dissolveShader.uniforms.uDistortionTime.value = time;
      }
    });
    child.castShadow = dissolve < 0.58;
  });
}

function onScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const nextScroll = THREE.MathUtils.clamp(window.scrollY / max, 0, 1);
  const delta = nextScroll - targetScroll;

  if (delta < -0.00005) burstRetreating = true;
  if (delta > 0.00005) burstRetreating = false;

  targetScroll = nextScroll;
}

function updateModelDrag(deltaSeconds) {
  modelDrag.yaw = getModelDragReturnStep({
    current: modelDrag.yaw,
    dragging: modelDrag.isDragging,
    deltaSeconds
  });
  modelDrag.pitch = getModelDragReturnStep({
    current: modelDrag.pitch,
    dragging: modelDrag.isDragging,
    deltaSeconds
  });
}

function updateSceneState(deltaSeconds) {
  smoothScroll = getScrollTransitionStep({
    current: smoothScroll,
    target: targetScroll,
    deltaSeconds,
    rate: 8
  });
  const scrollState = getScrollSceneState(smoothScroll);
  targetMorph = scrollState.morph;
  targetBurst = scrollState.burst;
  targetRotation = scrollState.rotation;
  smoothMorph = getScrollTransitionStep({
    current: smoothMorph,
    target: targetMorph,
    deltaSeconds,
    rate: 9
  });
  smoothBurst = getBurstProgressStep({
    current: smoothBurst,
    target: targetBurst,
    deltaSeconds,
    retreating: burstRetreating
  });
  smoothRotation = getScrollTransitionStep({
    current: smoothRotation,
    target: targetRotation,
    deltaSeconds,
    rate: 7.5
  });
  updateModelDrag(deltaSeconds);
  pointer.lerp(pointerTarget, 0.09);
  const spectacle = getSpectacleScrollState(smoothScroll);
  const tunnelRelease = getTunnelReleaseAmount({
    tunnel: spectacle.tunnel,
    burstIntent: targetBurst
  });
  document.documentElement.style.setProperty('--grid-opacity', spectacle.grid.toFixed(3));
  const dissolve = THREE.MathUtils.smoothstep(smoothMorph, 0.08, 0.96);
  const modelOpacity = (1 - THREE.MathUtils.smoothstep(smoothMorph, 0.72, 1)) * modelEntrance.opacity;
  const softBreath = Math.sin(time * 0.0013) * instrumentMotion.modelBreath;
  const surfaceDistortion = (spectacle.distortion * (0.18 + pointerPresence * 0.82) + instrumentMotion.surfaceDistortion + softBreath) * (1 - smoothMorph * 0.42);
  setModelState(modelOpacity, dissolve, surfaceDistortion);
  keyLight.position.set(baseKeyLight.x + instrumentMotion.lightX, baseKeyLight.y + instrumentMotion.lightY, baseKeyLight.z);
  keyLight.intensity = baseKeyLight.intensity + instrumentMotion.lightIntensity;
  keyLight.color.copy(baseKeyLightColor).lerp(warmKeyLightColor, instrumentMotion.lightWarmth + instrumentMotion.modelWarmth * 0.45);
  document.documentElement.style.setProperty('--instrument-signal', instrumentMotion.typographySignal.toFixed(3));
  keyLight.castShadow = shouldRenderFormShadows(smoothMorph, smoothBurst);
  const isMobile = window.innerWidth < 760;
  const mobileComposition = getMobileSceneComposition(smoothScroll);
  const composition = isMobile ? mobileComposition : { x: 0, y: 0, scale: 1 };
  assetRoot.position.x = THREE.MathUtils.lerp(assetRoot.position.x, composition.x, 0.08);
  assetRoot.position.y = THREE.MathUtils.lerp(assetRoot.position.y, (isMobile ? 0.25 : -0.2) + composition.y + modelEntrance.lift, 0.08);
  const rootScale = THREE.MathUtils.lerp(assetRoot.scale.x, composition.scale * modelEntrance.scale, 0.08);
  const squashX = 1 + (modelEntrance.squash - 1) * 0.42;
  const squashY = 1 - (modelEntrance.squash - 1) * 0.58;
  assetRoot.scale.set(rootScale * squashX, rootScale * squashY, rootScale);
  assetRoot.rotation.y = smoothRotation + instrumentMotion.modelYaw + modelDrag.yaw;
  updateFloor();
  if (particleSystem) {
    const particleOpacity = THREE.MathUtils.clamp(THREE.MathUtils.smoothstep(smoothMorph, 0.02, 0.82) * (0.78 - tunnelRelease * 0.18), 0, 0.92);
    particleSystem.material.uniforms.uOpacity.value = particleOpacity;
    particleSystem.material.uniforms.uTransition.value = smoothMorph;
    particleSystem.material.uniforms.uBurst.value = smoothBurst;
    particleSystem.material.uniforms.uDistortion.value = spectacle.distortion * (0.22 + pointerPresence * 0.78);
    particleSystem.material.uniforms.uTunnel.value = tunnelRelease;
    particleSystem.material.uniforms.uInstrumentVibration.value = instrumentMotion.particleVibration;
    particleSystem.material.uniforms.uParticleSpeed.value = instrumentMotion.particleSpeed;
    particleSystem.material.uniforms.uParticleRandomness.value = instrumentMotion.particleRandomness;
    particleSystem.material.uniforms.uParticleInteraction.value = instrumentMotion.particleInteraction;
    particleSystem.material.uniforms.uTime.value = time;
  }
  const state = smoothMorph < 0.04 ? 'FORM' : tunnelRelease > 0.1 ? 'TUNNEL' : smoothBurst < 0.08 ? 'FIELD' : 'BURST';
  stateLabel.textContent = state;
}

function updateFloor() {
  const presence = (1 - smoothMorph) * (1 - smoothBurst);
  floor.visible = Boolean(model && presence > 0.01);
  floor.material.opacity = 0.18 * presence;
  if (!model) return;
  floor.position.set(
    assetRoot.position.x,
    getGroundPlaneY(model.userData.groundY, assetRoot.position.y, assetRoot.scale.y),
    assetRoot.position.z
  );
}

const RAYCAST_THROTTLE_NDC = 0.003;
const RAYCAST_ROTATION_EPSILON = 0.002;
const RAYCAST_POSITION_EPSILON_SQ = 0.000025;
const RAYCAST_SCALE_EPSILON = 0.002;
function updateParticlePointer(deltaSeconds) {
  if (!particleSystem || !model) return;
  const pointerMoved = pointerTarget.distanceToSquared(lastRaycastPointer) >= RAYCAST_THROTTLE_NDC ** 2;
  const sceneMoved =
    Math.abs(assetRoot.rotation.y - lastRaycastRotation) >= RAYCAST_ROTATION_EPSILON ||
    assetRoot.position.distanceToSquared(lastRaycastPosition) >= RAYCAST_POSITION_EPSILON_SQ ||
    Math.abs(assetRoot.scale.x - lastRaycastScale) >= RAYCAST_SCALE_EPSILON;

  if (!hasPointer || smoothMorph < 0.05) {
    pointerHasHit = false;
    hasParticlePointer = false;
  }
  if (shouldUpdateParticlePointer({ hasPointer, morph: smoothMorph, pointerMoved, sceneMoved })) {
    lastRaycastPointer.copy(pointerTarget);
    lastRaycastRotation = assetRoot.rotation.y;
    lastRaycastPosition.copy(assetRoot.position);
    lastRaycastScale = assetRoot.scale.x;
    assetRoot.updateWorldMatrix(true, true);
    camera.updateMatrixWorld();
    pointerRaycaster.setFromCamera(pointerTarget, camera);
    const intersection = pointerRaycaster.intersectObject(model, true)[0];
    if (intersection) {
      assetRoot.worldToLocal(pointerLocal.copy(intersection.point));
      particlePointerTarget.copy(pointerLocal);
      hasParticlePointer = true;
    }
    pointerHasHit = Boolean(intersection);
  }
  const targetPresence = hasPointer && pointerHasHit ? 1 : 0;
  pointerPresence = getInteractionResponseStep({
    current: pointerPresence,
    target: targetPresence,
    deltaSeconds
  });
  if (hasParticlePointer) {
    const particlePointer = particleSystem.material.uniforms.uPointer.value;
    previousParticlePointer.copy(particlePointer);
    const pointerFollow = getInteractionResponseStep({ current: 0, target: 1, deltaSeconds });
    particlePointer.lerp(particlePointerTarget, pointerFollow);

    if (pointerHasHit) {
      particlePointerMotion.subVectors(particlePointer, previousParticlePointer).multiplyScalar(4.5);
      const motionLength = particlePointerMotion.length();
      if (motionLength > 0.16) particlePointerMotion.multiplyScalar(0.16 / motionLength);
    } else {
      particlePointerMotion.multiplyScalar(Math.exp(-9 * Math.min(deltaSeconds, 0.5)));
    }
  }
  particleSystem.material.uniforms.uPointerActive.value = pointerPresence;
  const motionFollow = getInteractionResponseStep({ current: 0, target: 1, deltaSeconds });
  particleSystem.material.uniforms.uPointerMotion.value.lerp(particlePointerMotion, motionFollow);
}

function animate(now = 0) {
  requestAnimationFrame(animate);
  if (document.hidden) {
    lastFrameTime = now;
    return;
  }
  const deltaSeconds = Math.max(0, Math.min((now - lastFrameTime) / 1000, 0.5));
  lastFrameTime = now;
  time += deltaSeconds * 1000;
  updateSceneState(deltaSeconds);
  if (model) {
    assetRoot.rotation.x = THREE.MathUtils.lerp(assetRoot.rotation.x, pointer.y * 0.04 + modelEntrance.tilt + instrumentMotion.modelPitch + modelDrag.pitch, 0.04);
    assetRoot.rotation.z = THREE.MathUtils.lerp(assetRoot.rotation.z, pointer.x * -0.018 + modelEntrance.roll + instrumentMotion.modelRoll, 0.04);
  }
  controls.update(deltaSeconds);
  updateParticlePointer(deltaSeconds);
  renderer.render(scene, camera);
}

window.addEventListener('scroll', onScroll, { passive: true });
function isInteractiveModelDragTarget(target) {
  return target instanceof Element && Boolean(target.closest('a, button, input, select, textarea, [data-elastic-text], [data-magnetic], [data-trail-target], .terminal-warp'));
}

function isPointerOverSolidModel(event) {
  if (!model || smoothMorph >= 0.05) return false;

  getPointerNdc(event.clientX, event.clientY, window.innerWidth, window.innerHeight, pointerTarget);
  assetRoot.updateWorldMatrix(true, true);
  camera.updateMatrixWorld();
  pointerRaycaster.setFromCamera(pointerTarget, camera);
  return pointerRaycaster.intersectObject(model, true).length > 0;
}

function finishModelDrag(event) {
  if (!modelDrag.isDragging || (event && event.pointerId !== modelDrag.pointerId)) return;
  modelDrag.isDragging = false;
  modelDrag.pointerId = null;
  document.documentElement.classList.remove('is-model-dragging');
}

window.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.pointerType !== 'mouse' || isInteractiveModelDragTarget(event.target) || !isPointerOverSolidModel(event)) return;

  modelDrag.isDragging = true;
  modelDrag.pointerId = event.pointerId;
  modelDrag.lastX = event.clientX;
  modelDrag.lastY = event.clientY;
  document.documentElement.classList.add('is-model-dragging');
  event.preventDefault();
});
window.addEventListener('pointermove', (event) => {
  hasPointer = true;
  getPointerNdc(event.clientX, event.clientY, window.innerWidth, window.innerHeight, pointerTarget);

  if (!modelDrag.isDragging || event.pointerId !== modelDrag.pointerId) return;
  const deltaX = event.clientX - modelDrag.lastX;
  const deltaY = event.clientY - modelDrag.lastY;
  const nextDragRotation = getModelDragRotation({
    yaw: modelDrag.yaw,
    pitch: modelDrag.pitch,
    deltaX,
    deltaY
  });
  modelDrag.yaw = nextDragRotation.yaw;
  modelDrag.pitch = nextDragRotation.pitch;
  modelDrag.lastX = event.clientX;
  modelDrag.lastY = event.clientY;
  event.preventDefault();
});
window.addEventListener('pointerup', finishModelDrag);
window.addEventListener('pointercancel', finishModelDrag);
window.addEventListener('blur', () => finishModelDrag());
function updateViewport() {
  const isMobile = window.innerWidth < 760;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.position.z = isMobile ? 9.1 : 7.4;
  assetRoot.position.y = (isMobile ? 0.25 : -0.2) + modelEntrance.lift;
  controls.minDistance = isMobile ? 7.2 : 4.8;
  controls.maxDistance = isMobile ? 11 : 10;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(getRenderPixelRatio(window.devicePixelRatio, window.innerWidth));
}

window.addEventListener('resize', updateViewport);

function revealApplication() {
  if (applicationVisible) return;
  applicationVisible = true;
  document.documentElement.classList.remove('app-loading');
  syncIntroState();
}

mountTextInteractions();
mountReadingResponses();
instrumentControls = mountInstrumentControls(setInstrumentState);
motionEffects = mountMotionEffects();
Promise.race([
  document.fonts?.ready ?? Promise.resolve(),
  new Promise((resolve) => setTimeout(resolve, 1200))
]).then(revealApplication, revealApplication);
onScroll();
updateViewport();
animate();
