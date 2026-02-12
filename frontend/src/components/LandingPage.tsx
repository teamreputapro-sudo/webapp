/**
 * LandingPage - Immersive 3D Orbital Experience v2
 *
 * Improvements:
 * - Larger 3D logo, single wireframe (blue only)
 * - Venue spheres with proper brand colors and logos on front/back
 * - Data pulses follow orbital paths, smaller, brighter, faster
 * - Full-width layout with scroll interactivity
 * - Parallax effects on scroll
 */

import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { withBase } from '../lib/assetBase';
import { getScannerPath } from '../lib/routerBase';
import {
  TrendingUp,
  ArrowRight,
  ChevronDown,
  Shield,
  Activity,
  Target,
  BookOpen,
  Layers,
  Percent,
  Clock,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  Zap,
  Rocket,
  Lock,
  CheckCircle2,
  Settings,
  Cpu,
  Wallet,
  Sparkles,
  Heart,
  Users,
  Code2,
  Github,
  MessageCircle,
  Lightbulb,
  Box,
  Gem
} from 'lucide-react';
import { articles } from '../data/articles';

// ============================================
// VENUE CONFIGURATION - Brand accurate colors
// ============================================
const VENUES = [
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    short: 'HL',
    sphereColor: 0x000000,      // Black sphere
    logoColor: 0x50e3c2,        // Mint green logo
    lineColor: 0x50e3c2,        // Light green line
    glowColor: 'rgba(80, 227, 194, 0.6)',
    logo: withBase('venue-hyperliquid.png')
  },
  {
    id: 'lighter',
    name: 'Lighter',
    short: 'LT',
    sphereColor: 0x000000,      // Black sphere
    logoColor: 0xffffff,        // White logo
    lineColor: 0xffffff,        // White line
    glowColor: 'rgba(255, 255, 255, 0.5)',
    logo: withBase('venue-lighter.png')
  },
  {
    id: 'pacifica',
    name: 'Pacifica',
    short: 'PA',
    sphereColor: 0xffffff,      // White sphere
    logoColor: 0x00d4ff,        // Cyan logo
    lineColor: 0x00d4ff,        // Light blue line
    glowColor: 'rgba(0, 212, 255, 0.6)',
    logo: withBase('venue-pacifica.png')
  },
  {
    id: 'extended',
    name: 'Extended',
    short: 'EX',
    sphereColor: 0x0a0a0a,      // Near-black sphere
    logoColor: 0x4ade80,        // Green icon
    lineColor: 0x22c55e,        // Darker green line
    glowColor: 'rgba(74, 222, 128, 0.6)',
    logo: withBase('venue-extended.png')
  },
  {
    id: 'variational',
    name: 'Variational',
    short: 'VA',
    sphereColor: 0x0a1628,      // Space blue (brand color)
    logoColor: 0xffffff,        // White mark
    lineColor: 0x8b5cf6,        // Purple line
    glowColor: 'rgba(139, 92, 246, 0.6)',
    logo: withBase('venue-variational.png')
  },
  {
    id: 'ethereal',
    name: 'Ethereal',
    short: 'ET',
    sphereColor: 0x0a0a0a,      // Placeholder
    logoColor: 0xffb020,        // Amber
    lineColor: 0xff7a18,        // Orange
    glowColor: 'rgba(255, 176, 32, 0.6)',
    logo: withBase('venue-ethereal.png')
  },
];

// ============================================
// THREE.JS ORBITAL SCENE - Improved with Parallax & Shadow
// ============================================
interface OrbitalSceneProps {
  onReady: () => void;
  scrollProgress?: number; // 0-1, for opacity fade
}

