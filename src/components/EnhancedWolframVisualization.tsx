import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { OrbitControls, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

// Custom shader for cellular automaton
const CellularAutomatonMaterial = shaderMaterial(
  {
    time: 0,
    resolution: new THREE.Vector2(1024, 1024),
    initialState: new THREE.DataTexture(
      new Uint8Array(1024 * 1024 * 4), 
      1024, 
      1024, 
      THREE.RGBAFormat
    ),
    cellColor: new THREE.Color(0.15, 0.7, 1.0),
    noiseFactor: 0.05,
    pulseSpeed: 0.5,
    pulseIntensity: 0.2,
    offsetY: 0.0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec2 resolution;
    uniform sampler2D initialState;
    uniform vec3 cellColor;
    uniform float noiseFactor;
    uniform float pulseSpeed;
    uniform float pulseIntensity;
    uniform float offsetY;
    
    varying vec2 vUv;
    
    // Noise functions
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    // Cellular automaton lookup
    float getState(vec2 uv) {
      vec4 state = texture2D(initialState, uv);
      return state.r;
    }
    
    void main() {
      // Offset and scale UV coordinates
      vec2 uv = vUv;
      uv.y = uv.y - offsetY;
      
      // Add some slight distortion
      uv.x += sin(uv.y * 30.0 + time * 0.5) * 0.002;
      
      // Check if we're within the valid range
      if (uv.y < 0.0 || uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }
      
      // Get cell state from the texture
      float state = getState(uv);
      
      // Apply noise to give texture
      float noise = random(uv * 100.0 + time * 0.1) * noiseFactor;
      
      // Pulse effect
      float pulse = sin(time * pulseSpeed) * pulseIntensity + (1.0 - pulseIntensity);
      
      // Glowing effect
      float glow = 0.0;
      
      if (state > 0.5) {
        // Calculate distance to cell center for glow effect
        vec2 cellUV = fract(uv * resolution / 8.0) - 0.5;
        float distToCenter = length(cellUV) * 2.0;
        
        // Inner bright part of the cell
        float core = smoothstep(0.8, 0.2, distToCenter);
        
        // Outer glow
        glow = smoothstep(1.0, 0.5, distToCenter) * 0.5;
        
        // Final state with effects
        state = core + glow;
        state *= pulse;
        
        // Add some noise for texture
        state += noise;
        
        // Output final color
        gl_FragColor = vec4(cellColor * state, state);
      } else {
        // Dark background with slight ambient glow
        gl_FragColor = vec4(cellColor * noise * 0.1, noise * 0.1);
      }
    }
  `
);

// Material for particles around the pattern
const WolframParticleMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.15, 0.7, 1.0),
    size: 0.1,
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
      
      // Calculate orbital motion
      float angle = offset + time * speed;
      
      // Spiral motion
      float spiral = time * 0.05;
      float radius = length(pos.xz) + sin(time * 0.2 + offset * 10.0) * 0.2;
      
      // Update position
      pos.x = cos(angle) * radius;
      pos.z = sin(angle) * radius;
      pos.y += sin(time * 0.2 + offset * 5.0) * 0.1;
      
      // Distance-based opacity
      float distanceFromCenter = length(pos);
      vAlpha = smoothstep(20.0, 2.0, distanceFromCenter) * 0.8;
      
      // Set point size
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * scale * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    
    varying float vAlpha;
    
    void main() {
      // Create a soft, circular particle
      float dist = length(gl_PointCoord - vec2(0.5));
      float fade = smoothstep(0.5, 0.2, dist);
      
      // Pulse effect
      float pulse = sin(time * 0.5) * 0.2 + 0.8;
      
      // Final color with alpha
      gl_FragColor = vec4(color * pulse, fade * vAlpha);
      
      // Discard pixels beyond the circle
      if (dist > 0.5) discard;
    }
  `
);

// Register custom materials
extend({ CellularAutomatonMaterial, WolframParticleMaterial });

// Add the missing type for the extended material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      cellularAutomatonMaterial: any;
      wolframParticleMaterial: any;
    }
  }
}

