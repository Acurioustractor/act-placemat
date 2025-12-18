'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { TimelineEntry, ConstellationNode } from '../types/yearInReview';

interface ConstellationCanvasProps {
  entries: TimelineEntry[];
  activeSeasonIndex: number;
  onNodeClick?: (entry: TimelineEntry) => void;
}

// Farm-inspired seasonal color palettes (earth tones)
const SEASON_PALETTES = {
  planting: {
    primary: '#5B8C5A',    // Fresh green
    secondary: '#8B7355',  // Soil brown
    accent: '#A8D5A2',     // Sprout green
    sky: '#87CEEB',        // Morning sky
    particles: ['#5B8C5A', '#8B7355', '#A8D5A2', '#DEB887'],
  },
  growing: {
    primary: '#D4A574',    // Golden wheat
    secondary: '#228B22',  // Lush green
    accent: '#FFD700',     // Sunlight gold
    sky: '#87CEEB',        // Clear blue
    particles: ['#FFD700', '#FFEC8B', '#FFA500', '#90EE90'],
  },
  harvesting: {
    primary: '#CD853F',    // Copper harvest
    secondary: '#8B4513',  // Rich brown
    accent: '#DAA520',     // Golden rod
    sky: '#F4A460',        // Warm sunset
    particles: ['#CD853F', '#DAA520', '#8B4513', '#D2691E', '#B8860B'],
  },
  resting: {
    primary: '#708090',    // Slate frost
    secondary: '#B0C4DE',  // Light steel
    accent: '#E6E6FA',     // Lavender frost
    sky: '#B0C4DE',        // Winter sky
    particles: ['#FFFFFF', '#E6E6FA', '#B0C4DE', '#F0F8FF'],
  },
};

const SEASONS = ['planting', 'growing', 'harvesting', 'resting'] as const;

// Organic element types for each season
interface OrganicElement {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
  type: string;
  color: string;
  layer: number;
  wobblePhase: number;
}

// Configuration
const CONFIG = {
  elementCount: {
    mobile: 20,
    tablet: 35,
    desktop: 50,
  },
  layers: 3,
  layerSpeed: [0.15, 0.3, 0.5],
  driftSpeed: 0.0003,
  wobbleAmount: 0.3,
  mouseRadius: 150,
  mouseStrength: 0.02,
};

// Draw functions for organic elements
const drawSeed = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  // Seed body (teardrop shape)
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.6, -size * 0.5, size * 0.6, size * 0.5, 0, size);
  ctx.bezierCurveTo(-size * 0.6, size * 0.5, -size * 0.6, -size * 0.5, 0, -size);
  ctx.fillStyle = color;
  ctx.fill();

  // Seed highlight
  ctx.beginPath();
  ctx.ellipse(-size * 0.15, -size * 0.3, size * 0.15, size * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
  ctx.fill();

  ctx.restore();
};

const drawDandelionWisp = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  // Center
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Wispy strands
  const strands = 8;
  for (let i = 0; i < strands; i++) {
    const angle = (i / strands) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const endX = Math.cos(angle) * size;
    const endY = Math.sin(angle) * size;
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Tiny fluff at end
    ctx.beginPath();
    ctx.arc(endX, endY, size * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
    ctx.fill();
  }

  ctx.restore();
};

