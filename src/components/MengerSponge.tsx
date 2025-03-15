import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Define colors for each depth level
const DEPTH_COLORS = [
  '#ff5555', // Red
  '#55ff55', // Green
  '#5555ff', // Blue
  '#ffff55', // Yellow
  '#ff55ff', // Magenta
];

interface CubeProps {
  position?: [number, number, number];
  size?: number;
  depth?: number;
  delay?: number;
  onGenerated?: () => void;
}

function Cube({ position = [0, 0, 0], size = 3, depth = 3, delay = 0, onGenerated }: CubeProps) {
  const [show, setShow] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [scale, setScale] = useState(0.001);
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Animation for growth effect and continuous rotation
  useFrame((state) => {
    if (show && scale < 1) {
      setScale(prev => Math.min(prev + 0.05, 1));
    }

    // Add continuous rotation
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.x = t * 0.2;
      groupRef.current.rotation.y = t * 0.3;
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
      const childTimer = setTimeout(() => {
        setShowChildren(true);
        if (onGenerated) onGenerated();
      }, 700);
      return () => clearTimeout(childTimer);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, onGenerated]);

  if (!show) return null;

  // Generate child cubes for next iteration
  const childCubes = [];
  if (depth > 0 && showChildren) {
    const newSize = size / 3;
    const offset = size / 3;

    // Create the 20 smaller cubes that make up the next iteration of the Menger sponge
    // For each face of the cube, create 8 smaller cubes (skipping the center)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip the center cube and the cubes along the center of each face
          const sumOfAbs = Math.abs(x) + Math.abs(y) + Math.abs(z);
          if (sumOfAbs > 1) { // This condition removes the center of each face and the very center
            const newPos: [number, number, number] = [
              position[0] + x * offset,
              position[1] + y * offset,
              position[2] + z * offset
            ];
            
            childCubes.push(
              <Cube
                key={`${x}-${y}-${z}`}
                position={newPos}
                size={newSize}
                depth={depth - 1}
                delay={200}
              />
            );
          }
        }
      }
    }
  }

  const colorIndex = Math.min(4 - depth, DEPTH_COLORS.length - 1);
  const color = DEPTH_COLORS[colorIndex];

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh ref={meshRef}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial color={color} wireframe={true} />
      </mesh>
      {childCubes}
    </group>
  );
}

export default function MengerSponge() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: '#111111' }}
      >
        <ambientLight intensity={0.5} />
        <Cube />
        <OrbitControls enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}