const OrbitalScene = ({ onReady, scrollProgress = 0 }: OrbitalSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(scrollProgress);
  const [previewReady, setPreviewReady] = useState(false);

  // Update ref when prop changes (for animation loop access)
  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    orbitGroup: THREE.Group;
    wireframeSphere: THREE.Mesh;
    logo3D: THREE.Group | null;
    logoMixers: THREE.AnimationMixer[];
    logoFade: {
      from: THREE.Group;
      to: THREE.Group;
      start: number;
      duration: number;
    } | null;
    shadowPlane: THREE.Mesh | null;
    venueGroups: THREE.Group[];
    logoSprites: THREE.Sprite[];
    orbitPivots: THREE.Object3D[];
    connectionLines: THREE.Line[];
    pulseParticles: THREE.Points | null;
    pulseData: Array<{
      venueIndex: number;
      progress: number;
      speed: number;
      direction: number;
      active: boolean;
    }>;
    isScrolling: boolean;
    isVisible: boolean;
  } | null>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const loadingRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspectRatio = width / height;

    // Scene setup
    const scene = new THREE.Scene();

    // Camera - RESPONSIVE: adjust Z based on aspect ratio
    // On mobile (portrait), move camera back so full scene is visible
    // On desktop (landscape), closer for impact
    const isMobile = aspectRatio < 1;
    const isTablet = aspectRatio >= 1 && aspectRatio < 1.5;
    const baseZ = isMobile ? 14 : isTablet ? 12 : 10;
    const baseFOV = isMobile ? 55 : 50;

    const camera = new THREE.PerspectiveCamera(baseFOV, aspectRatio, 0.1, 1000);
    camera.position.z = baseZ;
    camera.position.y = 0.5;

    // Renderer - OPTIMIZED
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false, // Disable for performance
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap at 1.5 for performance
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Lighting - simplified for performance
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Orbit group (tilted)
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = -0.2;
    orbitGroup.rotation.z = 0.05;
    scene.add(orbitGroup);

    // ==========================================
    // CENTER: Single blue wireframe only - SIMPLIFIED
    // ==========================================
    const wireframeGeometry = new THREE.IcosahedronGeometry(2.2, 1); // Reduced detail (2→1)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const wireframeSphere = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    orbitGroup.add(wireframeSphere);

    // Orbit ring (subtle torus) - SIMPLIFIED
    const orbitRingGeometry = new THREE.TorusGeometry(4.2, 0.015, 8, 48); // Reduced segments
    const orbitRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.1,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeometry, orbitRingMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    orbitGroup.add(orbitRing);

    // ==========================================
    // SHADOW/GLOW PLANE - Projected shadow under wireframe
    // ==========================================
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shadowCtx = shadowCanvas.getContext('2d')!;

    // Create radial gradient for soft glow
    const shadowGradient = shadowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    shadowGradient.addColorStop(0, 'rgba(0, 212, 255, 0.35)');
    shadowGradient.addColorStop(0.3, 'rgba(0, 212, 255, 0.2)');
    shadowGradient.addColorStop(0.6, 'rgba(0, 212, 255, 0.08)');
    shadowGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

    shadowCtx.fillStyle = shadowGradient;
    shadowCtx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeometry = new THREE.PlaneGeometry(6, 6);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPlane.position.y = -2.8; // Below wireframe (radius 2.2)
    shadowPlane.rotation.x = -Math.PI / 2; // Horizontal plane
    scene.add(shadowPlane); // Add to scene, not orbitGroup (doesn't rotate)

    // ==========================================
    // LOAD 3D LOGO GLB
    // ==========================================
    let logo3D: THREE.Group | null = null;
    let previewLogo: THREE.Group | null = null;
    let previewMixer: THREE.AnimationMixer | null = null;
    let fullMixer: THREE.AnimationMixer | null = null;

    const applyLogoMaterials = (group: THREE.Group) => {
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !child.material) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          const stdMat = mat as THREE.MeshStandardMaterial;
          stdMat.emissive = new THREE.Color(0x00d4ff);
          stdMat.emissiveIntensity = 0.4;
          stdMat.metalness = 0.9;
          stdMat.roughness = 0.1;
          stdMat.transparent = false;
        });
      });
    };

    const setGroupOpacity = (
      group: THREE.Group,
      opacity: number,
      fading: boolean,
      overlay: boolean
    ) => {
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !child.material) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          const stdMat = mat as THREE.MeshStandardMaterial;
          stdMat.opacity = opacity;
          stdMat.transparent = fading;
          stdMat.depthWrite = !overlay;
          stdMat.depthTest = !overlay;
        });
      });
    };

    const gltfLoader = new GLTFLoader();
    // Must respect `/scanner/` base path when served from Cloudflare Pages under a subpath.
    const ktx2Loader = new KTX2Loader().setTranscoderPath(withBase('ktx2/'));
    ktx2Loader.detectSupport(renderer);
    gltfLoader.setKTX2Loader(ktx2Loader);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    const startFullLoad = () => {
      const loadFull = () => {
        gltfLoader.load(
          withBase('logo-full-opt.glb'),
          (gltf) => {
            const fullLogo = gltf.scene;
            fullLogo.scale.set(2.8, 2.8, 2.8);
            fullLogo.position.set(0, -0.55, 0);
            applyLogoMaterials(fullLogo);
            setGroupOpacity(fullLogo, 1, false, false);
            fullLogo.visible = true;
            orbitGroup.add(fullLogo);

            if (gltf.animations.length) {
              fullMixer = new THREE.AnimationMixer(fullLogo);
              const action = fullMixer.clipAction(gltf.animations[0]);
              action.play();
              const previewTime = previewMixer ? previewMixer.time : 0;
              const duration = action.getClip().duration || 1;
              action.time = previewTime % duration;
            }

            if (sceneRef.current) {
              sceneRef.current.logo3D = fullLogo;
              sceneRef.current.logoMixers = [previewMixer, fullMixer].filter(Boolean) as THREE.AnimationMixer[];
              if (previewLogo && previewLogo !== fullLogo) {
                sceneRef.current.logoFade = {
                  from: previewLogo as THREE.Group,
                  to: fullLogo,
                  start: performance.now(),
                  duration: 600,
                };
              }
            }
          },
          undefined,
          () => {
            // If full fails, keep preview as final
          }
        );
      };

      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
          .requestIdleCallback(loadFull, { timeout: 2000 });
      } else {
        setTimeout(loadFull, 1500);
      }
    };

    gltfLoader.load(
      withBase('logo-preview.glb'),
      (gltf) => {
        previewLogo = gltf.scene;
        previewLogo.scale.set(2.8, 2.8, 2.8);
        previewLogo.position.set(0, -0.55, 0);
        applyLogoMaterials(previewLogo);
        setGroupOpacity(previewLogo, 1, false, false);
        orbitGroup.add(previewLogo);

        if (gltf.animations.length) {
          previewMixer = new THREE.AnimationMixer(previewLogo);
          previewMixer.clipAction(gltf.animations[0]).play();
        }

        logo3D = previewLogo;
        if (sceneRef.current) {
          sceneRef.current.logo3D = previewLogo;
          sceneRef.current.logoMixers = previewMixer ? [previewMixer] : [];
        }
        setPreviewReady(true);
        loadingRef.current = false;
        onReady();

        startFullLoad();
      },
      undefined,
      () => {
        // Fallback procedural logo
        const fallbackGroup = new THREE.Group();
        const fallbackGeometry = new THREE.OctahedronGeometry(1.2, 0);
        const fallbackMaterial = new THREE.MeshStandardMaterial({
          color: 0x00d4ff,
          emissive: 0x00d4ff,
          emissiveIntensity: 0.4,
          metalness: 0.9,
          roughness: 0.1,
        });
        const fallback = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        fallbackGroup.add(fallback);
        fallbackGroup.position.set(0, -0.55, 0);
        orbitGroup.add(fallbackGroup);
        if (sceneRef.current) {
          sceneRef.current.logo3D = fallbackGroup;
          sceneRef.current.logoMixers = [];
        }
        setPreviewReady(true);
        loadingRef.current = false;
        onReady();
      }
    );

    // ==========================================
    // VENUE SATELLITES - Circular badge logos
    // ==========================================
    const venueGroups: THREE.Group[] = [];
    const logoSprites: THREE.Sprite[] = [];
    const orbitPivots: THREE.Object3D[] = [];
    const connectionLines: THREE.Line[] = [];
    const orbitRadius = 4.2;

    // Helper: Create circular badge texture with glow border
    const createCircularBadge = (
      imgSrc: string,
      glowColor: string,
      venueId: string,
      callback: (texture: THREE.CanvasTexture) => void
    ) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 128; // Texture size
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 4; // Leave space for glow

        // Draw glow border
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.filter = 'blur(4px)';
        ctx.fill();
        ctx.filter = 'none';

        // Draw SOLID dark background circle (prevents white bleed-through)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a14'; // Solid dark, no transparency
        ctx.fill();

        // Clip to circle for logo
        ctx.save();
        ctx.beginPath();
        const clipRadius = radius - 6;
        ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2);
        ctx.clip();

        // Draw logo centered and scaled - Lighter +100%, Variational +50%
        let logoScale = 1.4;
        if (venueId === 'lighter') logoScale = 2.8; // +100%
        else if (venueId === 'variational') logoScale = 2.1; // +50%
        const logoSize = radius * logoScale;
        const logoX = centerX - logoSize / 2;
        const logoY = centerY - logoSize / 2;
        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        ctx.restore();

        // Subtle inner border
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
        ctx.strokeStyle = glowColor.replace('0.6', '0.4');
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        callback(texture);
      };
      img.src = imgSrc;
    };

    VENUES.forEach((venue, i) => {
      const angle = (i / VENUES.length) * Math.PI * 2;

      // Pivot for orbital motion
      const pivot = new THREE.Object3D();
      pivot.rotation.y = angle;
      orbitGroup.add(pivot);
      orbitPivots.push(pivot);

      // Venue group
      const venueGroup = new THREE.Group();
      venueGroup.position.x = orbitRadius;

      // Create circular badge sprite - Lighter is bigger
      const spriteScale = 0.7; // Same size for all badges
      createCircularBadge(venue.logo, venue.glowColor, venue.id, (texture) => {
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: true,
          depthTest: true, // Respect z-depth so logo3D occludes badges behind it
          sizeAttenuation: true,
        });
        const logoSprite = new THREE.Sprite(spriteMaterial);
        logoSprite.scale.set(spriteScale, spriteScale, 1);
        logoSprite.position.set(0, 0, 0);
        logoSprite.renderOrder = 10; // Draw badges after lines (lines=1)
        venueGroup.add(logoSprite);
        logoSprites.push(logoSprite);
      });

      pivot.add(venueGroup);
      venueGroups.push(venueGroup);

      // ==========================================
      // CONNECTION LINES - Glowing venue-colored
      // ==========================================
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(6); // 2 points × 3 coords
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

      // Create glowing line material with venue color
      const lineMaterial = new THREE.LineBasicMaterial({
        color: venue.lineColor,
        transparent: true,
        opacity: 0.6,
        linewidth: 2,
        depthTest: true,
        depthWrite: false, // Don't write to depth buffer so badges always on top
      });
      const connectionLine = new THREE.Line(lineGeometry, lineMaterial);
      connectionLine.renderOrder = 1; // Draw lines first
      scene.add(connectionLine);
      connectionLines.push(connectionLine);
    });

    // ==========================================
    // DATA PULSES - Simplified particle system
    // ==========================================
    const maxPulses = 30; // Reduced for performance
    const pulseGeometry = new THREE.BufferGeometry();
    const pulsePositions = new Float32Array(maxPulses * 3);
    const pulseSizes = new Float32Array(maxPulses);
    const pulseColors = new Float32Array(maxPulses * 3);

    pulseGeometry.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeometry.setAttribute('size', new THREE.BufferAttribute(pulseSizes, 1));
    pulseGeometry.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));

    // Custom shader material for neon glow effect
    const pulseShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          // Soft glow falloff
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          // Inner bright core
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          vec3 finalColor = vColor + vec3(core * 0.5);
          gl_FragColor = vec4(finalColor, alpha * 1.2);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pulseParticles = new THREE.Points(pulseGeometry, pulseShaderMaterial);
    scene.add(pulseParticles);

    // Pulse data array
    const pulseData: Array<{
      venueIndex: number;
      progress: number;
      speed: number;
      direction: number;
      active: boolean;
    }> = [];

    for (let i = 0; i < maxPulses; i++) {
      pulseData.push({
        venueIndex: 0,
        progress: 0,
        speed: 0,
        direction: 1,
        active: false,
      });
    }

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      orbitGroup,
      wireframeSphere,
      logo3D,
      logoMixers: [],
      logoFade: null,
      shadowPlane,
      venueGroups,
      logoSprites,
      orbitPivots,
      connectionLines,
      pulseParticles,
      pulseData,
      isScrolling: false,
      isVisible: true,
    };

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop - OPTIMIZED
    let pulseSpawnTimer = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!sceneRef.current) return;

      const time = performance.now() * 0.001;
      const delta = clock.getDelta();
      const { orbitGroup, wireframeSphere, logo3D, shadowPlane, orbitPivots, venueGroups, connectionLines, logoSprites, camera, renderer, pulseParticles, pulseData, logoMixers, logoFade, isVisible } = sceneRef.current;

      if (!isVisible) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Get current scroll progress from ref (updated by useEffect)
      const currentScrollProgress = scrollProgressRef.current;

      // Fade multiplier based on scroll (1 at top, 0.15 when fully scrolled)
      const fadeMultiplier = 1 - (currentScrollProgress * 0.85);

      // NEVER skip updates - all elements must stay synchronized
      // Lines, particles, and badges must always animate together
      const skipHeavyUpdates = false;

      // Apply fade to wireframe
      (wireframeSphere.material as THREE.MeshBasicMaterial).opacity = 0.2 * fadeMultiplier;

      // Apply fade to shadow plane
      if (shadowPlane) {
        (shadowPlane.material as THREE.MeshBasicMaterial).opacity = 0.6 * fadeMultiplier;
      }

      // Update logo animations (if any)
      if (logoMixers.length) {
        logoMixers.forEach((mixer) => mixer.update(delta));
      }

      // Apply fade to logo 3D
      if (logo3D) {
        logo3D.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.emissiveIntensity !== undefined) {
              mat.emissiveIntensity = 0.4 * fadeMultiplier;
            }
          }
        });
      }

      // Crossfade preview -> full when ready
      if (logoFade) {
        const elapsed = performance.now() - logoFade.start;
        const t = Math.min(elapsed / logoFade.duration, 1);
        const fromOpacity = 1 - t;
        setGroupOpacity(logoFade.to, 1, false, false);
        setGroupOpacity(logoFade.from, fromOpacity, true, true);

        if (t >= 1 && sceneRef.current) {
          sceneRef.current.orbitGroup.remove(logoFade.from);
          sceneRef.current.logoFade = null;
          setGroupOpacity(logoFade.to, 1, false, false);
          sceneRef.current.logoMixers = logoMixers.filter((m) => m.getRoot() !== logoFade.from);
        }
      }

      // Apply fade to badges
      logoSprites.forEach((sprite) => {
        sprite.material.opacity = fadeMultiplier;
      });

      // Rotate orbit group
      orbitGroup.rotation.y = time * 0.12;

      // Rotate wireframe
      wireframeSphere.rotation.y = time * 0.08;
      wireframeSphere.rotation.x = Math.sin(time * 0.05) * 0.05;

      // Rotate 3D logo
      if (logo3D) {
        logo3D.rotation.y = time * 0.25;
      }

      // Center position for pulses
      const centerPos = new THREE.Vector3();
      orbitGroup.getWorldPosition(centerPos);

      // Update venue satellites - basic rotation always happens
      const wireframeRadius = 2.2;
      orbitPivots.forEach((pivot, i) => {
        pivot.rotation.y = time * 0.15 + (i / VENUES.length) * Math.PI * 2;
      });

      // Update connection lines - skip during scroll for performance
      if (!skipHeavyUpdates) {
        orbitPivots.forEach((_, i) => {
          const venueGroup = venueGroups[i];
          const connectionLine = connectionLines[i];
          if (venueGroup && connectionLine) {
            const satellitePos = new THREE.Vector3();
            venueGroup.getWorldPosition(satellitePos);

            const direction = satellitePos.clone().sub(centerPos).normalize();
            const startPoint = centerPos.clone().add(direction.multiplyScalar(wireframeRadius));

            const positions = connectionLine.geometry.attributes.position.array as Float32Array;
            positions[0] = startPoint.x;
            positions[1] = startPoint.y;
            positions[2] = startPoint.z;
            positions[3] = satellitePos.x;
            positions[4] = satellitePos.y;
            positions[5] = satellitePos.z;
            connectionLine.geometry.attributes.position.needsUpdate = true;

            // Animate opacity for subtle glow pulse with fade
            const mat = connectionLine.material as THREE.LineBasicMaterial;
            mat.opacity = (0.5 + Math.sin(time * 2 + i) * 0.25) * fadeMultiplier;
          }
        });
      }

      // Spawn new pulses - data flow between center and venues (skip if scrolling)
      if (!skipHeavyUpdates) {
        pulseSpawnTimer += 0.016;
        if (pulseSpawnTimer > 0.2) { // Every 200ms (slower for performance)
          pulseSpawnTimer = 0;

          // Find inactive pulse
          const inactivePulse = pulseData.find(p => !p.active);
          if (inactivePulse) {
            inactivePulse.venueIndex = Math.floor(Math.random() * VENUES.length);
            inactivePulse.progress = Math.random() > 0.5 ? 0 : 1;
            inactivePulse.direction = inactivePulse.progress === 0 ? 1 : -1;
            inactivePulse.speed = 0.012 + Math.random() * 0.008;
            inactivePulse.active = true;
          }
        }
      }

      // Update pulse particles - skip during scroll for performance
      if (pulseParticles && !skipHeavyUpdates) {
        const positions = pulseParticles.geometry.attributes.position.array as Float32Array;
        const sizes = pulseParticles.geometry.attributes.size.array as Float32Array;
        const colors = pulseParticles.geometry.attributes.color.array as Float32Array;

        pulseData.forEach((pulse, i) => {
          if (pulse.active) {
            // Update progress
            pulse.progress += pulse.speed * pulse.direction;

            // Check completion
            if ((pulse.direction === 1 && pulse.progress >= 1) ||
                (pulse.direction === -1 && pulse.progress <= 0)) {
              pulse.active = false;
              sizes[i] = 0;
            } else {
              // Get current satellite world position (follows orbit!)
              const venueGroup = venueGroups[pulse.venueIndex];
              const satellitePos = new THREE.Vector3();
              venueGroup.getWorldPosition(satellitePos);

              // Calculate start point at wireframe edge
              const direction = satellitePos.clone().sub(centerPos).normalize();
              const startPoint = centerPos.clone().add(direction.clone().multiplyScalar(wireframeRadius));

              // Interpolate between wireframe edge and satellite
              const t = pulse.progress;
              positions[i * 3] = startPoint.x + (satellitePos.x - startPoint.x) * t;
              positions[i * 3 + 1] = startPoint.y + (satellitePos.y - startPoint.y) * t;
              positions[i * 3 + 2] = startPoint.z + (satellitePos.z - startPoint.z) * t;

              // Size pulses - NEON GLOW
              const sizePulse = Math.sin(pulse.progress * Math.PI);
              sizes[i] = 0.1 + sizePulse * 0.06;

              // Color from venue - BRIGHT for neon
              const venue = VENUES[pulse.venueIndex];
              const color = new THREE.Color(venue.logoColor);
              colors[i * 3] = Math.min(color.r * 1.8, 1.0);
              colors[i * 3 + 1] = Math.min(color.g * 1.8, 1.0);
              colors[i * 3 + 2] = Math.min(color.b * 1.8, 1.0);
            }
          } else {
            sizes[i] = 0;
          }
        });

        pulseParticles.geometry.attributes.position.needsUpdate = true;
        pulseParticles.geometry.attributes.size.needsUpdate = true;
        pulseParticles.geometry.attributes.color.needsUpdate = true;
      }

      // Mouse parallax - smoother
      camera.position.x += (mouseRef.current.x * 0.6 - camera.position.x) * 0.03;
      camera.position.y += (mouseRef.current.y * 0.4 + 0.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(sceneRef.current.scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Resize handler - RESPONSIVE
    const handleResize = () => {
      if (!sceneRef.current || !containerRef.current) return;
      const { camera, renderer } = sceneRef.current;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const newAspectRatio = w / h;

      // Adjust camera for responsive
      const newIsMobile = newAspectRatio < 1;
      const newIsTablet = newAspectRatio >= 1 && newAspectRatio < 1.5;
      camera.position.z = newIsMobile ? 14 : newIsTablet ? 12 : 10;
      camera.fov = newIsMobile ? 55 : 50;

      camera.aspect = newAspectRatio;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Scroll throttling - reduce quality during scroll
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (sceneRef.current) {
        sceneRef.current.isScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (sceneRef.current) {
            sceneRef.current.isScrolling = false;
          }
        }, 150);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleVisibility = () => {
      if (sceneRef.current) {
        sceneRef.current.isVisible = !document.hidden;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (sceneRef.current) {
          sceneRef.current.isVisible = entry.isIntersecting && !document.hidden;
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(container);

    animate();

    setTimeout(() => {
      if (loadingRef.current) {
        loadingRef.current = false;
        onReady();
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
      clearTimeout(scrollTimeout);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sceneRef.current) {
        ktx2Loader.dispose();
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
      }
    };
  }, [onReady]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          previewReady ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ background: 'radial-gradient(ellipse at center, rgba(10,10,26,0.6) 0%, rgba(3,3,8,0.9) 70%)' }}
      />
    </div>
  );
};

// ============================================
// LOADING SPINNER
// ============================================
const LoadingSpinner = ({ visible }: { visible: boolean }) => (
  <div
    className={`absolute inset-0 flex items-center justify-center z-30 bg-surface-900 transition-opacity duration-1000 ${
      visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}
  >
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin" />
      <span className="text-white/50 text-sm tracking-widest uppercase">Loading Experience</span>
    </div>
  </div>
);

// ============================================
// FULL PAGE BINARY RAIN BACKGROUND - Cinematic Integration
// ============================================
const BinaryRainBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    };
    setSize();

    // Binary characters
    const chars = '01';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);

    // Lateral fade margins (columns to fade on each side) - reduced for full coverage
    const fadeColumns = Math.floor(columns * 0.05); // 5% fade on each side

    // Initialize drops
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    // Animation
    const draw = () => {
      // Semi-transparent black to create fade effect
      ctx.fillStyle = 'rgba(3, 3, 8, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = chars[Math.floor(Math.random() * chars.length)];

        // Calculate lateral fade (0 at edges, 1 in center)
        let lateralFade = 1;
        if (i < fadeColumns) {
          lateralFade = i / fadeColumns;
        } else if (i > columns - fadeColumns) {
          lateralFade = (columns - i) / fadeColumns;
        }

        // No vertical fade - uniform rain across full height
        const y = drops[i] * fontSize;
        const totalFade = lateralFade;

        // Brightness varies - head is brightest, apply fade (increased visibility)
        const baseBrightness = Math.random() > 0.96 ? 255 : 100 + Math.random() * 100;
        const brightness = baseBrightness * totalFade;

        if (brightness > 10) { // Only draw if visible
          ctx.fillStyle = `rgba(0, ${brightness}, ${brightness * 0.4}, ${0.9 * totalFade})`;
          ctx.fillText(char, i * fontSize, y);
        }

        // Reset drop when it reaches bottom or randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.4 + Math.random() * 0.4; // Slightly slower
      }
    };

    const interval = setInterval(draw, 50);

    // Resize handler
    const handleResize = () => {
      setSize();
    };
    window.addEventListener('resize', handleResize);

    // Scroll handler for vertical fade recalculation
    const handleScroll = () => {
      // Canvas redraws automatically, scroll position used in draw()
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Observe scroll height changes
    const resizeObserver = new ResizeObserver(() => {
      setSize();
    });
    resizeObserver.observe(document.body);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Binary rain canvas - CLEAN, no overlays */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.45 }}
      />

      {/* Subtle center vignette only - no lateral/top/bottom fades */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 50%,
              transparent 40%,
              rgba(3, 3, 8, 0.15) 70%,
              rgba(3, 3, 8, 0.3) 100%
            )
          `,
        }}
      />
    </div>
  );
};