const drawFirefly = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, _rotation: number, _color: string, opacity: number, time: number) => {
  // Pulsing glow effect
  const pulse = Math.sin(time * 0.08) * 0.5 + 0.5;
  const glowOpacity = opacity * (0.3 + pulse * 0.7);

  // Outer glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
  gradient.addColorStop(0, `rgba(255, 255, 150, ${glowOpacity})`);
  gradient.addColorStop(0.3, `rgba(255, 220, 100, ${glowOpacity * 0.5})`);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);

  // Core
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 200, ${opacity})`;
  ctx.fill();
};

const drawLeaf = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  // Leaf shape
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.8, -size * 0.3, size * 0.8, size * 0.3, 0, size);
  ctx.bezierCurveTo(-size * 0.8, size * 0.3, -size * 0.8, -size * 0.3, 0, -size);
  ctx.fillStyle = color;
  ctx.fill();

  // Leaf vein
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.8);
  ctx.lineTo(0, size * 0.8);
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
};

const drawWheatParticle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  // Wheat grain shape
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.3, size, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Tiny whisker
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.1, -size * 1.3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
};

const drawSnowflake = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, _color: string, opacity: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  // Six-pointed snowflake
  const arms = 6;
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.lineWidth = 1;

  for (let i = 0; i < arms; i++) {
    const angle = (i / arms) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const endX = Math.cos(angle) * size;
    const endY = Math.sin(angle) * size;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Small branches
    const branchLen = size * 0.3;
    const midX = Math.cos(angle) * size * 0.6;
    const midY = Math.sin(angle) * size * 0.6;

    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX + Math.cos(angle + 0.5) * branchLen, midY + Math.sin(angle + 0.5) * branchLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX + Math.cos(angle - 0.5) * branchLen, midY + Math.sin(angle - 0.5) * branchLen);
    ctx.stroke();
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.fill();

  ctx.restore();
};

const drawPollenMote = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, _rotation: number, color: string, opacity: number) => {
  // Simple glowing dot
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, `${color}`);
  gradient.addColorStop(0.5, `rgba(255, 255, 200, ${opacity * 0.5})`);
  gradient.addColorStop(1, 'transparent');

  ctx.globalAlpha = opacity;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
};

// Element types per season
const SEASON_ELEMENTS = {
  planting: ['seed', 'dandelion', 'seed', 'pollen'],
  growing: ['firefly', 'pollen', 'firefly', 'pollen'],
  harvesting: ['leaf', 'wheat', 'leaf', 'wheat', 'leaf'],
  resting: ['snowflake', 'snowflake', 'pollen'],
};

export function ConstellationCanvas({ entries, activeSeasonIndex, onNodeClick }: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const scrollRef = useRef(0);
  const nodesRef = useRef<ConstellationNode[]>([]);
  const elementsRef = useRef<OrganicElement[]>([]);
  const timeRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const getElementCount = useCallback(() => {
    if (typeof window === 'undefined') return CONFIG.elementCount.desktop;
    if (window.innerWidth < 640) return CONFIG.elementCount.mobile;
    if (window.innerWidth < 1024) return CONFIG.elementCount.tablet;
    return CONFIG.elementCount.desktop;
  }, []);

  // Initialize nodes from entries
  const initializeNodes = useCallback(() => {
    const nodes: ConstellationNode[] = entries.map((entry, index) => {
      const hash = entry.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seasonMonth = new Date(entry.date).getMonth();
      const seasonIndex = Math.floor(seasonMonth / 3);

      const baseX = 0.1 + seasonIndex * 0.2 + (hash % 100) / 400;
      const baseY = 0.15 + (hash % 200) / 300 + Math.sin(index * 0.7) * 0.2;

      return {
        id: entry.id,
        x: Math.min(0.95, Math.max(0.05, baseX)),
        y: Math.min(0.9, Math.max(0.1, baseY)),
        seasonIndex,
        entry,
        connections: [],
      };
    });

    nodes.forEach((node, i) => {
      nodes.slice(i + 1).forEach((other) => {
        const sharedTags = node.entry.tags.filter((t) => other.entry.tags.includes(t));
        const sameSource = node.entry.source === other.entry.source;
        const sameSeason = node.seasonIndex === other.seasonIndex;

        if (sharedTags.length > 0 || (sameSource && sameSeason)) {
          node.connections.push(other.id);
          other.connections.push(node.id);
        }
      });
    });

    nodesRef.current = nodes;
  }, [entries]);

  // Initialize organic elements based on active season
  const initializeElements = useCallback((seasonIndex: number) => {
    const count = getElementCount();
    const season = SEASONS[seasonIndex];
    const palette = SEASON_PALETTES[season];
    const elementTypes = SEASON_ELEMENTS[season];
    const elements: OrganicElement[] = [];

    for (let i = 0; i < count; i++) {
      const layer = Math.floor(Math.random() * CONFIG.layers);
      const type = elementTypes[Math.floor(Math.random() * elementTypes.length)];
      const color = palette.particles[Math.floor(Math.random() * palette.particles.length)];

      // Different drift patterns based on season
      let vx = (Math.random() - 0.5) * CONFIG.driftSpeed;
      let vy = CONFIG.driftSpeed * (0.5 + Math.random() * 0.5);

      if (season === 'resting') {
        // Snowflakes drift down slowly with slight horizontal wobble
        vy = CONFIG.driftSpeed * 0.8;
        vx = (Math.random() - 0.5) * CONFIG.driftSpeed * 2;
      } else if (season === 'harvesting') {
        // Leaves tumble and fall
        vy = CONFIG.driftSpeed * 1.2;
        vx = (Math.random() - 0.5) * CONFIG.driftSpeed * 3;
      } else if (season === 'growing') {
        // Fireflies and pollen float gently upward
        vy = -CONFIG.driftSpeed * 0.3;
        vx = (Math.random() - 0.5) * CONFIG.driftSpeed * 2;
      } else {
        // Spring - seeds drift on the breeze
        vx = CONFIG.driftSpeed * 0.5;
        vy = (Math.random() - 0.5) * CONFIG.driftSpeed;
      }

      elements.push({
        x: Math.random(),
        y: Math.random(),
        vx,
        vy,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        size: (Math.random() * 8 + 4) * (1 + layer * 0.3),
        opacity: 0.3 + Math.random() * 0.4,
        type,
        color,
        layer,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }

    elementsRef.current = elements;
  }, [getElementCount]);

  // Re-initialize elements when season changes
  useEffect(() => {
    initializeElements(activeSeasonIndex);
  }, [activeSeasonIndex, initializeElements]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
        setIsMobile(window.innerWidth < 768);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mouse/touch
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (canvasRef.current && e.touches.length > 0) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeNodes();
    initializeElements(activeSeasonIndex);
  }, [initializeNodes, initializeElements, entries, activeSeasonIndex]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      timeRef.current += 1;
      const { width, height } = dimensions;
      const season = SEASONS[activeSeasonIndex];
      const palette = SEASON_PALETTES[season];

      ctx.clearRect(0, 0, width, height);

      // Draw subtle gradient overlay based on season
      const bgGradient = ctx.createRadialGradient(
        width * 0.5, height * 0.3, 0,
        width * 0.5, height * 0.3, height
      );
      bgGradient.addColorStop(0, `${palette.primary}08`);
      bgGradient.addColorStop(0.5, `${palette.secondary}05`);
      bgGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw and update organic elements
      elementsRef.current.forEach((element) => {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const px = element.x * width;
        const py = element.y * height;
        const dx = mx - px;
        const dy = my - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Gentle mouse repulsion (elements drift away from cursor)
        if (dist < CONFIG.mouseRadius && dist > 0) {
          const force = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseStrength;
          element.vx -= (dx / dist) * force * 0.005;
          element.vy -= (dy / dist) * force * 0.005;
        }

        // Wobble effect
        const wobble = Math.sin(timeRef.current * 0.02 + element.wobblePhase) * CONFIG.wobbleAmount;

        // Parallax based on scroll and layer
        const parallaxOffset = (scrollRef.current * CONFIG.layerSpeed[element.layer]) / height;

        // Update position
        element.x += element.vx + wobble * 0.001;
        element.y += element.vy;
        element.rotation += element.rotationSpeed;

        // Wrap around edges
        if (element.x < -0.1) element.x = 1.1;
        if (element.x > 1.1) element.x = -0.1;
        if (element.y < -0.1) element.y = 1.1;
        if (element.y > 1.1) element.y = -0.1;

        // Damping
        element.vx *= 0.995;
        element.vy *= 0.995;

        // Calculate final position with parallax
        const finalX = element.x * width;
        const finalY = ((element.y - parallaxOffset * 0.1) % 1) * height;

        // Layer-based opacity (farther = more transparent)
        const layerOpacity = element.opacity * (0.5 + (2 - element.layer) * 0.25);

        // Draw based on type
        switch (element.type) {
          case 'seed':
            drawSeed(ctx, finalX, finalY, element.size, element.rotation, element.color, layerOpacity);
            break;
          case 'dandelion':
            drawDandelionWisp(ctx, finalX, finalY, element.size, element.rotation, element.color, layerOpacity);
            break;
          case 'firefly':
            drawFirefly(ctx, finalX, finalY, element.size, element.rotation, element.color, layerOpacity, timeRef.current + element.wobblePhase * 100);
            break;
          case 'leaf':
            drawLeaf(ctx, finalX, finalY, element.size, element.rotation, element.color, layerOpacity);
            break;
          case 'wheat':
            drawWheatParticle(ctx, finalX, finalY, element.size, element.rotation, element.color, layerOpacity);
            break;
          case 'snowflake':
            drawSnowflake(ctx, finalX, finalY, element.size, element.rotation, element.color, layerOpacity);
            break;
          case 'pollen':
            drawPollenMote(ctx, finalX, finalY, element.size, element.rotation, element.color, layerOpacity);
            break;
        }
      });

      // Draw connections between story nodes (subtle, organic lines)
      const nodeMap = new Map(nodesRef.current.map((n) => [n.id, n]));
      nodesRef.current.forEach((node) => {
        node.connections.forEach((connId) => {
          const other = nodeMap.get(connId);
          if (!other || node.id > other.id) return;

          const x1 = node.x * width;
          const y1 = node.y * height;
          const x2 = other.x * width;
          const y2 = other.y * height;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const opacity = (1 - dist / 150) * 0.08;
            const isActive = node.seasonIndex === activeSeasonIndex || other.seasonIndex === activeSeasonIndex;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            // Slightly curved organic line
            const midX = (x1 + x2) / 2 + Math.sin(timeRef.current * 0.01) * 5;
            const midY = (y1 + y2) / 2;
            ctx.quadraticCurveTo(midX, midY, x2, y2);
            ctx.strokeStyle = isActive ? `${palette.primary}${Math.floor(opacity * 3 * 255).toString(16).padStart(2, '0')}` : `${palette.secondary}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = isActive ? 1 : 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw story nodes as organic dots
      nodesRef.current.forEach((node) => {
        const x = node.x * width;
        const y = node.y * height;
        const isActiveSeason = node.seasonIndex === activeSeasonIndex;

        // Gentle pulse
        const pulse = Math.sin(timeRef.current * 0.002 + node.x * 10) * 0.15 + 0.85;
        const size = 3 * (isActiveSeason ? 1.3 : 0.8) * pulse;

        // Soft glow for active season
        if (isActiveSeason) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
          glow.addColorStop(0, `${palette.accent}40`);
          glow.addColorStop(0.5, `${palette.accent}15`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fillRect(x - 12, y - 12, 24, 24);
        }

        // Node dot
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = isActiveSeason ? `${palette.primary}dd` : `${palette.secondary}60`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, activeSeasonIndex, isMobile]);

  // Handle click on nodes
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onNodeClick || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clickedNode = nodesRef.current.find((node) => {
        const nx = node.x * dimensions.width;
        const ny = node.y * dimensions.height;
        const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
        return dist < 15;
      });

      if (clickedNode) {
        onNodeClick(clickedNode.entry);
      }
    },
    [dimensions, onNodeClick]
  );

  const season = SEASONS[activeSeasonIndex];
  const palette = SEASON_PALETTES[season];

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Soft ambient highlights */}
      <div className="hidden md:block absolute inset-x-0 top-0 h-[32vh] pointer-events-none">
        <div
          className="absolute inset-0 blur-[90px]"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${palette.sky}20, transparent 70%)`,
            opacity: 0.85,
            transition: 'background 1.2s ease',
          }}
        />
      </div>
      <div className="hidden md:block absolute inset-x-0 bottom-0 h-[22vh] pointer-events-none">
        <div
          className="absolute inset-0 blur-[80px]"
          style={{
            background: `radial-gradient(circle at 50% 100%, ${palette.secondary}12, transparent 78%)`,
            opacity: 0.6,
            transition: 'background 1.2s ease',
          }}
        />
      </div>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        className="w-full h-full pointer-events-auto"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
