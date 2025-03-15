import { useRef, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Custom curved line implementation inspired by IOHK visualization
function CurvedLines() {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Line[]>([]);
  const pointsArrays = useRef<THREE.Vector3[][]>([]);
  
  useEffect(() => {
    if (!groupRef.current) return;
    
    // Clear any existing lines
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    
    linesRef.current = [];
    pointsArrays.current = [];
    
    // Generate flowing curves in 3D space
    const numCurves = 30;
    
    for (let i = 0; i < numCurves; i++) {
      // Create a curved path
      const points: THREE.Vector3[] = [];
      const numPoints = 100;
      const radius = 4 + Math.random() * 2;
      const height = 1.5 * (Math.random() - 0.5);
      const startAngle = Math.random() * Math.PI * 2;
      const curve = Math.random() * 0.5 + 0.5;
      
      for (let j = 0; j < numPoints; j++) {
        const t = j / (numPoints - 1);
        const angle = startAngle + t * Math.PI * 2 * curve;
        
        // Create wave pattern
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        const y = height + Math.sin(t * Math.PI * 4) * 0.5;
        
        points.push(new THREE.Vector3(x, y, z));
      }
      
      // Store points for animation
      pointsArrays.current.push([...points]);
      
      // Create curve geometry
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Create line material - IOHK uses white/blue glowing lines
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(0.4, 0.8, 1.0),
        opacity: 0.5 + Math.random() * 0.5,
        transparent: true,
      });
      
      // Create line and add to scene
      const line = new THREE.Line(geometry, material);
      linesRef.current.push(line);
      groupRef.current.add(line);
    }
  }, []);
  
  // Animate the lines with a flowing motion similar to IOHK
  useFrame(({ clock }) => {
    if (!groupRef.current || linesRef.current.length === 0) return;
    
    const time = clock.getElapsedTime();
    
    // Animate each line
    linesRef.current.forEach((line, lineIndex) => {
      const basePoints = pointsArrays.current[lineIndex];
      const positions = line.geometry.attributes.position;
      
      for (let i = 0; i < basePoints.length; i++) {
        const basePoint = basePoints[i];
        
        // Create flowing wave effect
        const offset = new THREE.Vector3(
          Math.sin(time * 0.5 + i * 0.02 + lineIndex * 0.2) * 0.1,
          Math.sin(time * 0.3 + i * 0.03 + lineIndex * 0.5) * 0.1,
          Math.sin(time * 0.4 + i * 0.01 + lineIndex * 0.3) * 0.1
        );
        
        const animatedPoint = basePoint.clone().add(offset);
        positions.setXYZ(i, animatedPoint.x, animatedPoint.y, animatedPoint.z);
      }
      
      positions.needsUpdate = true;
    });
    
    // Slowly rotate the entire structure
    groupRef.current.rotation.y = time * 0.05;
  });
  
  return <group ref={groupRef} />;
}

function Particles() {
  const points = useRef<THREE.Points>(null);
  
  useEffect(() => {
    if (!points.current) return;
    
    const count = 300;
    const geometry = points.current.geometry;
    const posArray = new Float32Array(count * 3);
    const sizeArray = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Random positions within a sphere
      const radius = 5 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      posArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      posArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      posArray[i * 3 + 2] = radius * Math.cos(phi);
      
      // Variation in particle sizes
      sizeArray[i] = Math.random() * 0.05 + 0.02;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
  }, []);
  
  useFrame(({ clock }) => {
    if (!points.current) return;
    
    const time = clock.getElapsedTime();
    const positions = points.current.geometry.attributes.position;
    
    // Animate particles along the flowing lines
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const angle = Math.atan2(z, x);
      const radius = Math.sqrt(x * x + z * z);
      
      // Update position to create a flowing motion around the curves
      const newAngle = angle + 0.002;
      positions.setX(i, Math.cos(newAngle) * radius);
      positions.setZ(i, Math.sin(newAngle) * radius);
      
      // Subtle up/down movement
      positions.setY(i, y + Math.sin(time + i * 0.1) * 0.003);
    }
    
    positions.needsUpdate = true;
  });
  
  return (
    <points ref={points}>
      <bufferGeometry />
      <pointsMaterial
        size={0.05}
        color="#a0d8ff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

export default function IOHKStyleFractal() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ background: 'rgb(1, 14, 34)' }} // IOHK uses a very dark blue
      >
        <CurvedLines />
        <Particles />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}