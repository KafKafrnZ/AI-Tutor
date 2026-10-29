"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Sphere, Line, Html } from "@react-three/drei";
import * as THREE from "three";

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
  reducedMotion: boolean;
};

function childrenOf(rootId: string): GraphNode[] {
  const direct = GRAPH_DATA.links.filter((link) => link.source === rootId).map((link) => link.target);
  const nested = GRAPH_DATA.links.filter((link) => direct.includes(link.source)).map((link) => link.target);
  const ids = new Set([...direct, ...nested]);
  return GRAPH_DATA.nodes.filter((node) => ids.has(node.id));
}

function Node({ data, onClick, hoveredNode, setHoveredNode, reducedMotion }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isHovered = hoveredNode === data.id;

  const color =
    data.type === "root"
      ? "#FAE580"
      : data.type === "topic"
      ? "#00D4FF"
      : "#8B5CF6";

  const scale = data.type === "root" ? 1.5 : data.type === "topic" ? 1 : 0.7;

  useFrame((state) => {
    if (!meshRef.current || reducedMotion) return;
    meshRef.current.rotation.y += 0.01;
    meshRef.current.rotation.x += 0.005;
    meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + data.position[0]) * 0.002;
  });

  return (
    <group position={data.position as [number, number, number]}>
      <Sphere
        ref={meshRef}
        args={[0.4 * scale, 32, 32]}
        onClick={(event) => {
          event.stopPropagation();
          onClick(data);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredNode(data.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHoveredNode(null);
          document.body.style.cursor = "auto";
        }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.9 : 0.28}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {isHovered && (
        <Html distanceFactor={15} center>
          <div className="pointer-events-none -translate-y-6 whitespace-nowrap rounded-lg border border-accent-elden/30 bg-black/70 px-3 py-1.5 text-sm text-white shadow-[0_0_15px_rgba(250,204,21,0.28)] backdrop-blur-md">
            <span className="font-bold">{data.label}</span>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-accent-elden">Site of grace · open chamber</p>
          </div>
        </Html>
      )}

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
          color="#FAE580"
          opacity={0.22}
          transparent
          lineWidth={1}
        />
      ))}
    </>
  );
}

function ParticleSystem({ count }: { count: number }) {
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (((i * 37) % 101) / 100 - 0.5) * 20;
      p[i * 3 + 1] = (((i * 53) % 103) / 102 - 0.5) * 20;
      p[i * 3 + 2] = (((i * 71) % 107) / 106 - 0.5) * 20;
    }
    return p;
  }, [count]);

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
      <pointsMaterial size={0.05} color="#FAE580" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

export default function ThreeDExplorer() {
  const router = useRouter();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const checkFallback = () => {
      const isMobile = window.innerWidth < 768;
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setReducedMotion(isReduced);
      setIsFallback(isMobile || isReduced);
    };
    checkFallback();
    window.addEventListener("resize", checkFallback);
    return () => window.removeEventListener("resize", checkFallback);
  }, []);

  const handleNodeClick = (node: GraphNode) => {
    router.push(`/tutor?q=${encodeURIComponent(`Explain ${node.label} for government exams`)}`);
  };

  if (isFallback) {
    return (
      <div className="relative h-full w-full overflow-y-auto rounded-3xl border border-accent-elden/20 bg-black/40 p-6 shadow-2xl backdrop-blur-sm">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-white drop-shadow-md">Sites of Grace</h2>
        <p className="mb-6 text-xs text-zinc-400">Readable map mode. Choose a node to open the chamber.</p>

        <div className="flex flex-col gap-6">
          {GRAPH_DATA.nodes.filter((node) => node.type === "root").map((rootNode) => (
            <div key={rootNode.id} className="rounded-2xl border border-accent-elden/20 bg-zinc-900/50 p-5 shadow-lg">
              <button
                type="button"
                onClick={() => handleNodeClick(rootNode)}
                className="mb-4 text-left text-lg font-bold text-accent-elden hover:underline"
              >
                {rootNode.label}
              </button>
              <div className="flex flex-wrap gap-2">
                {childrenOf(rootNode.id).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleNodeClick(node)}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
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
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-accent-elden/20 bg-black/40 shadow-2xl backdrop-blur-sm">
      <div className="pointer-events-none absolute left-6 top-4 z-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white drop-shadow-md">Sites of Grace</h2>
        <p className="mt-1 text-xs text-zinc-400">Drag to orbit · click a node to open the chamber</p>
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <color attach="background" args={["#050810"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#FAE580" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00D4FF" />

        <Edges />

        {GRAPH_DATA.nodes.map((node) => (
          <Node
            key={node.id}
            data={node}
            onClick={handleNodeClick}
            hoveredNode={hoveredNode}
            setHoveredNode={setHoveredNode}
            reducedMotion={reducedMotion}
          />
        ))}

        <ParticleSystem count={reducedMotion ? 60 : 180} />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={3}
          maxDistance={15}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.45}
        />
      </Canvas>
    </div>
  );
}
