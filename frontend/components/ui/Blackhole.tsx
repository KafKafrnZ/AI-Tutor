"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Float, Environment } from "@react-three/drei";
import * as THREE from "three";

function BlackholeMesh({ scale = 2.2 }: { scale?: number }) {
  const { scene } = useGLTF("/blackhole.glb");
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= delta * 0.15; 
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.02} floatIntensity={0.1}>
      <primitive object={scene} scale={scale} rotation={[0, 0, 0]} ref={meshRef} />
    </Float>
  );
}

interface BlackholeProps {
  scale?: number;
  cameraPosition?: [number, number, number];
  opacity?: number;
}

export default function BlackholeBackground({ 
  scale = 2.2, 
  cameraPosition = [0, 0.5, 20], 
  opacity = 0.5 
}: BlackholeProps) {
  
  return (
    <div 
      className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ opacity: opacity }}
    >
      <Canvas camera={{ position: cameraPosition, fov: 45 }}>
        <ambientLight intensity={0.3} />
        
        {/* THE FIX: Changed the yellow light (#fcd34d) to pure white (#ffffff) */}
        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={3} color="#ffffff" />
        
        <pointLight position={[-10, -10, -10]} intensity={2} color="#a855f7" />
        
        <BlackholeMesh scale={scale} />
        
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/blackhole.glb");