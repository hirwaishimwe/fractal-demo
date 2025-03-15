import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Rule 30 cellular automaton - one of Wolfram's elementary cellular automata
function Rule30Visualization() {
  const groupRef = useRef<THREE.Group>(null);
  const [cells, setCells] = useState<THREE.InstancedMesh | null>(null);
  const [currentGen, setCurrentGen] = useState<number[]>([]);
  const [generations, setGenerations] = useState<number[][]>([]);
  const [frame, setFrame] = useState(0);
  
  // Initialize cellular automaton
  useEffect(() => {
    // Grid size
    const width = 240;
    const maxGenerations = 120;
    
    // Generate initial state - just a single cell in the middle
    const initialState = Array(width).fill(0);
    initialState[Math.floor(width / 2)] = 1; // Single live cell in the middle
    
    // Store all generations
    const allGenerations = [initialState];
    
    // Generate subsequent generations
    for (let i = 0; i < maxGenerations - 1; i++) {
      const prevGen = allGenerations[i];
      const nextGen = Array(width).fill(0);
      
      // Apply Rule 30 to generate the next generation
      for (let j = 0; j < width; j++) {
        const left = j === 0 ? 0 : prevGen[j - 1];
        const center = prevGen[j];
        const right = j === width - 1 ? 0 : prevGen[j + 1];
        
        // Rule 30: 111->0, 110->0, 101->0, 100->1, 011->1, 010->1, 001->1, 000->0
        const pattern = (left << 2) | (center << 1) | right;
        nextGen[j] = (pattern === 1 || pattern === 2 || pattern === 3 || pattern === 4) ? 1 : 0;
      }
      
      allGenerations.push(nextGen);
    }
    
    setGenerations(allGenerations);
    setCurrentGen(initialState);
    
    // Create instanced mesh for cells
    const cellGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.2);
    const cellMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.3, 0.8, 1.0),
      transparent: true,
      opacity: 0.8,
    });
    
    // Create instanced mesh
    const totalCells = width * maxGenerations;
    const instancedMesh = new THREE.InstancedMesh(cellGeometry, cellMaterial, totalCells);
    instancedMesh.count = 0; // Start with no visible cells
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    // Add to scene
    if (groupRef.current) {
      groupRef.current.add(instancedMesh);
      setCells(instancedMesh);
    }
  }, []);
  
  // Update cell positions and visibility
  useEffect(() => {
    if (!cells || generations.length === 0) return;
    
    const width = generations[0].length;
    const matrix = new THREE.Matrix4();
    let count = 0;
    
    // Display all generations up to the current frame
    const maxGens = Math.min(frame + 1, generations.length);
    
    // Update cell positions and visibility
    for (let y = 0; y < maxGens; y++) {
      const gen = generations[y];
      
      for (let x = 0; x < width; x++) {
        if (gen[x] === 1) {
          // Calculate position - center the pattern in view
          const posX = x - width / 2;
          const posY = -y + 30; // Start from the top, grow downward
          
          // Set matrix for this instance
          matrix.setPosition(posX * 0.15, posY * 0.15, 0);
          cells.setMatrixAt(count, matrix);
          count++;
        }
      }
    }
    
    cells.count = count;
    cells.instanceMatrix.needsUpdate = true;
  }, [frame, cells, generations]);
  
  // Animate - gradually show more generations
  useFrame(() => {
    if (frame < generations.length - 1) {
      setFrame(prevFrame => prevFrame + 1);
    }
    
    // Rotate pattern for visual effect
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(Date.now() * 0.0005) * 0.1;
    }
  });
  
  return <group ref={groupRef} />;
}

// Create particles that flow around the pattern
function FlowingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  useEffect(() => {
    if (!pointsRef.current) return;
    
    const count = 200;
    const radius = 20;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Initialize particles in a ring pattern
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radiusVariation = radius * (0.8 + Math.random() * 0.4);
      
      positions[i * 3] = Math.cos(angle) * radiusVariation;
      positions[i * 3 + 1] = Math.sin(angle) * radiusVariation;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      
      sizes[i] = Math.random() * 0.5 + 0.1;
    }
    
    pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsRef.current.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }, []);
  
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    
    const time = clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position;
    
    // Update particle positions for flowing effect
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Calculate angle and radius
      let angle = Math.atan2(y, x);
      let radius = Math.sqrt(x * x + y * y);
      
      // Slowly rotate particles around
      angle += 0.002;
      
      // Apply oscillation to radius
      radius += Math.sin(time * 0.5 + i * 0.1) * 0.03;
      
      // Update position
      positions.setX(i, Math.cos(angle) * radius);
      positions.setY(i, Math.sin(angle) * radius);
      positions.setZ(i, positions.getZ(i) + Math.sin(time + i) * 0.002);
    }
    
    positions.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        size={0.2}
        color="#4fc3f7"
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Main component
export default function WolframGameOfLife() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 25], fov: 60 }}
        style={{ background: 'rgb(1, 8, 22)' }} // Very dark blue, like IOHK site
      >
        <Rule30Visualization />
        <FlowingParticles />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          enableZoom={true}
          minDistance={10}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}