// ============================================
// SCROLL INDICATOR
// ============================================
const ScrollIndicator = ({ visible }: { visible: boolean }) => (
  <div
    className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 transition-all duration-1000 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}
  >
    <div className="flex flex-col items-center gap-1 text-white/40">
      <span className="text-[10px] tracking-widest uppercase">Scroll</span>
      <ChevronDown className="w-4 h-4 animate-bounce" />
    </div>
  </div>
);

// ============================================
// GLASS PANEL
// ============================================
const GlassPanel = ({
  children,
  className = '',
  delay = 0,
  visible = true
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  visible?: boolean;
}) => (
  <div
    className={`
      backdrop-blur-xl rounded-2xl border border-white/10
      bg-gradient-to-br from-white/[0.08] to-white/[0.02]
      shadow-[0_8px_32px_rgba(0,0,0,0.4)]
      transition-all duration-700 ease-out
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      ${className}
    `}
    style={{ transitionDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

// ============================================
// SCROLL REVEAL SECTION
// ============================================
const ScrollReveal = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ============================================
// VENUE NETWORK 3D SCENE - Three Layers + Tesseract
// ============================================

// ===== COLOR CONFIGURATION =====
const COLOR_CONFIG = {
  emptyColor: 0x3a3a5e, // More visible empty cubes
  emptyOpacity: 0.4,
  emptyEdgeColor: 0x5a5a8e, // Visible edges
  emptyEdgeOpacity: 0.8,
  filledColor: 0x00d4ff, // Bright cyan after tesseract
  filledOpacity: 0.95,
  filledEmissive: 0.7,
  // Tesseract: ALL WHITE with glow
  tesseractColor: 0xffffff, // White outer
  tesseractInnerColor: 0xffffff, // White inner
  tesseractConnectorColor: 0xffffff, // White connectors
  particleColor: 0x00d4ff,
};

// ===== GEOMETRY CONFIGURATION =====
const GEO_CONFIG = {
  pentagonRadius: 5.5, // Horizontal spread
  pentagonDepth: 3.5, // Z depth (front to back)
  cubeSize: 1.0,
  badgeSize: 1.6, // Badge diameter
  // RAIN: cubes falling to badges (UPPER layer)
  rainTopY: 5.5, // Above badges
  rainBottomY: 2.8, // Stop at badge level
  rainCubeSize: 0.3,
  rainCubesPerVenue: 3,
  rainSpacing: 0.9,
  rainSpeed: 0.6,
  // BADGES layer (MIDDLE-HIGH)
  middleLayerY: 1.8, // Badges layer
  // DODECAHEDRON (MIDDLE)
  dodecahedronY: -1.0, // Center, between badges and tesseract
  dodecahedronSize: 1.0,
  // TESSERACT layer (LOW) - well separated
  lowerLayerY: -4.5, // Lower for clear separation
  tesseractOuterSize: 1.8,
  tesseractInnerSize: 0.9,
  // Conveyor - PULSE SYSTEM with fade at extremes
  conveyorCubeSize: 0.3,
  conveyorCubeCount: 13, // More blocks: 6 left + 1 center + 6 right
  conveyorSpacing: 2.0, // At least tesseract edge size
  conveyorCraftDuration: 2.0, // 2 seconds to craft
  conveyorShiftDuration: 0.5, // 0.5 seconds to shift
  conveyorFadeZone: 2, // Number of blocks at each edge that fade
  // Pulse particles - flow THROUGH lines (not on top)
  pulsesPerLine: 6, // Particles per line
  pulseSpeed: 0.008, // Smooth flow
  pulseSize: 0.15, // Smaller, subtle particles
  // Center rain - vertical line with particles
  centerRainParticles: 8,
  centerRainSpeed: 0.01,
};

const VenueNetworkScene = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    // Layers
    pentagonGroup: THREE.Group;
    middleCubes: THREE.Group[];
    rainCubes: THREE.Group[][];
    tesseract: THREE.Group;
    tesseractMaterials: THREE.LineBasicMaterial[];
    conveyorCubes: THREE.Group[];
    // Connection lines + dodecahedron + pulse particles
    connectionLines: THREE.Line[];
    dodecahedron: THREE.Mesh;
    pulseParticles: THREE.Points;
    pulseData: Array<{ venueIndex: number; progress: number; speed: number; active: boolean }>;
    // Venue positions for particle animation (3D pentagon)
    venuePositions: Array<{ x: number; z: number; angle: number }>;
    // Center vertical line with particles (dodecahedron → tesseract)
    centerLine: THREE.Line;
    centerLineParticles: THREE.Points;
    centerLineData: Array<{ progress: number; speed: number }>;
    // Conveyor pulse state
    conveyorPhase: number; // 0-1 for pulse animation
    // Animation state
    startTime: number;
    isVisible: boolean;
    reducedMotion: boolean;
  } | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ===== SCENE SETUP =====
    const scene = new THREE.Scene();

    // Camera: positioned to see all layers clearly
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 2, 18); // Slightly elevated, moderate distance
    camera.lookAt(0, -1, 0); // Look slightly below center to see all layers

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ===== LIGHTING =====
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 1.2, 25);
    pointLight1.position.set(6, 6, 6);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ff9f, 0.6, 25);
    pointLight2.position.set(-6, 4, -6);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x8b5cf6, 0.4, 20);
    pointLight3.position.set(0, -5, 5);
    scene.add(pointLight3);

    // ===== HELPER: Create venue BADGE (circular with logo inside) =====
    const createVenueBadge = (venue: typeof VENUES[0]): THREE.Group => {
      const badgeGroup = new THREE.Group();
      const size = GEO_CONFIG.badgeSize;

      // Create circular badge texture with Canvas2D
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Background circle with gradient
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.7, '#0d0d1a');
      gradient.addColorStop(1, '#000000');

      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Colored border ring
      const color = new THREE.Color(venue.logoColor);
      const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
      ctx.beginPath();
      ctx.arc(128, 128, 118, 0, Math.PI * 2);
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner glow
      const glowGradient = ctx.createRadialGradient(128, 128, 80, 128, 128, 120);
      glowGradient.addColorStop(0, 'transparent');
      glowGradient.addColorStop(1, hexColor.replace('rgb', 'rgba').replace(')', ', 0.15)'));
      ctx.beginPath();
      ctx.arc(128, 128, 115, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      const badgeTexture = new THREE.CanvasTexture(canvas);

      // Badge as Sprite (always faces camera)
      const badgeMaterial = new THREE.SpriteMaterial({
        map: badgeTexture,
        transparent: true,
        depthTest: true,
        depthWrite: true,
      });
      const badgeSprite = new THREE.Sprite(badgeMaterial);
      badgeSprite.scale.set(size, size, 1);
      badgeSprite.renderOrder = 5;
      badgeGroup.add(badgeSprite);

      // Logo inside badge (separate sprite, slightly in front)
      const logoTexture = new THREE.TextureLoader().load(venue.logo);
      logoTexture.colorSpace = THREE.SRGBColorSpace;
      const logoMaterial = new THREE.SpriteMaterial({
        map: logoTexture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      });
      const logoSprite = new THREE.Sprite(logoMaterial);
      // Logo smaller than badge, centered - adjusted for each venue
      // Lighter and Variational have different aspect ratios
      const logoScale = venue.id === 'lighter' ? 0.55 : venue.id === 'variational' ? 0.5 : 0.6;
      logoSprite.scale.set(size * logoScale, size * logoScale, 1);
      logoSprite.position.z = 0.01; // Slightly in front of badge
      logoSprite.renderOrder = 10;
      badgeGroup.add(logoSprite);

      badgeGroup.userData = { venue, color: new THREE.Color(venue.logoColor) };
      return badgeGroup;
    };

    // ===== CREATE PENTAGON GROUP (for any rotating elements - NOT badges) =====
    const pentagonGroup = new THREE.Group();
    scene.add(pentagonGroup);

    // ===== CREATE MIDDLE LAYER (venue badges in 3D layout - STATIC) =====
    // VENUES order: [Hyperliquid, Lighter, Pacifica, Extended, Variational, Ethereal]
    const middleCubes: THREE.Group[] = [];
    const venuePositions: { x: number; z: number; angle: number }[] = [];

    // Define 3D positions (viewer looking from +Z toward -Z)
    // Z negative = closer to camera (front), Z positive = further (back)
    const pentagonPositions3D = [
      { x: 0, z: -GEO_CONFIG.pentagonDepth * 0.8 },                          // 0: Hyperliquid - FRONT CENTER
      { x: -GEO_CONFIG.pentagonRadius, z: 0 },                               // 1: Lighter - LEFT SIDE
      { x: GEO_CONFIG.pentagonRadius, z: 0 },                                // 2: Pacifica - RIGHT SIDE
      { x: -GEO_CONFIG.pentagonRadius * 0.6, z: GEO_CONFIG.pentagonDepth },  // 3: Extended - BACK LEFT
      { x: GEO_CONFIG.pentagonRadius * 0.6, z: GEO_CONFIG.pentagonDepth },   // 4: Variational - BACK RIGHT
      { x: 0, z: GEO_CONFIG.pentagonDepth * 1.45 },                          // 5: Ethereal - BACK CENTER
    ];

    VENUES.forEach((venue, i) => {
      const pos = pentagonPositions3D[i] ?? { x: 0, z: GEO_CONFIG.pentagonDepth };
      const angle = Math.atan2(pos.z, pos.x);
      venuePositions.push({ x: pos.x, z: pos.z, angle });

      // Create BADGE-style (circular with logo inside)
      const badgeGroup = createVenueBadge(venue);
      badgeGroup.position.set(pos.x, GEO_CONFIG.middleLayerY, pos.z);
      badgeGroup.userData.index = i;
      badgeGroup.userData.localX = pos.x;
      badgeGroup.userData.localZ = pos.z;
      badgeGroup.userData.angle = angle;

      // ADD TO SCENE (not pentagonGroup) - badges stay STATIC
      scene.add(badgeGroup);
      middleCubes.push(badgeGroup);
    });

    // ===== CREATE RAIN CUBES (continuous vertical conveyor per venue) =====
    const rainCubes: THREE.Group[][] = [];
    const rainGeometry = new THREE.BoxGeometry(
      GEO_CONFIG.rainCubeSize,
      GEO_CONFIG.rainCubeSize,
      GEO_CONFIG.rainCubeSize
    );
    const rainEdgesGeometry = new THREE.EdgesGeometry(rainGeometry);
    const rainLoopLen = GEO_CONFIG.rainSpacing * GEO_CONFIG.rainCubesPerVenue;

    VENUES.forEach((venue, venueIdx) => {
      const { x, z } = venuePositions[venueIdx];
      const venueRainCubes: THREE.Group[] = [];

      for (let i = 0; i < GEO_CONFIG.rainCubesPerVenue; i++) {
        const cubeGroup = new THREE.Group();

        // Cube mesh with venue color
        const material = new THREE.MeshStandardMaterial({
          color: venue.logoColor,
          metalness: 0.6,
          roughness: 0.4,
          emissive: venue.logoColor,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.85,
        });
        const cube = new THREE.Mesh(rainGeometry, material);
        cubeGroup.add(cube);

        // Wireframe edges
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: venue.logoColor,
          transparent: true,
          opacity: 0.9,
        });
        const edges = new THREE.LineSegments(rainEdgesGeometry, edgesMaterial);
        cubeGroup.add(edges);

        // Initial Y position (distributed along the rain path)
        const initialY = GEO_CONFIG.rainTopY - i * GEO_CONFIG.rainSpacing;
        cubeGroup.position.set(x, initialY, z);
        cubeGroup.userData = { venueIdx, index: i };

        scene.add(cubeGroup); // Add to scene (NOT pentagonGroup) - rain falls straight down
        venueRainCubes.push(cubeGroup);
      }

      rainCubes.push(venueRainCubes);
    });

    // ===== CREATE CONNECTION LINES from badges to dodecahedron (like orbital) =====
    // Lines start FROM badge center but render BEHIND badges (lower renderOrder)
    const connectionLines: THREE.Line[] = [];
    const centerY = GEO_CONFIG.dodecahedronY;

    VENUES.forEach((venue, i) => {
      const { x, z } = venuePositions[i];
      // Start from badge CENTER (same Y as badge position)
      const startY = GEO_CONFIG.middleLayerY;

      // Dynamic line geometry (will be updated in animation)
      const lineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6); // 2 points x 3 coords
      positions[0] = x; positions[1] = startY; positions[2] = z;
      positions[3] = 0; positions[4] = centerY; positions[5] = 0;
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const lineMaterial = new THREE.LineBasicMaterial({
        color: venue.logoColor,
        transparent: true,
        opacity: 0.5,
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.renderOrder = 1; // BEHIND badges (badges have 5 and 10)
      scene.add(line);
      connectionLines.push(line);
    });

    // ===== CREATE DODECAHEDRON at center =====
    const dodecahedronGeometry = new THREE.DodecahedronGeometry(GEO_CONFIG.dodecahedronSize, 0);
    const dodecahedronMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
    });
    const dodecahedron = new THREE.Mesh(dodecahedronGeometry, dodecahedronMaterial);
    dodecahedron.position.set(0, centerY, 0);
    scene.add(dodecahedron);

    // Wireframe overlay
    const dodecaEdges = new THREE.EdgesGeometry(dodecahedronGeometry);
    const dodecaWireMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const dodecaWireframe = new THREE.LineSegments(dodecaEdges, dodecaWireMaterial);
    dodecahedron.add(dodecaWireframe);

    // ===== PULSE PARTICLES (like orbital - flow along lines) =====
    const maxPulses = 5 * GEO_CONFIG.pulsesPerLine; // 8 per line = 40 total
    const pulseGeometry = new THREE.BufferGeometry();
    const pulsePositions = new Float32Array(maxPulses * 3);
    const pulseSizes = new Float32Array(maxPulses);
    const pulseColors = new Float32Array(maxPulses * 3);

    // Initialize with default values
    for (let i = 0; i < maxPulses; i++) {
      pulseSizes[i] = GEO_CONFIG.pulseSize;
    }

    pulseGeometry.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeometry.setAttribute('size', new THREE.BufferAttribute(pulseSizes, 1));
    pulseGeometry.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));

    // Shader for neon glow (same as orbital) - BRIGHTER
    const pulseShaderMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          float core = 1.0 - smoothstep(0.0, 0.2, dist);
          vec3 finalColor = vColor * 1.5 + vec3(core * 0.8);
          gl_FragColor = vec4(finalColor, alpha * 1.5);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pulseParticles = new THREE.Points(pulseGeometry, pulseShaderMaterial);
    pulseParticles.renderOrder = 3; // BEHIND badges (badges have 5 and 10), but above lines (1)
    scene.add(pulseParticles);

    // Pulse data - 8 pulses per line, staggered along the line
    const pulseData: Array<{ venueIndex: number; progress: number; speed: number; active: boolean }> = [];
    for (let v = 0; v < 5; v++) {
      for (let p = 0; p < GEO_CONFIG.pulsesPerLine; p++) {
        pulseData.push({
          venueIndex: v,
          progress: p / GEO_CONFIG.pulsesPerLine, // Evenly distributed along line
          speed: GEO_CONFIG.pulseSpeed * (0.9 + Math.random() * 0.2),
          active: true,
        });
      }
    }

    // ===== CENTER LINE (dodecahedron → tesseract) - Vertical line with flowing particles =====
    // Create the line itself
    const centerLineGeometry = new THREE.BufferGeometry();
    const centerLinePositions = new Float32Array([
      0, centerY - GEO_CONFIG.dodecahedronSize / 2, 0, // Start below dodecahedron
      0, GEO_CONFIG.lowerLayerY + GEO_CONFIG.tesseractOuterSize / 2 + 0.2, 0, // End above tesseract
    ]);
    centerLineGeometry.setAttribute('position', new THREE.BufferAttribute(centerLinePositions, 3));
    const centerLineMaterial = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.4,
    });
    const centerLine = new THREE.Line(centerLineGeometry, centerLineMaterial);
    scene.add(centerLine);

    // Create particles that flow along the center line
    const centerParticleCount = GEO_CONFIG.centerRainParticles;
    const centerLineParticlesGeometry = new THREE.BufferGeometry();
    const clPositions = new Float32Array(centerParticleCount * 3);
    const clSizes = new Float32Array(centerParticleCount);
    const clColors = new Float32Array(centerParticleCount * 3);

    for (let i = 0; i < centerParticleCount; i++) {
      clSizes[i] = GEO_CONFIG.pulseSize;
      // Cyan color
      clColors[i * 3] = 0;
      clColors[i * 3 + 1] = 0.83;
      clColors[i * 3 + 2] = 1;
    }
    centerLineParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(clPositions, 3));
    centerLineParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(clSizes, 1));
    centerLineParticlesGeometry.setAttribute('color', new THREE.BufferAttribute(clColors, 3));

    const centerLineParticlesMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: pulseShaderMaterial.vertexShader,
      fragmentShader: pulseShaderMaterial.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const centerLineParticles = new THREE.Points(centerLineParticlesGeometry, centerLineParticlesMaterial);
    scene.add(centerLineParticles);

    // Data for center line particles
    const centerLineData: Array<{ progress: number; speed: number }> = [];
    for (let i = 0; i < centerParticleCount; i++) {
      centerLineData.push({
        progress: i / centerParticleCount, // Evenly distributed
        speed: GEO_CONFIG.centerRainSpeed * (0.9 + Math.random() * 0.2),
      });
    }

    // ===== CREATE TESSERACT (4D hypercube - ALL WHITE with synced glow) =====
    const tesseract = new THREE.Group();
    tesseract.position.set(0, GEO_CONFIG.lowerLayerY, 0);
    const tesseractMaterials: THREE.LineBasicMaterial[] = []; // Store for glow sync

    // Outer cube vertices
    const outerHalf = GEO_CONFIG.tesseractOuterSize / 2;
    const outerVertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ].map(v => v.map(c => c * outerHalf));

    // Inner cube vertices
    const innerHalf = GEO_CONFIG.tesseractInnerSize / 2;
    const innerVertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ].map(v => v.map(c => c * innerHalf));

    // Outer cube wireframe - WHITE
    const outerGeometry = new THREE.BoxGeometry(
      GEO_CONFIG.tesseractOuterSize,
      GEO_CONFIG.tesseractOuterSize,
      GEO_CONFIG.tesseractOuterSize
    );
    const outerEdges = new THREE.EdgesGeometry(outerGeometry);
    const outerMaterial = new THREE.LineBasicMaterial({
      color: COLOR_CONFIG.tesseractColor, // White
      transparent: true,
      opacity: 0.85,
    });
    tesseractMaterials.push(outerMaterial);
    const outerWireframe = new THREE.LineSegments(outerEdges, outerMaterial);
    tesseract.add(outerWireframe);

    // Inner cube wireframe - WHITE
    const innerGeometry = new THREE.BoxGeometry(
      GEO_CONFIG.tesseractInnerSize,
      GEO_CONFIG.tesseractInnerSize,
      GEO_CONFIG.tesseractInnerSize
    );
    const innerEdges = new THREE.EdgesGeometry(innerGeometry);
    const innerMaterial = new THREE.LineBasicMaterial({
      color: COLOR_CONFIG.tesseractInnerColor, // White
      transparent: true,
      opacity: 0.9,
    });
    tesseractMaterials.push(innerMaterial);
    const innerWireframe = new THREE.LineSegments(innerEdges, innerMaterial);
    tesseract.add(innerWireframe);
    tesseract.userData.innerWireframe = innerWireframe;

    // Connect 8 corners (proper tesseract) - WHITE
    for (let i = 0; i < 8; i++) {
      const innerV = innerVertices[i];
      const outerV = outerVertices[i];
      const lineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        innerV[0], innerV[1], innerV[2],
        outerV[0], outerV[1], outerV[2],
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: COLOR_CONFIG.tesseractConnectorColor, // White
        transparent: true,
        opacity: 0.6,
      });
      tesseractMaterials.push(lineMaterial);
      tesseract.add(new THREE.Line(lineGeometry, lineMaterial));
    }

    scene.add(tesseract);

    // ===== CREATE CONVEYOR BELT (deterministic positioning) =====
    const conveyorCubes: THREE.Group[] = [];
    const conveyorGeometry = new THREE.BoxGeometry(
      GEO_CONFIG.conveyorCubeSize,
      GEO_CONFIG.conveyorCubeSize,
      GEO_CONFIG.conveyorCubeSize
    );
    const conveyorEdgesGeometry = new THREE.EdgesGeometry(conveyorGeometry);

    // Calculate conveyor loop length (centered on tesseract)
    const conveyorLoopLen = GEO_CONFIG.conveyorSpacing * GEO_CONFIG.conveyorCubeCount;

    for (let i = 0; i < GEO_CONFIG.conveyorCubeCount; i++) {
      const cubeGroup = new THREE.Group();

      // Solid cube (visible empty state)
      const material = new THREE.MeshStandardMaterial({
        color: COLOR_CONFIG.emptyColor,
        metalness: 0.6,
        roughness: 0.4,
        emissive: COLOR_CONFIG.emptyColor,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: COLOR_CONFIG.emptyOpacity,
      });
      const cube = new THREE.Mesh(conveyorGeometry, material);
      cubeGroup.add(cube);

      // Wireframe edges (always visible, brighter)
      const edgesMaterial = new THREE.LineBasicMaterial({
        color: COLOR_CONFIG.emptyEdgeColor,
        transparent: true,
        opacity: COLOR_CONFIG.emptyEdgeOpacity,
      });
      const edges = new THREE.LineSegments(conveyorEdgesGeometry, edgesMaterial);
      cubeGroup.add(edges);

      // Initial position (deterministic)
      const initialX = -conveyorLoopLen / 2 + i * GEO_CONFIG.conveyorSpacing;
      cubeGroup.position.set(initialX, GEO_CONFIG.lowerLayerY, 0);
      cubeGroup.userData = { index: i };

      scene.add(cubeGroup);
      conveyorCubes.push(cubeGroup);
    }

    // ===== STORE REFS =====
    sceneRef.current = {
      scene,
      camera,
      renderer,
      pentagonGroup,
      middleCubes,
      rainCubes,
      tesseract,
      tesseractMaterials,
      conveyorCubes,
      connectionLines,
      dodecahedron,
      pulseParticles,
      pulseData,
      venuePositions,
      centerLine,
      centerLineParticles,
      centerLineData,
      conveyorPhase: 0,
      startTime: performance.now(),
      isVisible: true,
      reducedMotion,
    };

    // ===== ANIMATION LOOP =====
    const animate = () => {
      if (!sceneRef.current) return;

      const now = performance.now();
      const {
        pentagonGroup, rainCubes, tesseract, tesseractMaterials,
        conveyorCubes, connectionLines, dodecahedron, pulseParticles, pulseData,
        venuePositions, centerLine, centerLineParticles, centerLineData,
        startTime, reducedMotion
      } = sceneRef.current;

      const elapsed = (now - startTime) / 1000;

      // ===== RAIN CUBES: Continuous vertical fall (ALWAYS animate - visible rain!) =====
      // NOTE: Rain always animates regardless of reducedMotion
      {
        const rainOffset = elapsed * GEO_CONFIG.rainSpeed;

        rainCubes.forEach((venueRain) => {
          venueRain.forEach((cubeGroup, i) => {
            // Deterministic Y position (wraps around like conveyor)
            let y = GEO_CONFIG.rainTopY - ((i * GEO_CONFIG.rainSpacing + rainOffset) % rainLoopLen);

            // If below bottom, wrap to top
            if (y < GEO_CONFIG.rainBottomY) {
              y += rainLoopLen;
            }

            cubeGroup.position.y = y;

            // Fade in near top, fade out near bottom
            const fadeTop = GEO_CONFIG.rainTopY - 0.5;
            const fadeBottom = GEO_CONFIG.rainBottomY + 0.5;
            let opacity = 0.85;
            if (y > fadeTop) {
              opacity = 0.85 * (1 - (y - fadeTop) / 0.5);
            } else if (y < fadeBottom) {
              opacity = 0.85 * ((y - GEO_CONFIG.rainBottomY) / 0.5);
            }

            // Update material opacity
            const mesh = cubeGroup.children[0] as THREE.Mesh;
            const edges = cubeGroup.children[1] as THREE.LineSegments;
            (mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
            (edges.material as THREE.LineBasicMaterial).opacity = opacity;

            // NO rotation - rain falls in STRAIGHT vertical lines
          });
        });
      }

      // ===== PENTAGON GROUP: Slow continuous rotation =====
      if (!reducedMotion) {
        pentagonGroup.rotation.y = elapsed * 0.05; // Very slow rotation
      }

      // ===== CRAFTING CYCLE TIMING (used for synchronized heartbeat effects) =====
      const craftDuration = GEO_CONFIG.conveyorCraftDuration; // 2.0 seconds
      const shiftDuration = GEO_CONFIG.conveyorShiftDuration; // 0.5 seconds
      const totalCycleDuration = craftDuration + shiftDuration; // 2.5 seconds total
      const craftRatio = craftDuration / totalCycleDuration; // ~0.8 of cycle

      const cycleCount = Math.floor(elapsed / totalCycleDuration);
      const cycleProgress = (elapsed % totalCycleDuration) / totalCycleDuration;
      const isShiftPhase = cycleProgress > craftRatio;
      const isCraftPhase = !isShiftPhase;

      // Craft progress (0→1 during craft phase, stays at 1 during shift)
      const craftProgress = isCraftPhase ? cycleProgress / craftRatio : 1;

      // Shift fraction with easing
      let shiftFraction = 0;
      if (isShiftPhase) {
        const shiftPhase = (cycleProgress - craftRatio) / (1 - craftRatio);
        shiftFraction = shiftPhase < 0.5
          ? 2 * shiftPhase * shiftPhase
          : 1 - Math.pow(-2 * shiftPhase + 2, 2) / 2;
      }

      // ===== HEARTBEAT PULSE (synchronized with crafting) =====
      // Single slow, smooth heartbeat over the entire 2-second craft phase
      let heartbeatIntensity = 0;
      if (isCraftPhase) {
        // One smooth pulse over the entire craft phase
        // Using sine curve for gentle rise and fall
        // craftProgress goes 0→1, we want pulse to peak around 0.4-0.5
        heartbeatIntensity = Math.sin(craftProgress * Math.PI);
      } else {
        // During shift, gentle fade out
        heartbeatIntensity = Math.max(0, 1 - shiftFraction * 2);
      }

      // Legacy pulse for other effects
      const pulseIntensity = 0.5 + 0.5 * Math.sin(elapsed * 0.5);

      // ===== TESSERACT: Slow rotation (pulse handled below, synchronized with conveyor shift) =====
      if (!reducedMotion) {
        tesseract.rotation.y = elapsed * 0.015; // 10x slower
        const innerW = tesseract.userData.innerWireframe as THREE.LineSegments;
        if (innerW) {
          innerW.rotation.y = -elapsed * 0.025;
          innerW.rotation.x = elapsed * 0.01;
        }
        // Note: Material pulse is now handled in the conveyor section below,
        // synchronized with the block shift animation
      }

      // ===== CONVEYOR: CONTINUOUS TAPE MODEL with crafting in center =====
      // Model: Infinite tape scrolling right. Each block has a "tape position".
      // The crafting point is at center (X=0). Blocks left of it are empty, right are filled.
      // When a block crosses the crafting point, it spends 2 seconds filling before moving.
      // Note: Timing values (craftDuration, cycleProgress, shiftFraction, etc.) calculated above

      const numBlocks = GEO_CONFIG.conveyorCubeCount;
      const centerIdx = Math.floor(numBlocks / 2);
      const spacing = GEO_CONFIG.conveyorSpacing;
      const fadeZone = GEO_CONFIG.conveyorFadeZone;

      sceneRef.current.conveyorPhase = cycleProgress;

      // Total tape scroll (in units of spacing)
      // The tape has moved cycleCount full positions, plus shiftFraction of current cycle
      const tapeScroll = cycleCount + shiftFraction;

      // Calculate total conveyor width for fade zones
      const totalWidth = (numBlocks - 1) * spacing;
      const leftEdge = -totalWidth / 2;
      const rightEdge = totalWidth / 2;

      conveyorCubes.forEach((cubeGroup, i) => {
        const mesh = cubeGroup.children[0] as THREE.Mesh;
        const edges = cubeGroup.children[1] as THREE.LineSegments;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const edgeMat = edges.material as THREE.LineBasicMaterial;

        // Block i's position on infinite tape (starts at i - centerIdx, then scrolls)
        // With tape scroll, its visual slot is: (i - centerIdx) + tapeScroll
        // We need to wrap this to stay within display range [-centerIdx, centerIdx]
        let virtualSlot = (i - centerIdx) + tapeScroll;

        // Wrap to keep within numBlocks range
        virtualSlot = ((virtualSlot % numBlocks) + numBlocks) % numBlocks;
        if (virtualSlot > centerIdx) virtualSlot -= numBlocks;

        // Display position
        const displayX = virtualSlot * spacing;
        cubeGroup.position.x = displayX;

        // Calculate fade opacity based on distance from edges
        let fadeOpacity = 1.0;
        const distFromLeftEdge = displayX - leftEdge;
        const distFromRightEdge = rightEdge - displayX;
        const fadeDistance = fadeZone * spacing;

        // CRITICAL: If block is outside the visible range, hide it completely
        // This handles the wrap-around case where a block appears beyond the edges
        if (displayX < leftEdge - spacing * 0.1 || displayX > rightEdge + spacing * 0.1) {
          fadeOpacity = 0;
        } else if (distFromLeftEdge < fadeDistance) {
          // Fade in from left edge
          fadeOpacity = Math.max(0, distFromLeftEdge / fadeDistance);
        } else if (distFromRightEdge < fadeDistance) {
          // Fade out at right edge
          fadeOpacity = Math.max(0, distFromRightEdge / fadeDistance);
        }
        fadeOpacity = Math.max(0, Math.min(1, fadeOpacity));

        // Determine which block is currently at the crafting position
        // The crafting block is the one whose slot position is at center (virtualSlot ≈ 0)
        // and we're NOT in shift phase
        const isAtCenter = Math.abs(virtualSlot) < 0.5;
        const isCraftingBlock = isAtCenter && !isShiftPhase;

        // Determine filled state based on visual position
        // Blocks past center (displayX > threshold) are filled
        // During SHIFT phase: threshold SLIDES from negative to positive
        //   - At start (shiftFraction=0): threshold=-0.5*spacing, so just-crafted block at X=0 is FILLED
        //   - At end (shiftFraction=1): threshold=+0.5*spacing, so incoming block at X=0 is EMPTY
        // During CRAFT phase: threshold is positive (only blocks clearly to the right are filled)
        const fillThreshold = isShiftPhase
          ? spacing * (shiftFraction - 0.5) // Slides from -0.5*spacing to +0.5*spacing
          : spacing * 0.4;
        const isFilled = displayX > fillThreshold;

        if (isCraftingBlock) {
          // CENTER BLOCK: Crafting animation (0→1 over craft phase)
          // Uses global craftProgress calculated above

          const transColor = new THREE.Color(COLOR_CONFIG.emptyColor).lerp(
            new THREE.Color(COLOR_CONFIG.filledColor), craftProgress
          );
          mat.color.copy(transColor);
          mat.emissive.copy(transColor);
          mat.emissiveIntensity = 0.2 + craftProgress * 0.5;
          mat.opacity = (COLOR_CONFIG.emptyOpacity + craftProgress * (COLOR_CONFIG.filledOpacity - COLOR_CONFIG.emptyOpacity)) * fadeOpacity;
          edgeMat.color.copy(transColor);
          edgeMat.opacity = (0.6 + craftProgress * 0.4) * fadeOpacity;
        } else if (isFilled) {
          // FILLED BLOCKS: Cyan
          mat.color.setHex(COLOR_CONFIG.filledColor);
          mat.emissive.setHex(COLOR_CONFIG.filledColor);
          mat.emissiveIntensity = COLOR_CONFIG.filledEmissive;
          mat.opacity = COLOR_CONFIG.filledOpacity * fadeOpacity;
          edgeMat.color.setHex(COLOR_CONFIG.filledColor);
          edgeMat.opacity = 1.0 * fadeOpacity;
        } else {
          // EMPTY BLOCKS: Gray
          mat.color.setHex(COLOR_CONFIG.emptyColor);
          mat.emissive.setHex(COLOR_CONFIG.emptyColor);
          mat.emissiveIntensity = 0.2;
          mat.opacity = COLOR_CONFIG.emptyOpacity * fadeOpacity;
          edgeMat.color.setHex(COLOR_CONFIG.emptyEdgeColor);
          edgeMat.opacity = COLOR_CONFIG.emptyEdgeOpacity * fadeOpacity;
        }
      });

      // ===== TESSERACT PULSE: Synchronized with shift phase =====
      // When blocks shift, tesseract edges pulse brightly
      {
        const shiftPulseIntensity = isShiftPhase ? (1 - shiftFraction) * 0.8 : 0; // Pulse at start of shift, fade out
        tesseractMaterials.forEach((mat, idx) => {
          const baseOpacity = idx < 2 ? 0.85 : 0.6; // Outer/inner vs connectors
          mat.opacity = baseOpacity * (0.5 + 0.5 * pulseIntensity + shiftPulseIntensity);
          // Brighter during shift
          if (isShiftPhase && idx < 2) {
            mat.color.setHex(0x00ffff); // Bright cyan
          } else {
            mat.color.setHex(0x00d4ff); // Normal cyan
          }
        });
      }

      // ===== DODECAHEDRON: Rotation + HEARTBEAT synchronized with crafting =====
      {
        // Medium rotation speed
        dodecahedron.rotation.y = elapsed * 0.3;
        dodecahedron.rotation.x = elapsed * 0.15;

        // Heartbeat pulse on material - synced with crafting (smooth and subtle)
        const dodecaMat = dodecahedron.material as THREE.MeshStandardMaterial;
        dodecaMat.emissiveIntensity = 0.4 + 0.4 * heartbeatIntensity;

        // Scale heartbeat - gentle breathing effect
        const heartbeatScale = 1 + 0.1 * heartbeatIntensity;
        dodecahedron.scale.set(heartbeatScale, heartbeatScale, heartbeatScale);

        // Color shifts slightly brighter during pulse
        const beatColor = new THREE.Color(0x00d4ff).lerp(
          new THREE.Color(0x00ffff), heartbeatIntensity * 0.3
        );
        dodecaMat.emissive.copy(beatColor);
      }

      // ===== BADGES: HEARTBEAT synchronized with crafting =====
      {
        middleCubes.forEach((badgeGroup) => {
          // Scale heartbeat - very subtle breathing effect
          const badgeHeartbeat = 1 + 0.05 * heartbeatIntensity;
          badgeGroup.scale.set(badgeHeartbeat, badgeHeartbeat, badgeHeartbeat);

          // Also pulse the badge material opacity/emissive if accessible
          badgeGroup.children.forEach((child) => {
            if (child instanceof THREE.Sprite) {
              const spriteMat = child.material as THREE.SpriteMaterial;
              // Very subtle opacity pulse
              spriteMat.opacity = 0.95 + 0.05 * heartbeatIntensity;
            }
          });
        });
      }

      // ===== PULSE PARTICLES: Flow ALONG connection lines (badges are STATIC) =====
      // Particles flow FROM badge center TO dodecahedron, but render BEHIND badges
      {
        const positions = pulseParticles.geometry.attributes.position.array as Float32Array;
        const sizes = pulseParticles.geometry.attributes.size.array as Float32Array;
        const colors = pulseParticles.geometry.attributes.color.array as Float32Array;
        const centerPos = { x: 0, y: GEO_CONFIG.dodecahedronY, z: 0 };

        // Update each pulse particle
        pulseData.forEach((pulse, idx) => {
          if (!pulse.active) return;

          // Advance progress along line
          pulse.progress += pulse.speed;
          if (pulse.progress >= 1) {
            pulse.progress = 0; // Loop back to start
          }

          // Get ACTUAL badge position from 3D pentagon (not circular!)
          const venuePos = venuePositions[pulse.venueIndex];
          const startX = venuePos.x;
          const startZ = venuePos.z;
          const startY = GEO_CONFIG.middleLayerY; // Badge CENTER Y

          // Interpolate position along line (badge center → dodecahedron center)
          const t = pulse.progress;
          positions[idx * 3] = startX + (centerPos.x - startX) * t;
          positions[idx * 3 + 1] = startY + (centerPos.y - startY) * t;
          positions[idx * 3 + 2] = startZ + (centerPos.z - startZ) * t;

          // Size pulse - larger in middle of journey for glow effect
          const sizePulse = Math.sin(t * Math.PI); // 0→1→0
          sizes[idx] = GEO_CONFIG.pulseSize * (0.8 + sizePulse * 0.6);

          // Get venue color - brighter
          const venue = VENUES[pulse.venueIndex];
          const color = new THREE.Color(venue.logoColor);
          colors[idx * 3] = Math.min(color.r * 1.3, 1);
          colors[idx * 3 + 1] = Math.min(color.g * 1.3, 1);
          colors[idx * 3 + 2] = Math.min(color.b * 1.3, 1);
        });

        pulseParticles.geometry.attributes.position.needsUpdate = true;
        pulseParticles.geometry.attributes.size.needsUpdate = true;
        pulseParticles.geometry.attributes.color.needsUpdate = true;

        // Connection lines are STATIC (badges don't move) - just pulse opacity
        connectionLines.forEach((line) => {
          const lineMat = line.material as THREE.LineBasicMaterial;
          lineMat.opacity = 0.4 + 0.3 * pulseIntensity;
        });
      }

      // ===== CENTER LINE: Particles flowing down along vertical line =====
      {
        const positions = centerLineParticles.geometry.attributes.position.array as Float32Array;
        const sizes = centerLineParticles.geometry.attributes.size.array as Float32Array;
        const startY = GEO_CONFIG.dodecahedronY - GEO_CONFIG.dodecahedronSize / 2;
        const endY = GEO_CONFIG.lowerLayerY + GEO_CONFIG.tesseractOuterSize / 2 + 0.2;

        centerLineData.forEach((particle, idx) => {
          // Advance progress
          particle.progress += particle.speed;
          if (particle.progress >= 1) {
            particle.progress = 0;
          }

          // Position along the vertical line (X=0, Z=0)
          const t = particle.progress;
          positions[idx * 3] = 0;
          positions[idx * 3 + 1] = startY + (endY - startY) * t;
          positions[idx * 3 + 2] = 0;

          // Size pulse
          const sizePulse = Math.sin(t * Math.PI);
          sizes[idx] = GEO_CONFIG.pulseSize * (0.7 + sizePulse * 0.5);
        });

        centerLineParticles.geometry.attributes.position.needsUpdate = true;
        centerLineParticles.geometry.attributes.size.needsUpdate = true;

        // Pulse the line opacity
        const lineMat = centerLine.material as THREE.LineBasicMaterial;
        lineMat.opacity = 0.3 + 0.2 * pulseIntensity;
      }

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    // ===== RESIZE HANDLER =====
    const handleResize = () => {
      if (!sceneRef.current || !containerRef.current) return;
      const { camera, renderer } = sceneRef.current;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;

      // Camera: positioned to see all layers (rain → badges → dodecahedron → tesseract)
      if (w < 640) {
        camera.position.set(0, 3, 22); // Mobile - further back
        camera.fov = 60;
      } else if (w < 1024) {
        camera.position.set(0, 2.5, 20); // Tablet
        camera.fov = 57;
      } else {
        camera.position.set(0, 2, 18); // Desktop
        camera.fov = 55;
      }
      camera.lookAt(0, -1.5, 0); // Look at center of scene

      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Visibility observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (sceneRef.current) {
          sceneRef.current.isVisible = entry.isIntersecting;
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        // Cleanup particle systems
        sceneRef.current.pulseParticles.geometry.dispose();
        (sceneRef.current.pulseParticles.material as THREE.ShaderMaterial).dispose();
        sceneRef.current.centerLineParticles.geometry.dispose();
        (sceneRef.current.centerLineParticles.material as THREE.ShaderMaterial).dispose();
        // Cleanup center line
        sceneRef.current.centerLine.geometry.dispose();
        (sceneRef.current.centerLine.material as THREE.LineBasicMaterial).dispose();
        // Cleanup connection lines
        sceneRef.current.connectionLines.forEach(line => {
          line.geometry.dispose();
          (line.material as THREE.LineBasicMaterial).dispose();
        });
        container.removeChild(sceneRef.current.renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-[580px] md:h-[650px] lg:h-[700px]"
    />
  );
};

// ============================================
// MAIN LANDING PAGE
// ============================================
export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [autoScrollCancelled, setAutoScrollCancelled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trustedSourcesRef = useRef<HTMLElement>(null);

  const featuredArticles = articles.slice(0, 3);

  // Scroll progress tracking (0 = top, 1 = hero scrolled out)
  useEffect(() => {
    const handleScrollProgress = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const progress = Math.min(scrollY / heroHeight, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScrollProgress, { passive: true });
    handleScrollProgress(); // Initial

    return () => window.removeEventListener('scroll', handleScrollProgress);
  }, []);

  // Auto-scroll to features section after 2 seconds (guided entry)
  useEffect(() => {
    if (!sceneReady || autoScrollCancelled || userInteracted) return;

    const autoScrollTimeout = setTimeout(() => {
      if (!autoScrollCancelled && !userInteracted && trustedSourcesRef.current) {
        trustedSourcesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 2000);

    // Cancel auto-scroll if user interacts
    const cancelAutoScroll = () => {
      setAutoScrollCancelled(true);
      clearTimeout(autoScrollTimeout);
    };

    window.addEventListener('wheel', cancelAutoScroll, { passive: true });
    window.addEventListener('touchstart', cancelAutoScroll, { passive: true });
    window.addEventListener('keydown', cancelAutoScroll);

    return () => {
      clearTimeout(autoScrollTimeout);
      window.removeEventListener('wheel', cancelAutoScroll);
      window.removeEventListener('touchstart', cancelAutoScroll);
      window.removeEventListener('keydown', cancelAutoScroll);
    };
  }, [sceneReady, autoScrollCancelled, userInteracted]);

  const handleSceneReady = useCallback(() => {
    setLoading(false);
    setTimeout(() => setSceneReady(true), 300);
  }, []);

  useEffect(() => {
    let interactionTimeout: NodeJS.Timeout;

    const handleInteraction = () => {
      if (!userInteracted && sceneReady) {
        setUserInteracted(true);
        interactionTimeout = setTimeout(() => setShowUI(true), 200);
      }
    };

    const handleScroll = () => {
      handleInteraction();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.abs(e.movementX) > 20 || Math.abs(e.movementY) > 20) {
        handleInteraction();
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleInteraction);
      clearTimeout(interactionTimeout);
    };
  }, [userInteracted, sceneReady]);

  const features = [
    { icon: Activity, title: 'Real-Time Scanning', description: 'Market data refreshed every ~1 minute across 6 DEX venues.', color: '#00d4ff' },
    { icon: Shield, title: 'Delta-Neutral', description: 'Hedge positions across venues. Profit from spreads, not direction.', color: '#00ff9f' },
    { icon: Target, title: 'Self-Custody', description: 'Trade on DEXs only. Your keys, your funds. Zero counterparty risk. (dApps are not exempt from exploits)', color: '#ff00ff' },
  ];

  const stats = [
    { label: 'Venues', value: '6', icon: Layers },
    { label: 'Markets', value: '500+', icon: BarChart3 },
    { label: 'Max APR', value: '150%+', icon: Percent },
    { label: 'Updates', value: 'Live', icon: Clock },
  ];

  return (
    <div ref={containerRef} className="relative bg-[#030308]">
      {/* ========== FIXED BACKGROUND (doesn't scroll) ========== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <BinaryRainBackground />
        <OrbitalScene onReady={handleSceneReady} scrollProgress={scrollProgress} />
      </div>

      <LoadingSpinner visible={loading} />

      {/* ========== SCROLLABLE CONTENT (scrolls over background) ========== */}
      {/* ============ HERO - FULL WIDTH IMMERSIVE ============ */}
      <section className="relative h-screen w-full z-10">
        <ScrollIndicator visible={sceneReady && !userInteracted} />

        {/* Nav - minimal padding */}
        <nav
          className={`absolute top-0 left-0 right-0 z-20 px-4 py-4 transition-all duration-700 ${
            showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src={withBase('logo-54sd-mini.png')} alt="54SD" className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <Link to={getScannerPath()} reloadDocument className="text-white/60 hover:text-white transition-colors text-sm">
                Scanner
              </Link>
              <Link to="/insights" className="text-white/60 hover:text-white transition-colors text-sm">
                Insights
              </Link>
              <Link
                to={getScannerPath()}
                reloadDocument
                className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm hover:bg-white/20 transition-all"
              >
                Launch
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero content - positioned to left, less margins */}
        <div
          className={`absolute inset-0 flex items-center z-10 px-4 transition-all duration-700 ${
            showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-lg">
              <GlassPanel className="p-6" visible={showUI} delay={200}>
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 mb-4">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neon-green"></span>
                  </span>
                  <span className="text-xs text-neon-green">Live</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-3 leading-tight">
                  Funding Rate{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-green">
                    Arbitrage
                  </span>
                </h2>

                <p className="text-sm text-white/50 mb-5 leading-relaxed">
                  Find delta-neutral opportunities with APRs from 20% to 150%+.
                  Real-time scanning across 6 DEX venues.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to={getScannerPath()}
                    reloadDocument
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-neon-cyan to-neon-green text-surface-900 text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,159,0.3)] transition-all"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Scanner
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    to="/insights/what-is-funding-rate-arbitrage"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/20 text-white text-sm hover:bg-white/10 transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    Learn
                  </Link>
                </div>
              </GlassPanel>

              {/* Stats - compact */}
              <div
                className={`grid grid-cols-4 gap-2 mt-4 transition-all duration-700 ${
                  showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '400ms' }}
              >
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="text-center p-2 rounded-xl bg-white/5 backdrop-blur border border-white/10">
                      <Icon className="w-3 h-3 mx-auto mb-1 text-neon-cyan/60" />
                      <div className="text-sm font-bold font-mono text-white">{stat.value}</div>
                      <div className="text-[10px] text-white/40">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle gradient at bottom - doesn't block binary rain */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-900/50 to-transparent z-5 pointer-events-none" />
      </section>

      {/* ============ FEATURES ============ */}
      <section ref={trustedSourcesRef} className="relative py-16 px-4 overflow-hidden z-10">
        {/* 80% transparent overlay - animation visible behind */}
        <div className="absolute inset-0 bg-surface-900/20" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-2">
                54Strategy<span className="text-neon-cyan">Digital</span>
              </h2>
              <p className="text-white/40 text-sm max-w-md mx-auto">
                Professional tools for funding rate arbitrage across DEXs.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <ScrollReveal key={i}>
                  <GlassPanel className="p-5 h-full hover:scale-[1.02] hover:border-white/20 transition-transform group text-center">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 mx-auto"
                      style={{ background: `${feature.color}15`, boxShadow: `0 0 20px ${feature.color}10` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/40 text-sm">{feature.description}</p>
                  </GlassPanel>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ VENUE NETWORK 3D ============ */}
      <section className="relative py-6 md:py-8 overflow-hidden z-10">
        {/* Solid dark background for contrast */}
        <div className="absolute inset-0 bg-[#050508]" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-4">
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-2">
                <span className="text-neon-cyan">6 Venues</span>, One Network
              </h2>
              <p className="text-white/40 text-sm max-w-lg mx-auto mb-4">
                Real-time data aggregation from leading decentralized perpetual exchanges, converging into unified intelligence.
              </p>
              {/* Venue Labels - Above the scene */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                {VENUES.map((venue, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: `#${venue.logoColor.toString(16).padStart(6, '0')}` }}
                    />
                    <span className="text-sm md:text-base font-semibold text-white/70">{venue.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* 3D Venue Network Scene - Full width, no labels inside */}
          <ScrollReveal>
            <div className="w-full max-w-6xl mx-auto">
              <VenueNetworkScene />
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* ============ ROADMAP / PRODUCT PHASES ============ */}
      <section className="relative py-8 md:py-12 overflow-hidden z-10">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#0a0a12] to-[#050508]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 mb-4">
                <Sparkles className="w-3 h-3 text-neon-cyan" />
                <span className="text-xs font-medium text-neon-cyan">Product Roadmap</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-3">
                From <span className="text-neon-cyan">Intelligence</span> to <span className="text-neon-green">Execution</span>
              </h2>
              <p className="text-white/40 text-sm md:text-base max-w-2xl mx-auto">
                Building the infrastructure for decentralized perpetual trading. One layer at a time.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">

            {/* PHASE 1: LIVE */}
            <ScrollReveal>
              <div className="group relative h-full">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan to-neon-green rounded-2xl opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />

                <div className="relative h-full bg-[#0a0a12] border border-neon-cyan/30 rounded-2xl p-6 md:p-8 overflow-hidden">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-green/20 border border-neon-green/40">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
                      </span>
                      <span className="text-xs font-bold text-neon-green uppercase tracking-wider">Live</span>
                    </div>
                    <span className="text-xs text-white/30">Phase 1</span>
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-green/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Activity className="w-7 h-7 text-neon-cyan" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                    Funding Rate Scanner
                  </h3>
                  <p className="text-white/50 text-sm mb-6 leading-relaxed">
                    Real-time aggregation of funding rates, spreads, and APR opportunities across 6 DEX venues.
                    Identify the highest-yield delta-neutral positions instantly.
                  </p>

                  {/* Features list */}
                  <ul className="space-y-2 mb-6">
                    {[
                      'Real-time funding rates',
                      '6 DEX venues monitored',
                      'APR calculations',
                      'Spread analysis'
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                        <CheckCircle2 className="w-4 h-4 text-neon-green flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    to={getScannerPath()}
                    reloadDocument
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/20 transition-colors group/btn"
                  >
                    <Zap className="w-4 h-4" />
                    Try Scanner
                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            {/* PHASE 2: BUILDING */}
            <ScrollReveal>
              <div className="group relative h-full">
                {/* Animated border */}
                <div
                  className="absolute -inset-0.5 rounded-2xl opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, #00d4ff, #8b5cf6, #ff00ff, #00d4ff)',
                    backgroundSize: '300% 100%',
                    animation: 'gradient-x 3s linear infinite'
                  }}
                />

                <div className="relative h-full bg-[#0a0a12] border border-purple-500/30 rounded-2xl p-6 md:p-8 overflow-hidden">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40">
                      <Settings className="w-3 h-3 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Building</span>
                    </div>
                    <span className="text-xs text-white/30">Phase 2</span>
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Cpu className="w-7 h-7 text-purple-400" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                    Strategy Engine
                  </h3>
                  <p className="text-white/50 text-sm mb-6 leading-relaxed">
                    Automated execution engine for delta-neutral strategies.
                    Smart order routing, position management, and risk controls powered by ML signals.
                  </p>

                  {/* Features list */}
                  <ul className="space-y-2 mb-6">
                    {[
                      'Automated execution',
                      'Delta-neutral hedging',
                      'Risk management',
                      'ML-powered signals'
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/40">
                        <div className="w-4 h-4 rounded-full border border-purple-500/50 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Progress indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Development Progress</span>
                      <span className="text-purple-400 font-medium">In Progress</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{
                          width: '65%',
                          animation: 'pulse 2s ease-in-out infinite'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* PHASE 3: COMING SOON */}
            <ScrollReveal>
              <div className="group relative h-full">
                <div className="relative h-full bg-[#0a0a12] border border-white/10 rounded-2xl p-6 md:p-8 overflow-hidden">
                  {/* Locked overlay pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                      backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(255,255,255,0.03) 10px,
                        rgba(255,255,255,0.03) 20px
                      )`
                    }}
                  />

                  {/* Status badge */}
                  <div className="relative z-10 flex items-center gap-2 mb-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                      <Lock className="w-3 h-3 text-white/40" />
                      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Coming Soon</span>
                    </div>
                    <span className="text-xs text-white/30">Phase 3</span>
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Rocket className="w-7 h-7 text-white/40" />
                  </div>

                  {/* Content */}
                  <h3 className="relative z-10 text-xl md:text-2xl font-bold text-white/80 mb-3">
                    Unified Trading Terminal
                  </h3>
                  <p className="relative z-10 text-white/40 text-sm mb-6 leading-relaxed">
                    One interface to execute across all venues. Managed vaults with automated strategies.
                    Cross-DEX portfolio management with builder revenue sharing.
                  </p>

                  {/* Features list */}
                  <ul className="relative z-10 space-y-2 mb-6">
                    {[
                      'Cross-DEX execution',
                      'Managed strategy vaults',
                      'Portfolio aggregation'
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/30">
                        <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0">
                          <Lock className="w-2 h-2 text-white/20" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Waitlist hint */}
                  <div className="relative z-10 flex items-center gap-2 text-xs text-white/30">
                    <Wallet className="w-4 h-4" />
                    <span>Follow us for early access</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Bottom connector line */}
          <div className="hidden md:flex items-center justify-center mt-12">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-neon-green shadow-[0_0_10px_rgba(0,255,159,0.5)]" />
              <div className="w-24 h-0.5 bg-gradient-to-r from-neon-green via-purple-500 to-white/20" />
              <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse" />
              <div className="w-24 h-0.5 bg-gradient-to-r from-purple-500 to-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20 border border-white/30" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ VALUES / INSPIRATION ============ */}
      <section className="relative py-16 md:py-20 overflow-hidden z-10">
        {/* Transparent background - animation visible behind */}
        <div className="absolute inset-0 bg-surface-900/20" />

        <div className="relative z-10 max-w-5xl mx-auto px-4">
          {/* Section header */}
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
                <Heart className="w-3 h-3 text-orange-400" />
                <span className="text-xs font-medium text-orange-400/80">Our Values</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-4">
                Built on <span className="text-orange-500">Crypto Values</span>
              </h2>
              <p className="text-white/40 text-sm md:text-base max-w-xl mx-auto">
                Inspired by the movements that changed finance forever.
              </p>
            </div>
          </ScrollReveal>

          {/* Crypto Inspirations - 3 columns */}
          <ScrollReveal>
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {/* Bitcoin */}
              <div className="group text-center p-6 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-orange-500/40 hover:bg-white/[0.05] transition-all">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                  <img src={withBase('icon-btc.svg')} alt="Bitcoin" className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Bitcoin</h3>
                <p className="text-sm text-white/40">
                  Decentralization. Trustless. Permissionless. The foundation of everything.
                </p>
              </div>

              {/* Ethereum */}
              <div className="group text-center p-6 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.05] transition-all">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                  <img src={withBase('icon-eth.png')} alt="Ethereum" className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Ethereum</h3>
                <p className="text-sm text-white/40">
                  Smart contracts. Composability. The world computer enabling DeFi.
                </p>
              </div>

              {/* Hype (Hyperliquid) */}
              <div className="group text-center p-6 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.05] transition-all">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                  <img src={withBase('venue-hyperliquid.png')} alt="Hyperliquid" className="w-10 h-10 object-contain" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Hyperliquid</h3>
                <p className="text-sm text-white/40">
                  No VCs. Community first. Proving that great products win.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Core Values - 2x2 grid */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <ScrollReveal>
              <div className="flex gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-neon-cyan/20 transition-colors group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-neon-cyan/10 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors">
                  <Lightbulb className="w-6 h-6 text-neon-cyan" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Innovation & Utility</h4>
                  <p className="text-sm text-white/40">
                    Real tools that solve real problems. Working product.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="flex gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-neon-green/20 transition-colors group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center group-hover:bg-neon-green/20 transition-colors">
                  <Box className="w-6 h-6 text-neon-green" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Real Product</h4>
                  <p className="text-sm text-white/40">
                    Ship first, talk later. Working code over whitepapers.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="flex gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-pink-500/20 transition-colors group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                  <Users className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">By the Community, For the Community</h4>
                  <p className="text-sm text-white/40">
                    Built by traders who understand the pain. Open, transparent, collaborative.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="flex gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-colors group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Gem className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Long Term Growth Alignment</h4>
                  <p className="text-sm text-white/40">
                    No VCs, no token pump, no exit liquidity schemes. Sustainable, honest growth.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ============ HOW TO COLLABORATE ============ */}
      <section className="relative py-12 md:py-16 overflow-hidden z-10">
        {/* Transparent background - animation visible behind */}
        <div className="absolute inset-0 bg-surface-900/20" />

        <div className="relative z-10 max-w-5xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                <Lock className="w-3 h-3 text-white/40" />
                <span className="text-xs font-medium text-white/40">Coming Soon</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-white/80 mb-3">
                Build or <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-green">Collab</span>
              </h2>
              <p className="text-white/30 text-sm md:text-base max-w-xl mx-auto">
                We're building in public. Multiple ways to contribute and collaborate coming soon.
              </p>
            </div>
          </ScrollReveal>

          {/* Collab cards - 3 columns */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Social Media */}
            <ScrollReveal>
              <div className="group relative h-full">
                <div className="relative h-full bg-[#0a0a12] border border-white/10 rounded-2xl p-6 overflow-hidden hover:border-blue-400/30 transition-colors">
                  {/* Locked pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)`
                    }}
                  />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                      <MessageCircle className="w-6 h-6 text-blue-400" />
                    </div>

                    <h3 className="text-lg font-bold text-white/80 mb-2">Community</h3>
                    <p className="text-sm text-white/40 mb-4">
                      Follow development updates, share feedback, and connect with other traders.
                    </p>

                    {/* Social links placeholder */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-white/30 text-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>@54StrategyDigital</span>
                        <Lock className="w-3 h-3 ml-auto" />
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-white/30 text-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                        </svg>
                        <span>Discord Server</span>
                        <Lock className="w-3 h-3 ml-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* GitHub for Devs */}
            <ScrollReveal>
              <div className="group relative h-full">
                <div className="relative h-full bg-[#0a0a12] border border-white/10 rounded-2xl p-6 overflow-hidden hover:border-purple-400/30 transition-colors">
                  {/* Locked pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)`
                    }}
                  />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                      <Code2 className="w-6 h-6 text-purple-400" />
                    </div>

                    <h3 className="text-lg font-bold text-white/80 mb-2">For Developers</h3>
                    <p className="text-sm text-white/40 mb-4">
                      Contribute to the codebase. Build integrations. Extend the platform.
                    </p>

                    {/* GitHub link placeholder */}
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-white/30 text-sm">
                      <Github className="w-4 h-4" />
                      <span>54strategy/core</span>
                      <Lock className="w-3 h-3 ml-auto" />
                    </div>

                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* GitHub for Testers */}
            <ScrollReveal>
              <div className="group relative h-full">
                <div className="relative h-full bg-[#0a0a12] border border-white/10 rounded-2xl p-6 overflow-hidden hover:border-neon-green/30 transition-colors">
                  {/* Locked pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)`
                    }}
                  />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center mb-4 group-hover:bg-neon-green/20 transition-colors">
                      <Shield className="w-6 h-6 text-neon-green" />
                    </div>

                    <h3 className="text-lg font-bold text-white/80 mb-2">For Testers</h3>
                    <p className="text-sm text-white/40 mb-4">
                      Help us find bugs. Test new features. Earn rewards for valid reports.
                    </p>

                    {/* GitHub link placeholder */}
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-white/30 text-sm">
                      <Github className="w-4 h-4" />
                      <span>54strategy/beta-testing</span>
                      <Lock className="w-3 h-3 ml-auto" />
                    </div>

                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Bottom CTA */}
          <ScrollReveal className="mt-10">
            <div className="text-center">
              <p className="text-white/30 text-sm mb-4">
                Want early access? Drop your feedback on the scanner.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Try the Scanner First
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ============ ARTICLES ============ */}
      <section className="relative py-16 px-4 overflow-hidden z-10">
        {/* 80% transparent overlay - animation visible behind */}
        <div className="absolute inset-0 bg-surface-900/20" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-bold font-display text-white mb-1">Learn Funding Arbitrage</h2>
                <p className="text-white/40 text-sm">Guides for delta-neutral strategies</p>
              </div>
              <Link to="/insights" className="hidden md:flex items-center gap-1 text-neon-cyan hover:text-neon-green text-sm">
                All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-4">
            {featuredArticles.map((article) => (
              <ScrollReveal key={article.id}>
                <Link to={`/insights/${article.slug}`} className="group block h-full">
                  <GlassPanel className="p-4 h-full hover:border-neon-cyan/30 group-hover:-translate-y-1 transition-transform">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-neon-cyan/10 text-neon-cyan">
                        {article.category}
                      </span>
                      <span className="flex items-center text-[10px] text-white/30">
                        <Clock className="w-2.5 h-2.5 mr-0.5" />
                        {article.readTime}m
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-neon-cyan transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-xs text-white/30 line-clamp-2">{article.excerpt}</p>
                  </GlassPanel>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative py-16 px-4 overflow-hidden z-10">
        {/* 80% transparent overlay - animation visible behind */}
        <div className="absolute inset-0 bg-surface-900/20" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <ScrollReveal>
            <GlassPanel className="p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-[-2px] opacity-20"
                  style={{
                    background: 'linear-gradient(90deg, #00d4ff, #00ff9f, #ff00ff, #00d4ff)',
                    backgroundSize: '300% 100%',
                    animation: 'gradient-x 4s linear infinite',
                  }}
                />
              </div>

              <BarChart3 className="w-10 h-10 mx-auto mb-4 text-neon-cyan" />
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-3">
                Ready to Find Opportunities?
              </h2>
              <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
                Scan real-time funding rates across 6 DEX venues.
              </p>
              <Link
                to="/"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-neon-cyan to-neon-green text-surface-900 font-bold hover:shadow-[0_0_30px_rgba(0,255,159,0.4)] transition-all"
              >
                <TrendingUp className="w-5 h-5" />
                Launch Scanner
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </GlassPanel>
          </ScrollReveal>
        </div>
      </section>

      {/* ============ DISCLAIMER ============ */}
      <section className="relative py-8 px-4 z-10">
        {/* Disclaimer needs more opacity for readability */}
        <div className="absolute inset-0 bg-surface-900/40" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Educational Purpose Only</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                This site is for educational purposes only. Trading perpetual futures involves significant risk.
                Always do your own research. Never trade with money you cannot afford to lose.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
