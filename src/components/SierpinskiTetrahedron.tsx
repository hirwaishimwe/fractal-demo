import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Define colors for each depth level
const DEPTH_COLORS = [
  '#ff3333', // Red
  '#33ff33', // Green
  '#3333ff', // Blue
  '#ffff33', // Yellow
  '#ff33ff', // Magenta
  '#33ffff', // Cyan
];

interface TetrahedronProps {
  position?: [number, number, number];
  size?: number;
  depth?: number;
  delay?: number;
  color?: string;
  onGenerated?: () => void;
}

function Tetrahedron({ 
  position = [0, 0, 0], 
  size = 5, 
  depth = 4, 
  delay = 0, 
  color, 
  onGenerated 
}: TetrahedronProps) {
  const [show, setShow] = useState(depth > 0 ? false : true);
  const [showChildren, setShowChildren] = useState(false);
  const [scale, setScale] = useState(0.001);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Animation for growth effect and continuous rotation
  useFrame((state) => {
    if (show && scale < 1) {
      setScale(prev => Math.min(prev + 0.05, 1));
    }

    // Add continuous rotation
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.3;
      groupRef.current.rotation.y = t * 0.3;
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

  // Create child tetrahedrons
  const childTetrahedra = [];
  if (depth > 0 && showChildren) {
    const childSize = size / 2;
    const halfSize = size / 2;
    
    // Calculate the positions for the four smaller tetrahedra
    // One at each vertex of the parent tetrahedron
    const vertices = [
      [position[0], position[1] + halfSize, position[2]], // Top
      [position[0] - halfSize, position[1] - halfSize, position[2] - halfSize], // Bottom left
      [position[0] + halfSize, position[1] - halfSize, position[2] - halfSize], // Bottom right
      [position[0], position[1] - halfSize, position[2] + halfSize], // Bottom front
    ];

    // Create the four child tetrahedra
    for (let i = 0; i < 4; i++) {
      childTetrahedra.push(
        <Tetrahedron
          key={i}
          position={vertices[i] as [number, number, number]}
          size={childSize}
          depth={depth - 1}
          delay={300}
          color={DEPTH_COLORS[(5 - depth + i) % DEPTH_COLORS.length]}
        />
      );
    }
  }

  // Use color prop or get from DEPTH_COLORS
  const displayColor = color || DEPTH_COLORS[(5 - depth) % DEPTH_COLORS.length];

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh ref={meshRef}>
        <tetrahedronGeometry args={[size, 0]} />
        <meshBasicMaterial color={displayColor} wireframe={true} />
      </mesh>
      {childTetrahedra}
    </group>
  );
}

export default function SierpinskiTetrahedron() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 45 }}
        style={{ background: '#111111' }}
      >
        <ambientLight intensity={0.5} />
        <Tetrahedron />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}