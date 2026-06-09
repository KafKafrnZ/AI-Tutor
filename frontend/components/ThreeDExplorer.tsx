"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Sphere, Line, Html } from "@react-three/drei";
import * as THREE from "three";

// Mock data for the knowledge graph
const GRAPH_DATA = {
  nodes: [
    { id: "1", label: "Polity", type: "root", position: [0, 0, 0] },
    { id: "2", label: "Fundamental Rights", type: "topic", position: [-3, 2, -2] },
    { id: "3", label: "Parliament", type: "topic", position: [3, 1, -1] },
    { id: "4", label: "Economy", type: "root", position: [0, -4, 0] },
    { id: "5", label: "Inflation", type: "topic", position: [-2, -6, 2] },
    { id: "6", label: "Monetary Policy", type: "topic", position: [2, -5, 3] },
    { id: "7", label: "RBI", type: "subtopic", position: [4, -6, 4] },
  ],
  links: [
    { source: "1", target: "2" },
    { source: "1", target: "3" },
    { source: "4", target: "5" },
    { source: "4", target: "6" },
    { source: "6", target: "7" },
  ],
};

type GraphNode = (typeof GRAPH_DATA.nodes)[number];

type GraphLine = {
  id: string;
  points: THREE.Vector3[];
};

type NodeProps = {
  data: GraphNode;
  onClick: (node: GraphNode) => void;
  hoveredNode: string | null;
  setHoveredNode: (nodeId: string | null) => void;
};

function Node({ data, onClick, hoveredNode, setHoveredNode }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isHovered = hoveredNode === data.id;

  const color =
    data.type === "root"
      ? "#8B5CF6" // ascend-accent
      : data.type === "topic"
      ? "#00D4FF" // ascend-primary
      : "#14B8A6"; // teal

  const scale = data.type === "root" ? 1.5 : data.type === "topic" ? 1 : 0.7;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
      
      // Floating animation
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + data.position[0]) * 0.002;
    }
  });

  return (
    <group position={data.position as [number, number, number]}>
      <Sphere
        ref={meshRef}
        args={[0.4 * scale, 32, 32]}
        onClick={() => onClick(data)}
        onPointerOver={() => setHoveredNode(data.id)}
        onPointerOut={() => setHoveredNode(null)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.8 : 0.2}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {isHovered && (
        <Html distanceFactor={15} center>
          <div className="bg-black/60 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 shadow-[0_0_15px_rgba(0,212,255,0.3)] whitespace-nowrap pointer-events-none transform -translate-y-6">
            <span className="font-bold">{data.label}</span>
            <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-widest">{data.type}</p>
          </div>
        </Html>
      )}

      {/* Persistent subtle label for root nodes */}
      {data.type === "root" && !isHovered && (
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {data.label}
        </Text>
      )}
    </group>
  );
}

function Edges() {
  const lines = useMemo(() => {
    return GRAPH_DATA.links.map((link) => {
      const sourceNode = GRAPH_DATA.nodes.find((n) => n.id === link.source);
      const targetNode = GRAPH_DATA.nodes.find((n) => n.id === link.target);
      if (sourceNode && targetNode) {
        return {
          id: `${link.source}-${link.target}`,
          points: [
            new THREE.Vector3(...sourceNode.position),
            new THREE.Vector3(...targetNode.position),
          ],
        };
      }
      return null;
    }).filter((line): line is GraphLine => line !== null);
  }, []);

  return (
    <>
      {lines.map((line) => (
        <Line
          key={line.id}
          points={line.points}
          color="#ffffff"
          opacity={0.15}
          transparent
          lineWidth={1}
        />
      ))}
    </>
  );
}

function ParticleSystem() {
  const count = 300;
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (((i * 37) % 101) / 100 - 0.5) * 20;
      p[i * 3 + 1] = (((i * 53) % 103) / 102 - 0.5) * 20;
      p[i * 3 + 2] = (((i * 71) % 107) / 106 - 0.5) * 20;
    }
    return p;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#8B5CF6" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

export default function ThreeDExplorer() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const checkFallback = () => {
      const isMobile = window.innerWidth < 768;
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsFallback(isMobile || isReduced);
    };
    checkFallback();
    window.addEventListener("resize", checkFallback);
    return () => window.removeEventListener("resize", checkFallback);
  }, []);

  const handleNodeClick = (node: GraphNode) => {
    console.log("Selected node:", node);
    // Future: dispatch to Zustand store
  };

  if (isFallback) {
    return (
      <div className="w-full h-full relative rounded-3xl overflow-hidden bg-black/40 border border-white/5 backdrop-blur-sm shadow-2xl p-6 overflow-y-auto">
        <h2 className="text-white font-bold tracking-widest uppercase text-sm drop-shadow-md mb-2">Knowledge Graph</h2>
        <p className="text-zinc-400 text-xs mb-6">2D Fallback Mode (Mobile / Reduced Motion)</p>
        
        <div className="flex flex-col gap-6">
          {GRAPH_DATA.nodes.filter(n => n.type === 'root').map(rootNode => (
            <div key={rootNode.id} className="p-5 bg-zinc-900/50 border border-white/10 rounded-2xl shadow-lg">
              <h3 className="text-violet-400 font-bold mb-4 text-lg">{rootNode.label}</h3>
              <div className="flex flex-wrap gap-2">
                {GRAPH_DATA.nodes.filter(n => n.type !== 'root').map(node => (
                  <button 
                    key={node.id} 
                    onClick={() => handleNodeClick(node)}
                    className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-semibold rounded-full border border-cyan-500/20 transition-colors"
                  >
                    {node.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden bg-black/40 border border-white/5 backdrop-blur-sm shadow-2xl">
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h2 className="text-white font-bold tracking-widest uppercase text-sm drop-shadow-md">Knowledge Graph</h2>
        <p className="text-zinc-400 text-xs mt-1">Interactive Study Universe</p>
      </div>
      
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <color attach="background" args={["#050810"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00D4FF" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
        
        <Edges />
        
        {GRAPH_DATA.nodes.map((node) => (
          <Node
            key={node.id}
            data={node}
            onClick={handleNodeClick}
            hoveredNode={hoveredNode}
            setHoveredNode={setHoveredNode}
          />
        ))}

        <ParticleSystem />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={15}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
