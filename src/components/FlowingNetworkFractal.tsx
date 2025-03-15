import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// A simpler version that's more stable
function NetworkLines() {
  const groupRef = useRef<THREE.Group>(null);
  const [lines, setLines] = useState<JSX.Element[]>([]);
  
  useEffect(() => {
    // Generate network manually instead of using recursion
    const baseLines = [
      { start: [-3, 3, -3], end: [3, 3, -3], color: '#3498db' },
      { start: [3, 3, -3], end: [3, 3, 3], color: '#3498db' },
      { start: [3, 3, 3], end: [-3, 3, 3], color: '#3498db' },
      { start: [-3, 3, 3], end: [-3, 3, -3], color: '#3498db' },
      
      { start: [-3, -3, -3], end: [3, -3, -3], color: '#2980b9' },
      { start: [3, -3, -3], end: [3, -3, 3], color: '#2980b9' },
      { start: [3, -3, 3], end: [-3, -3, 3], color: '#2980b9' },
      { start: [-3, -3, 3], end: [-3, -3, -3], color: '#2980b9' },
      
      { start: [-3, 3, -3], end: [-3, -3, -3], color: '#1abc9c' },
      { start: [3, 3, -3], end: [3, -3, -3], color: '#1abc9c' },
      { start: [3, 3, 3], end: [3, -3, 3], color: '#1abc9c' },
      { start: [-3, 3, 3], end: [-3, -3, 3], color: '#1abc9c' },
      
      // Second level - smaller cubes
      { start: [-1.5, 1.5, -1.5], end: [1.5, 1.5, -1.5], color: '#3498db' },
      { start: [1.5, 1.5, -1.5], end: [1.5, 1.5, 1.5], color: '#3498db' },
      { start: [1.5, 1.5, 1.5], end: [-1.5, 1.5, 1.5], color: '#3498db' },
      { start: [-1.5, 1.5, 1.5], end: [-1.5, 1.5, -1.5], color: '#3498db' },
      
      { start: [-1.5, -1.5, -1.5], end: [1.5, -1.5, -1.5], color: '#2980b9' },
      { start: [1.5, -1.5, -1.5], end: [1.5, -1.5, 1.5], color: '#2980b9' },
      { start: [1.5, -1.5, 1.5], end: [-1.5, -1.5, 1.5], color: '#2980b9' },
      { start: [-1.5, -1.5, 1.5], end: [-1.5, -1.5, -1.5], color: '#2980b9' },
      
      { start: [-1.5, 1.5, -1.5], end: [-1.5, -1.5, -1.5], color: '#1abc9c' },
      { start: [1.5, 1.5, -1.5], end: [1.5, -1.5, -1.5], color: '#1abc9c' },
      { start: [1.5, 1.5, 1.5], end: [1.5, -1.5, 1.5], color: '#1abc9c' },
      { start: [-1.5, 1.5, 1.5], end: [-1.5, -1.5, 1.5], color: '#1abc9c' },
    ];
    
    // Create the line elements
    const lineElements = baseLines.map((line, i) => {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...line.start),
        new THREE.Vector3(...line.end)
      ]);
      
      // Use the primitive element for THREE.Line objects
      return (
        <primitive
          key={i}
          object={new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({ color: line.color, linewidth: 2 })
          )}
        />
      );
    });
    
    setLines(lineElements);
  }, []);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      // Rotate the entire structure
      groupRef.current.rotation.y = t * 0.2;
      groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.3;
    }
  });
  
  return <group ref={groupRef}>{lines}</group>;
}

function Particles({ count = 100 }) {
  const points = useRef<THREE.Points>(null);
  
  useEffect(() => {
    if (!points.current) return;
    
    const geometry = points.current.geometry;
    const posArray = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random positions within a sphere
      const radius = 2.5 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      posArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      posArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      posArray[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  }, [count]);
  
  useFrame(({ clock }) => {
    if (!points.current) return;
    
    const t = clock.getElapsedTime();
    points.current.rotation.y = t * 0.1;
    
    // Gently pulse the particle size
    if (points.current.material instanceof THREE.PointsMaterial) {
      points.current.material.size = 0.05 + Math.sin(t * 2) * 0.02;
    }
  });
  
  return (
    <points ref={points}>
      <bufferGeometry />
      <pointsMaterial
        size={0.05}
        color="#64B5F6"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function FlowingNetworkFractal() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: '#000915' }}
      >
        <ambientLight intensity={0.5} />
        <NetworkLines />
        <Particles count={150} />
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
}