// Initialize Rule 30 cellular automaton
function createRule30Texture(width: number, height: number): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  
  // Clear all cells
  for (let i = 0; i < width * height * 4; i += 4) {
    data[i] = 0;     // R
    data[i + 1] = 0; // G
    data[i + 2] = 0; // B
    data[i + 3] = 255; // A
  }
  
  // Set initial condition - single cell in the middle of the top row
  const centerX = Math.floor(width / 2);
  const index = (0 * width + centerX) * 4;
  data[index] = 255;
  
  // Apply Rule 30 to generate the full pattern
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      const left = x === 0 ? 0 : data[((y * width) + (x - 1)) * 4] > 0 ? 1 : 0;
      const center = data[((y * width) + x) * 4] > 0 ? 1 : 0;
      const right = x === width - 1 ? 0 : data[((y * width) + (x + 1)) * 4] > 0 ? 1 : 0;
      
      // Apply Rule 30: 111->0, 110->0, 101->0, 100->1, 011->1, 010->1, 001->1, 000->0
      const pattern = (left << 2) | (center << 1) | right;
      const nextState = (pattern === 1 || pattern === 2 || pattern === 3 || pattern === 4) ? 1 : 0;
      
      // Set the next generation cell
      const nextIndex = ((y + 1) * width + x) * 4;
      data[nextIndex] = nextState * 255;
      data[nextIndex + 3] = 255;
    }
  }
  
  // Create and return the texture
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;
  
  return texture;
}

// Main cellular automaton visualization
function CellularAutomaton() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { viewport } = useThree();
  
  // Create the initial state texture
  const initialState = useMemo(() => {
    return createRule30Texture(1024, 1024);
  }, []);
  
  // Animation
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Update material uniforms
    materialRef.current.uniforms.time.value = time;
    
    // Slowly scroll through the pattern
    const newOffset = Math.min(0.8, time * 0.01);
    materialRef.current.uniforms.offsetY.value = newOffset;
    setScrollOffset(newOffset);
  });
  
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[15, 15, 1, 1]} />
      <cellularAutomatonMaterial
        ref={materialRef}
        initialState={initialState}
        resolution={new THREE.Vector2(1024, 1024)}
        cellColor={new THREE.Color(0.15, 0.7, 1.0)}
        noiseFactor={0.05}
        pulseSpeed={0.3}
        pulseIntensity={0.2}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Particle system for ambient effects
function WolframParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  
  // Create particle attributes
  useEffect(() => {
    if (!particlesRef.current) return;
    
    const count = 1000;
    const geometry = particlesRef.current.geometry;
    
    // Create attributes
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    
    // Initialize particles in a spiral pattern
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 10;
      const height = (Math.random() - 0.5) * 8;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      scales[i] = Math.random() * 1.5 + 0.5;
      speeds[i] = 0.01 + Math.random() * 0.05;
      offsets[i] = Math.random() * Math.PI * 2;
    }
    
    // Set attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
  }, []);
  
  // Animation
  useFrame(({ clock }) => {
    if (!particlesRef.current || !materialRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Update material uniforms
    materialRef.current.uniforms.time.value = time;
    
    // Update particle positions for flowing effect
    const positions = particlesRef.current.geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const idx = i * 3;
      const speed = (particlesRef.current.geometry.attributes.speed as THREE.BufferAttribute).getX(i);
      const offset = (particlesRef.current.geometry.attributes.offset as THREE.BufferAttribute).getX(i);
      
      // Get the current position
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Calculate angle and radius
      let angle = Math.atan2(z, x) + time * speed;
      let radius = Math.sqrt(x * x + z * z) + Math.sin(time * 0.2 + offset * 10.0) * 0.1;
      
      // Update position with orbital motion
      positions.setX(i, Math.cos(angle) * radius);
      positions.setZ(i, Math.sin(angle) * radius);
      positions.setY(i, y + Math.sin(time * 0.2 + offset * 5.0) * 0.02);
    }
    
    positions.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry />
      <wolframParticleMaterial 
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={new THREE.Color(0.4, 0.8, 1.0)}
        size={0.15}
      />
    </points>
  );
}

// Main component
export default function WolframGameOfLife() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        style={{ background: 'rgb(1, 8, 22)' }} // Very dark blue, like IOHK site
      >
        <CellularAutomaton />
        <WolframParticles />
        <EffectComposer>
          {/* Bloom effect for glow */}
          <Bloom
            intensity={1.0}
            luminanceThreshold={0.2}
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
          enableZoom={true}
          minDistance={10}
          maxDistance={40}
        />
      </Canvas>
    </div>
  );
}