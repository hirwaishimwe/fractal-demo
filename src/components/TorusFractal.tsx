import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Define colors for each depth level
const DEPTH_COLORS = [
  '#ff0000', // Red
  '#00ff00', // Green
  '#0000ff', // Blue
  '#ffff00', // Yellow
  '#ff00ff', // Magenta
];

interface TorusProps {
  position?: [number, number, number];
  radius?: number;
  tubeRadius?: number;
  depth?: number;
  delay?: number;
  onGenerated?: () => void;
}

function Torus({ position = [0, 0, 0], radius = 4, tubeRadius = 2, depth = 6, delay = 0, onGenerated }: TorusProps) {
  const [show, setShow] = useState(depth > 0 ? false : true);
  const [showChildren, setShowChildren] = useState(false);
  const [scale, setScale] = useState(0.001);
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Animation loop for growth effect and continuous rotation
  useFrame((state) => {
    if (show && scale < 1) {
      setScale(prev => Math.min(prev + 0.05, 1));
    }

    // Add continuous 3D rotation to each group based on its depth
    if (groupRef.current && depth > 0) {
      const t = state.clock.getElapsedTime();
      // Each depth level rotates at different speeds around each axis
      groupRef.current.rotation.x = t * 0.5 * (depth * 0.3);
      groupRef.current.rotation.y = t * 0.7 * (depth * 0.2);
      groupRef.current.rotation.z = t * 0.3 * (depth * 0.4);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
      const childTimer = setTimeout(() => {
        setShowChildren(true);
        if (onGenerated) onGenerated();
      }, 1000);
      return () => clearTimeout(childTimer);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, onGenerated]);

  if (!show) return null;

  // Calculate positions for child tori
  const childTori = [];
  if (depth > 0 && showChildren) {
    // Set child's radius to match parent's tube radius
    const childRadius = tubeRadius / (Math.PI / 2); // This makes the child's major radius match parent's tube radius
    const childTubeRadius = childRadius / 2; // Maintain 1:2 aspect ratio

    // Create 4 child tori, positioning them at the center of the parent's tube
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      // Position relative to the parent's major radius
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Calculate rotation to face parent's center
      const dirX = -Math.cos(angle);
      const dirY = -Math.sin(angle);
      const rotationAngle = Math.atan2(dirY, dirX);

      childTori.push(
        <group
          key={i}
          position={[position[0] + x, position[1] + y, position[2]]}
          rotation={[Math.PI / 2, Math.PI / 2, rotationAngle]} // Rotate around X and Y, then Z to face center
        >
          <Torus
            position={[0, 0, 0]}
            radius={childRadius}
            tubeRadius={childTubeRadius}
            depth={depth - 1}
            delay={500}
          />
        </group>
      );
    }
  }

  const colorIndex = 4 - depth;
  const color = DEPTH_COLORS[colorIndex] || '#ffffff';

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        position={position}
        scale={scale}
      >
        <torusGeometry args={[radius, tubeRadius, 12, 48]} />
        <meshBasicMaterial
          color={color}
          wireframe={true}
        />
      </mesh>
      {childTori}
    </group>
  );
}

export default function TorusFractal() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 35 }}
        style={{ background: '#000000', aspectRatio: '2' }}
      >
        <ambientLight intensity={0.5} />
        <Torus />
        <OrbitControls enableDamping autoRotate autoRotateSpeed={2.0} />
      </Canvas>
    </div>
  );
}
