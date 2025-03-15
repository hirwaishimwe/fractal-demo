import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls,
  shaderMaterial,
  useTexture, 
  PerspectiveCamera,
  CameraShake
} from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

// Custom shader material for flowing lines
// Define the interfaces for your custom shader materials to avoid TypeScript errors
interface FlowingMaterialUniforms {
  time: { value: number };
  color: { value: THREE.Color };
  resolution: { value: THREE.Vector2 };
  amplitude: { value: number };
  frequency: { value: number };
  speedFactor: { value: number };
  thickness: { value: number };
  opacity: { value: number };
}

interface ParticleMaterialUniforms {
  time: { value: number };
  color: { value: THREE.Color };
  pointTexture: { value: THREE.Texture | null };
  size: { value: number };
  opacity: { value: number };
}

// Custom shader material for flowing lines
const FlowingMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.15, 0.7, 1.0),
    resolution: new THREE.Vector2(1, 1),
    amplitude: 0.1,
    frequency: 0.5,
    speedFactor: 0.2,
    thickness: 0.02,
    opacity: 0.8,
  },
  // Vertex shader
  `
    uniform float time;
    uniform float amplitude;
    uniform float frequency;
    uniform float speedFactor;
    
    varying vec2 vUv;
    varying float vProgress;
    
    void main() {
      vUv = uv;
      
      // Calculate curve position
      float progress = position.y;
      vProgress = progress;
      
      // Apply wave effect to x position
      float wave = sin(progress * frequency * 10.0 + time * speedFactor) * amplitude;
      wave += sin(progress * frequency * 15.0 + time * speedFactor * 0.8) * amplitude * 0.5;
      
      // Create the curve motion
      vec3 newPosition = position;
      newPosition.x += wave;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    uniform float thickness;
    
    varying vec2 vUv;
    varying float vProgress;
    
    void main() {
      // Smooth line with gradient
      float line = smoothstep(0.0, thickness, 1.0 - abs(vUv.x - 0.5) * 2.0);
      
      // Fade out at ends
      float fadeEdges = smoothstep(0.0, 0.1, vProgress) * smoothstep(1.0, 0.9, vProgress);
      
      // Glow effect
      float glow = smoothstep(thickness, thickness * 6.0, 1.0 - abs(vUv.x - 0.5) * 2.0) * 0.6;
      
      // Pulsing effect
      float pulse = sin(time * 0.5) * 0.5 + 0.5;
      
      // Combine effects
      vec3 finalColor = color * (line + glow * pulse * 0.5);
      float finalAlpha = (line + glow * 0.5) * opacity * fadeEdges;
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
);

// Custom particle material
const ParticleMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.15, 0.7, 1.0),
    pointTexture: null,
    size: 0.1,
    opacity: 0.8,
  },
  // Vertex shader
  `
    uniform float time;
    uniform float size;
    
    attribute float scale;
    attribute float speed;
    attribute float offset;
    
    varying float vAlpha;
    
    void main() {
      vec3 pos = position;
      
      // Calculate rotation and movement
      float angle = offset + time * speed;
      float radius = length(pos.xz);
      
      // Update position with orbital movement
      pos.x = radius * cos(angle);
      pos.z = radius * sin(angle);
      
      // Vertical movement
      pos.y += sin(time * 0.3 + offset * 10.0) * 0.1;
      
      // Calculate distance-based opacity
      float distanceFromCenter = length(pos);
      vAlpha = smoothstep(5.0, 0.5, distanceFromCenter);
      
      // Set size based on scale attribute
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * scale * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    uniform sampler2D pointTexture;
    
    varying float vAlpha;
    
    void main() {
      // Circular particles with soft edge
      float dist = length(gl_PointCoord - vec2(0.5));
      float fade = smoothstep(0.5, 0.4, dist);
      
      // Combine with distance-based alpha
      float alpha = fade * vAlpha * opacity;
      
      // Pulse effect
      float pulse = sin(time * 0.5) * 0.15 + 0.85;
      
      // Final color
      vec3 finalColor = color * pulse;
      gl_FragColor = vec4(finalColor, alpha);
      
      // Discard pixels beyond the circle
      if (dist > 0.5) discard;
    }
  `
);

// Register custom materials
extend({ FlowingMaterial, ParticleMaterial });

// Add the missing type for the extended material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      flowingMaterial: any; // Using 'any' to avoid TypeScript errors with custom materials
      particleMaterial: any; // Using 'any' to avoid TypeScript errors with custom materials
    }
  }
}

// Helper function to create a curved path
function createCurvePath(radius: number, segments: number, height: number, turns: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const progress = i / segments;
    const angle = progress * Math.PI * 2 * turns;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = height * Math.sin(progress * Math.PI); // Arc up and down
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}

// Component for flowing lines
function FlowingLines() {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Mesh[]>([]);
  const materialsRef = useRef<any[]>([]);
  
  // Generate flow paths
  const paths = useMemo(() => {
    const allPaths = [];
    
    // Create multiple orbital paths
    for (let i = 0; i < 40; i++) {
      const radius = 3 + Math.random() * 3;
      const segments = 128; // High segment count for smooth curves
      const height = (Math.random() - 0.5) * 2; // Vary the height
      const turns = 1 + Math.random() * 0.5; // Number of full turns
      
      allPaths.push(createCurvePath(radius, segments, height, turns));
    }
    
    return allPaths;
  }, []);
  
  // Setup lines
  useEffect(() => {
    if (!groupRef.current) return;
    
    // Clear existing lines
    linesRef.current = [];
    materialsRef.current = [];
    
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    
    // Create new lines
    paths.forEach((path, index) => {
      // Create tube geometry along path
      const curve = new THREE.CatmullRomCurve3(path);
      const tubeGeometry = new THREE.TubeGeometry(curve, 128, 0.015 + Math.random() * 0.01, 8, false);
      
      // Create material with type assertion to avoid TypeScript errors
      const material = new FlowingMaterial({
        color: new THREE.Color(0.15, 0.7, 1.0),
        amplitude: 0.05 + Math.random() * 0.05,
        frequency: 0.3 + Math.random() * 0.3,
        speedFactor: 0.1 + Math.random() * 0.2,
        thickness: 0.2 + Math.random() * 0.2,
        opacity: 0.6 + Math.random() * 0.4,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      } as any);
      
      // Create mesh
      const mesh = new THREE.Mesh(tubeGeometry, material);
      linesRef.current.push(mesh);
      materialsRef.current.push(material);
      
      if (groupRef.current) {
        groupRef.current.add(mesh);
      }
    });
  }, [paths]);
  
  // Animation
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Update material uniforms
    materialsRef.current.forEach((material, index) => {
      if (material && material.uniforms) {
        material.uniforms.time.value = time;
      }
    });
    
    // Gentle rotation of entire group
    groupRef.current.rotation.y = time * 0.05;
  });
  
  return <group ref={groupRef} />;
}

// Component for particles
function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  const { viewport } = useThree();
  
  // Create particle system
  useEffect(() => {
    if (!particlesRef.current) return;
    
    const count = 500;
    
    // Create geometry
    const geometry = particlesRef.current.geometry;
    
    // Create attributes
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    
    // Initialize particles
    for (let i = 0; i < count; i++) {
      // Position in a donut shape
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 4;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2; // Y position
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Attributes
      scales[i] = Math.random() * 2 + 0.5; // Size variety
      speeds[i] = 0.05 + Math.random() * 0.1; // Speed variety
      offsets[i] = Math.random() * Math.PI * 2; // Phase offset
    }
    
    // Set attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
  }, []);
  
  // Create a simple circular texture for particles
  const particleTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2;
      
      // Create radial gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.5)');
      gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
      
      // Draw circle
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
  // Animation
  useFrame(({ clock }) => {
    if (!materialRef.current || !particlesRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Update material uniforms
    materialRef.current.uniforms.time.value = time;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry />
      <particleMaterial 
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        pointTexture={particleTexture}
        color={new THREE.Color(0.4, 0.8, 1.0)}
        size={0.15}
        opacity={0.8}
        {...{} /* This empty object spread helps TypeScript ignore extra props */}
      />
    </points>
  );
}

// Main component
export default function EnhancedIOHKVisualization() {
  return (
    <div className="w-full h-full">
      <Canvas
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: false 
        }}
        dpr={[1, 2]} // Responsive DPR for performance
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: 'rgb(0, 6, 20)' }} // IOHK dark blue background
      >
        <CameraShake
          maxYaw={0.01}
          maxPitch={0.01}
          maxRoll={0.01}
          yawFrequency={0.2}
          pitchFrequency={0.2}
          rollFrequency={0.2}
        />
        
        <FlowingLines />
        <Particles />
        
        <EffectComposer>
          {/* Bloom effect for glow */}
          <Bloom
            intensity={1.0}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            blendFunction={BlendFunction.SCREEN}
          />
          {/* Vignette for edge darkening */}
          <Vignette
            offset={0.5}
            darkness={0.5}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.5}
          minDistance={6}
          maxDistance={20}
        />
      </Canvas>
    </div>
  );
}