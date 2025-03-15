import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';

// Define a shader material for the Julia set
const JuliaShaderMaterial = shaderMaterial(
  {
    time: 0,
    resolution: new THREE.Vector2(800, 600),
    zoom: 2.5,
    colorA: new THREE.Color('#334455'),
    colorB: new THREE.Color('#112233'),
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader - Julia Set
  `
    uniform float time;
    uniform vec2 resolution;
    uniform float zoom;
    uniform vec3 colorA;
    uniform vec3 colorB;
    varying vec2 vUv;
    
    vec2 complexSqr(vec2 z) {
      return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
    }
    
    // Smooth coloring function
    float smoothColor(float escapeTime, vec2 z, float maxIter) {
      // Apply logarithmic smoothing for better gradient transitions
      return escapeTime - log2(log2(dot(z, z))) + 4.0;
    }
    
    void main() {
      // Much slower parameter change - only changes once every ~15 seconds
      vec2 c = vec2(
        0.355 * sin(time * 0.05),
        0.355 * cos(time * 0.03)
      );
      
      // Adjust aspect ratio to prevent stretching
      float aspectRatio = resolution.x / resolution.y;
      vec2 uv = vUv - 0.5;
      uv.x *= aspectRatio;
      uv *= zoom;
      
      vec2 z = uv;
      float iter = 0.0;
      const float maxIter = 300.0; // Increased iterations for more detail
      
      // Julia set iteration
      for(float i = 0.0; i < maxIter; i++) {
        z = complexSqr(z) + c;
        
        if(dot(z, z) > 4.0) { // Using dot product for efficiency
          break;
        }
        
        iter++;
      }
      
      // Apply smooth coloring if the point escaped
      float smoothed;
      if(iter < maxIter - 1.0) {
        smoothed = smoothColor(iter, z, maxIter) / maxIter;
      } else {
        smoothed = 0.0; // Points in the set
      }
      
      // Enhanced color palette with smoother transitions
      vec3 color1 = colorA * 0.7;
      vec3 color2 = colorB * 0.7;
      vec3 color3 = mix(colorA, colorB, 0.5) * 0.8;
      
      // Multi-color gradient for more visual interest
      vec3 color;
      if(smoothed < 0.3) {
        color = mix(color1, color2, smoothed / 0.3);
      } else if(smoothed < 0.6) {
        color = mix(color2, color3, (smoothed - 0.3) / 0.3);
      } else {
        color = mix(color3, color1, (smoothed - 0.6) / 0.4);
      }
      
      // Add subtle glow for points deep in the set
      if(iter >= maxIter - 1.0) {
        // Inner set points get a gentle glow
        color = mix(vec3(0.0, 0.0, 0.1), color3 * 0.3, 0.5);
      }
      
      // Apply anti-aliasing through slight blurring
      float pixelSize = 1.0 / min(resolution.x, resolution.y);
      float edge = smoothstep(0.0, pixelSize * 2.0, abs(smoothed - 0.5));
      color = mix(color, color * 0.9, edge * 0.2);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

// Extend Three.js materials with our custom shader
extend({ JuliaShaderMaterial });

// Add the missing type for the extended material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      juliaShaderMaterial: any;
    }
  }
}

function JuliaSetPlane() {
  const materialRef = useRef<any>();
  const [animationTime, setAnimationTime] = useState(0);
  
  // Update shader parameters 
  useFrame(({ clock, size }) => {
    if (materialRef.current) {
      materialRef.current.time = clock.getElapsedTime();
      materialRef.current.resolution = new THREE.Vector2(size.width, size.height);
      
      // Cycle through colors much more slowly
      const t = clock.getElapsedTime() * 0.02;
      materialRef.current.colorA = new THREE.Color(
        `hsl(${(t * 30) % 360}, 60%, 40%)`
      );
      materialRef.current.colorB = new THREE.Color(
        `hsl(${((t * 30) + 120) % 360}, 60%, 40%)`
      );
    }
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (materialRef.current) {
        materialRef.current.resolution = new THREE.Vector2(
          window.innerWidth, 
          window.innerHeight
        );
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <mesh>
      <planeGeometry args={[15, 15, 1, 1]} />
      <juliaShaderMaterial ref={materialRef} />
    </mesh>
  );
}

export default function JuliaSet() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: '#000000' }}
        gl={{ antialias: true, alpha: false, precision: "highp" }}
        dpr={[1, 2]} // Handle higher DPR devices for better quality
      >
        <JuliaSetPlane />
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}