// P5PatternBackground.jsx
import { useEffect, useRef, useMemo } from 'react';
import p5 from 'p5';

const seededRandom = (seed) => {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const createSeededRandomGenerator = (initialSeed) => {
  let currentSeed = initialSeed;
  return () => {
    currentSeed++;
    return seededRandom(currentSeed);
  };
};

const ENTRANCE_DELAY_MS = 400;
const ENTRANCE_DURATION_MS = 800;

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 100, g: 100, b: 200 };
};

const lightenColor = (color, amount) => ({
  r: Math.min(255, color.r + (255 - color.r) * amount),
  g: Math.min(255, color.g + (255 - color.g) * amount),
  b: Math.min(255, color.b + (255 - color.b) * amount)
});

export const PATTERN_TYPES = {
  bokeh: { id: 'bokeh', name: 'Bokeh', icon: '✨' },
  rings: { id: 'rings', name: 'Rings', icon: '◎' },
  mosaic: { id: 'mosaic', name: 'Mosaic', icon: '◆' },
  geometric: { id: 'geometric', name: 'Geometric', icon: '△' },
  confetti: { id: 'confetti', name: 'Confetti', icon: '🎊' },
  starburst: { id: 'starburst', name: 'Starburst', icon: '✴' },
  waves: { id: 'waves', name: 'Waves', icon: '〰' },
  mixed: { id: 'mixed', name: 'Mixed', icon: '🎨' },
};

// Base patterns (excludes 'mixed' itself)
export const BASE_PATTERN_IDS = ['bokeh', 'rings', 'mosaic', 'geometric', 'confetti', 'starburst', 'waves'];

// Better hash function for more even distribution
const hashString = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

// Get a deterministic pattern for a habit based on its ID
export const getPatternForHabit = (habitId) => {
  if (!habitId) return 'bokeh';
  const hash = hashString(habitId);
  return BASE_PATTERN_IDS[hash % BASE_PATTERN_IDS.length];
};

// Get a unique seed offset for a habit (for visual variety even with same pattern type)
export const getHabitSeedOffset = (habitId) => {
  if (!habitId) return 0;
  return hashString(habitId + '_seed') % 10000;
};

const P5PatternBackground = ({ 
  colors = [], 
  seed = 0, 
  patternType = 'bokeh',
  animated = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const prevColorsRef = useRef([]);
  const shapeEntranceTimesRef = useRef(new Map());

  const colorKey = useMemo(() => colors.join(','), [colors]);

  useEffect(() => {
    if (!containerRef.current || colors.length === 0) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animatablePatterns = ['geometric', 'bokeh', 'rings', 'confetti', 'starburst', 'waves'];
    const shouldAnimate = animated && !prefersReducedMotion && animatablePatterns.includes(patternType);

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.ceil(rect.width) || 120;
    const height = Math.ceil(rect.height) || 120;

    // Detect newly added colors
    const prevColors = prevColorsRef.current;
    const newColors = colors.filter(c => !prevColors.includes(c));
    const now = Date.now();
    
    // Mark entrance times for new colors
    newColors.forEach(color => {
      shapeEntranceTimesRef.current.set(color, now);
    });
    
    // Update previous colors reference
    prevColorsRef.current = [...colors];

    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
    }

    const sketch = (p) => {
      const rand = createSeededRandomGenerator(seed);
      const rgbColors = colors.map(hexToRgb);
      let shapes = [];
      const entranceTimes = shapeEntranceTimesRef.current;

      p.setup = () => {
        const canvas = p.createCanvas(width, height);
        canvas.style('display', 'block');
        p.pixelDensity(2);
        
        if (shouldAnimate) {
          p.frameRate(24);
          switch (patternType) {
            case 'bokeh':
              shapes = generateBokehShapes(rand, rgbColors, width, height, colors, entranceTimes, now);
              break;
            case 'rings':
              shapes = generateRingsShapes(rand, rgbColors, width, height, colors, entranceTimes, now);
              break;
            case 'confetti':
              shapes = generateConfettiShapes(rand, rgbColors, width, height, colors, entranceTimes, now);
              break;
            case 'starburst':
              shapes = generateStarburstShapes(rand, rgbColors, width, height, colors, entranceTimes, now);
              break;
            case 'waves':
              shapes = generateWavesShapes(rand, rgbColors, width, height, colors, entranceTimes, now);
              break;
            case 'geometric':
            default:
              shapes = generateGeometricShapes(rand, rgbColors, width, height, colors, entranceTimes, now);
              break;
          }
        } else {
          p.noLoop();
          p.clear();
        }
        
        if (!shouldAnimate) {
          switch (patternType) {
            case 'bokeh':
              drawBokehPattern(p, rand, rgbColors, width, height);
              break;
            case 'rings':
              drawRingsPattern(p, rand, rgbColors, width, height);
              break;
            case 'mosaic':
              drawMosaicPattern(p, rand, rgbColors, width, height);
              break;
            case 'confetti':
              drawConfettiPattern(p, rand, rgbColors, width, height);
              break;
            case 'starburst':
              drawStarburstPattern(p, rand, rgbColors, width, height);
              break;
            case 'waves':
              drawWavesPattern(p, rand, rgbColors, width, height);
              break;
            case 'geometric':
            default:
              drawGeometricPattern(p, rand, rgbColors, width, height);
              break;
          }
        }
      };

      p.draw = () => {
        if (!shouldAnimate || shapes.length === 0) return;
        
        p.clear();
        const time = p.millis() * 0.001;
        const currentTime = Date.now();
        
        shapes.forEach(shape => {
          // Calculate entrance animation progress
          let entranceProgress = 1;
          if (shape.entranceTime) {
            const elapsed = currentTime - shape.entranceTime;
            if (elapsed < ENTRANCE_DELAY_MS) {
              entranceProgress = 0;
            } else {
              const animElapsed = elapsed - ENTRANCE_DELAY_MS;
              entranceProgress = Math.min(1, animElapsed / ENTRANCE_DURATION_MS);
              // Easing: ease-out cubic
              entranceProgress = 1 - Math.pow(1 - entranceProgress, 3);
            }
          }
          
          // Skip if not yet visible
          if (entranceProgress <= 0) return;
          
          // Subtle floating motion
          const offsetX = Math.sin(time * shape.speedX + shape.phaseX) * shape.driftX;
          const offsetY = Math.cos(time * shape.speedY + shape.phaseY) * shape.driftY;
          const scaleOffset = 1 + Math.sin(time * shape.scaleSpeed + shape.scalePhase) * shape.scaleAmount;
          
          // Apply entrance animation: fade + scale up
          const entranceScale = 0.3 + entranceProgress * 0.7;
          const entranceAlpha = entranceProgress;
          
          p.push();
          p.translate(shape.x + offsetX, shape.y + offsetY);
          
          if (shape.rotAmount) {
            const rotationOffset = Math.sin(time * shape.rotSpeed + shape.rotPhase) * shape.rotAmount;
            p.rotate(shape.rotation + rotationOffset);
          }
          
          p.scale(scaleOffset * entranceScale);
          
          // Apply entrance alpha to all shape alphas
          const effectiveAlpha = shape.alpha * entranceAlpha;
          
          switch (shape.type) {
            case 'bokeh': {
              const layers = shape.layers || 5;
              for (let j = layers; j >= 0; j--) {
                const glowColor = lightenColor(shape.color, (layers - j) * 0.1);
                const alpha = effectiveAlpha * (j / layers) * 0.7;
                const currentSize = shape.size * (1 + (layers - j) * 0.12);
                p.noStroke();
                p.fill(glowColor.r, glowColor.g, glowColor.b, alpha);
                p.circle(0, 0, currentSize);
              }
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha * 0.8);
              p.circle(0, 0, shape.size * 0.4);
              break;
            }
            case 'bokeh-sparkle': {
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.noStroke();
              p.circle(0, 0, shape.size);
              break;
            }
            case 'ring-set': {
              p.noFill();
              for (let j = 0; j < shape.ringCount; j++) {
                const ringSize = shape.size * ((j + 1) / shape.ringCount);
                const alpha = effectiveAlpha - (j * 15 * entranceAlpha);
                p.stroke(shape.color.r, shape.color.g, shape.color.b, Math.max(0, alpha));
                p.strokeWeight(shape.strokeWeight);
                p.circle(0, 0, ringSize);
              }
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, 50 * entranceAlpha);
              p.circle(0, 0, shape.size * 0.2);
              break;
            }
            case 'ring': {
              p.noFill();
              p.stroke(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.strokeWeight(shape.strokeWeight);
              p.circle(0, 0, shape.size);
              break;
            }
            case 'circle':
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.circle(0, 0, shape.size);
              break;
            case 'triangle':
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.beginShape();
              for (let j = 0; j < 3; j++) {
                const angle = (j * p.TWO_PI / 3) - p.HALF_PI;
                p.vertex(Math.cos(angle) * shape.size / 2, Math.sin(angle) * shape.size / 2);
              }
              p.endShape(p.CLOSE);
              break;
            case 'rect':
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.rectMode(p.CENTER);
              p.rect(0, 0, shape.size, shape.size * shape.aspectRatio);
              break;
            case 'hexagon':
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.beginShape();
              for (let j = 0; j < 6; j++) {
                const angle = (j * p.TWO_PI / 6) - p.HALF_PI;
                p.vertex(Math.cos(angle) * shape.size / 2, Math.sin(angle) * shape.size / 2);
              }
              p.endShape(p.CLOSE);
              break;
            case 'diamond':
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.beginShape();
              p.vertex(0, -shape.size / 2);
              p.vertex(shape.size * 0.35, 0);
              p.vertex(0, shape.size / 2);
              p.vertex(-shape.size * 0.35, 0);
              p.endShape(p.CLOSE);
              break;
            case 'star':
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.beginShape();
              for (let j = 0; j < 10; j++) {
                const angle = (j * p.TWO_PI / 10) - p.HALF_PI;
                const r = j % 2 === 0 ? shape.size / 2 : shape.size / 4;
                p.vertex(Math.cos(angle) * r, Math.sin(angle) * r);
              }
              p.endShape(p.CLOSE);
              break;
            case 'confetti-piece': {
              p.noStroke();
              p.fill(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              if (shape.shapeVariant === 0) {
                p.rect(-shape.size/2, -shape.size/4, shape.size, shape.size/2);
              } else if (shape.shapeVariant === 1) {
                p.circle(0, 0, shape.size);
              } else {
                p.beginShape();
                p.vertex(0, -shape.size/2);
                p.vertex(shape.size/2, shape.size/2);
                p.vertex(-shape.size/2, shape.size/2);
                p.endShape(p.CLOSE);
              }
              break;
            }
            case 'ray': {
              p.stroke(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.strokeWeight(shape.strokeWeight || 1.5);
              p.line(0, 0, shape.length, 0);
              break;
            }
            case 'wave-line': {
              p.noFill();
              p.stroke(shape.color.r, shape.color.g, shape.color.b, effectiveAlpha);
              p.strokeWeight(shape.strokeWeight || 2);
              p.beginShape();
              const waveTime = time * shape.waveSpeed;
              for (let i = 0; i <= shape.segments; i++) {
                const t = i / shape.segments;
                const wx = t * shape.length - shape.length / 2;
                const wy = Math.sin((t * shape.frequency + waveTime) * Math.PI * 2) * shape.amplitude;
                p.vertex(wx, wy);
              }
              p.endShape();
              break;
            }
          }
          p.pop();
        });
      };
    };

    p5InstanceRef.current = new p5(sketch, containerRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [colorKey, seed, patternType, animated]);

  if (colors.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    />
  );
};

// ============================================================================
// ANIMATED GEOMETRIC - Generate shapes with animation parameters
// Each habit (color) gets its own unique shape type
// ============================================================================
function generateGeometricShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now()) {
  const shapes = [];
  const shapeTypes = ['circle', 'triangle', 'rect', 'hexagon', 'diamond', 'star'];
  const colorShapeMap = colors.map((_, i) => shapeTypes[i % shapeTypes.length]);
  
  // Generate 2-4 shapes per habit to ensure each habit is represented
  const shapesPerHabit = 2 + Math.floor(rand() * 3);
  
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const lightColor = lightenColor(color, 0.5 + rand() * 0.2);
    const type = colorShapeMap[colorIndex];
    
    // Check if this is a new color that should animate in
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    for (let i = 0; i < shapesPerHabit; i++) {
      shapes.push({
        type,
        x: rand() * width,
        y: rand() * height,
        size: 15 + rand() * 35,
        aspectRatio: 0.7 + rand() * 0.6,
        rotation: rand() * Math.PI * 2,
        color: lightColor,
        alpha: 60 + rand() * 80,
        strokeWeight: 1 + rand() * 2,
        speedX: 0.3 + rand() * 0.4,
        speedY: 0.25 + rand() * 0.35,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: 2 + rand() * 4,
        driftY: 2 + rand() * 4,
        rotSpeed: 0.15 + rand() * 0.25,
        rotPhase: rand() * Math.PI * 2,
        rotAmount: 0.05 + rand() * 0.1,
        scaleSpeed: 0.2 + rand() * 0.3,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: 0.02 + rand() * 0.03,
        // Entrance animation timing - stagger each shape slightly
        entranceTime: isNew ? entranceTime + (i * 100) : null,
      });
    }
  }
  
  // Add a few white accent rings
  for (let i = 0; i < 3; i++) {
    shapes.push({
      type: 'ring',
      x: rand() * width,
      y: rand() * height,
      size: 20 + rand() * 30,
      rotation: 0,
      color: { r: 255, g: 255, b: 255 },
      alpha: 50 + rand() * 40,
      strokeWeight: 1 + rand(),
      speedX: 0.2 + rand() * 0.3,
      speedY: 0.2 + rand() * 0.3,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: 3 + rand() * 5,
      driftY: 3 + rand() * 5,
      rotSpeed: 0,
      rotPhase: 0,
      rotAmount: 0,
      scaleSpeed: 0.25 + rand() * 0.2,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: 0.03 + rand() * 0.02,
      entranceTime: null,
    });
  }
  
  return shapes;
}

// ============================================================================
// ANIMATED BOKEH - Generate orb shapes with animation parameters
// ============================================================================
function generateBokehShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now()) {
  const shapes = [];
  
  // Generate orbs per color/habit for better representation
  const orbsPerColor = Math.max(2, Math.floor(8 / colors.length));
  
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    // Large bokeh orbs for this color
    for (let i = 0; i < orbsPerColor; i++) {
      shapes.push({
        type: 'bokeh',
        x: rand() * width,
        y: rand() * height,
        size: 30 + rand() * 45,
        color: color,
        alpha: 120 + rand() * 80,
        layers: 5,
        speedX: 0.15 + rand() * 0.2,
        speedY: 0.12 + rand() * 0.18,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: 3 + rand() * 5,
        driftY: 3 + rand() * 5,
        scaleSpeed: 0.15 + rand() * 0.2,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: 0.04 + rand() * 0.04,
        entranceTime: isNew ? entranceTime + (i * 80) : null,
      });
    }
    
    // Tiny sparkles for this color
    for (let i = 0; i < 2; i++) {
      shapes.push({
        type: 'bokeh-sparkle',
        x: rand() * width,
        y: rand() * height,
        size: 3 + rand() * 5,
        color: color,
        alpha: 120 + rand() * 100,
        speedX: 0.3 + rand() * 0.4,
        speedY: 0.25 + rand() * 0.35,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: 2 + rand() * 4,
        driftY: 2 + rand() * 4,
        scaleSpeed: 0.4 + rand() * 0.4,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: 0.15 + rand() * 0.15,
        entranceTime: isNew ? entranceTime + (orbsPerColor * 80) + (i * 50) : null,
      });
    }
  }
  
  return shapes;
}

// ============================================================================
// ANIMATED RINGS - Generate ring shapes with animation parameters
// ============================================================================
function generateRingsShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now()) {
  const shapes = [];
  
  // Ring sets per color/habit
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const lightColor = lightenColor(color, 0.5);
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    // Main ring set for this color
    shapes.push({
      type: 'ring-set',
      x: rand() * width,
      y: rand() * height,
      size: 50 + rand() * 50,
      ringCount: 3 + Math.floor(rand() * 3),
      color: lightColor,
      alpha: 90 + rand() * 50,
      strokeWeight: 1.5 + rand() * 1.5,
      speedX: 0.1 + rand() * 0.15,
      speedY: 0.08 + rand() * 0.12,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: 2 + rand() * 3,
      driftY: 2 + rand() * 3,
      scaleSpeed: 0.12 + rand() * 0.15,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: 0.06 + rand() * 0.06,
      entranceTime: isNew ? entranceTime : null,
    });
    
    // Additional smaller ring for this color
    shapes.push({
      type: 'ring',
      x: rand() * width,
      y: rand() * height,
      size: 25 + rand() * 30,
      color: lightColor,
      alpha: 60 + rand() * 50,
      strokeWeight: 1 + rand(),
      speedX: 0.15 + rand() * 0.2,
      speedY: 0.12 + rand() * 0.18,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: 3 + rand() * 5,
      driftY: 3 + rand() * 5,
      scaleSpeed: 0.18 + rand() * 0.2,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: 0.08 + rand() * 0.08,
      entranceTime: isNew ? entranceTime + 100 : null,
    });
  }
  
  // White accent rings
  for (let i = 0; i < 2; i++) {
    shapes.push({
      type: 'ring',
      x: rand() * width,
      y: rand() * height,
      size: 20 + rand() * 35,
      color: { r: 255, g: 255, b: 255 },
      alpha: 50 + rand() * 50,
      strokeWeight: 1 + rand(),
      speedX: 0.15 + rand() * 0.2,
      speedY: 0.12 + rand() * 0.18,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: 3 + rand() * 5,
      driftY: 3 + rand() * 5,
      scaleSpeed: 0.18 + rand() * 0.2,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: 0.08 + rand() * 0.08,
      entranceTime: null,
    });
  }
  
  return shapes;
}

// ============================================================================
// ANIMATED CONFETTI - Generate confetti shapes with animation parameters
// ============================================================================
function generateConfettiShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now()) {
  const shapes = [];
  
  // Create confetti pieces for each color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    // Several pieces per color
    for (let i = 0; i < 4; i++) {
      shapes.push({
        type: 'confetti-piece',
        shapeVariant: Math.floor(rand() * 3), // 0=rect, 1=circle, 2=triangle
        x: rand() * width,
        y: rand() * height,
        size: 6 + rand() * 10,
        rotation: rand() * Math.PI * 2,
        color: lightenColor(color, 0.3 + rand() * 0.3),
        alpha: 100 + rand() * 100,
        speedX: 0.5 + rand() * 0.8,
        speedY: 0.4 + rand() * 0.7,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: 3 + rand() * 6,
        driftY: 3 + rand() * 6,
        rotSpeed: 0.3 + rand() * 0.5,
        rotPhase: rand() * Math.PI * 2,
        rotAmount: 0.3 + rand() * 0.4,
        scaleSpeed: 0.3 + rand() * 0.4,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: 0.1 + rand() * 0.15,
        entranceTime: isNew ? entranceTime + (i * 50) : null,
      });
    }
  }
  
  // Extra white sparkles
  for (let i = 0; i < 5; i++) {
    shapes.push({
      type: 'confetti-piece',
      shapeVariant: 1,
      x: rand() * width,
      y: rand() * height,
      size: 3 + rand() * 5,
      rotation: 0,
      color: { r: 255, g: 255, b: 255 },
      alpha: 80 + rand() * 80,
      speedX: 0.6 + rand() * 0.8,
      speedY: 0.5 + rand() * 0.7,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: 2 + rand() * 4,
      driftY: 2 + rand() * 4,
      scaleSpeed: 0.5 + rand() * 0.5,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: 0.2 + rand() * 0.2,
      entranceTime: null,
    });
  }
  
  return shapes;
}

// ============================================================================
// ANIMATED STARBURST - Generate ray shapes radiating from points
// ============================================================================
function generateStarburstShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now()) {
  const shapes = [];
  
  // Create starburst center per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    const cx = 20 + rand() * (width - 40);
    const cy = 20 + rand() * (height - 40);
    const numRays = 6 + Math.floor(rand() * 6);
    const baseAngle = rand() * Math.PI * 2;
    
    // Rays radiating from center
    for (let i = 0; i < numRays; i++) {
      const angle = baseAngle + (i / numRays) * Math.PI * 2;
      shapes.push({
        type: 'ray',
        x: cx,
        y: cy,
        rotation: angle,
        length: 20 + rand() * 35,
        color: lightColor,
        alpha: 60 + rand() * 80,
        strokeWeight: 1 + rand() * 2,
        speedX: 0.1 + rand() * 0.15,
        speedY: 0.1 + rand() * 0.15,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: 1 + rand() * 2,
        driftY: 1 + rand() * 2,
        rotSpeed: 0.05 + rand() * 0.1,
        rotPhase: rand() * Math.PI * 2,
        rotAmount: 0.1 + rand() * 0.15,
        scaleSpeed: 0.15 + rand() * 0.2,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: 0.08 + rand() * 0.1,
        entranceTime: isNew ? entranceTime + (i * 30) : null,
      });
    }
    
    // Center glow
    shapes.push({
      type: 'bokeh',
      x: cx,
      y: cy,
      size: 12 + rand() * 15,
      color: color,
      alpha: 100 + rand() * 80,
      layers: 3,
      speedX: 0.1,
      speedY: 0.1,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: 1,
      driftY: 1,
      scaleSpeed: 0.2 + rand() * 0.2,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: 0.1 + rand() * 0.1,
      entranceTime: isNew ? entranceTime : null,
    });
  }
  
  return shapes;
}

// ============================================================================
// ANIMATED WAVES - Generate flowing wave lines
// ============================================================================
function generateWavesShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now()) {
  const shapes = [];
  
  // Create wave lines per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    // Multiple wave lines per color at different heights
    for (let i = 0; i < 2; i++) {
      shapes.push({
        type: 'wave-line',
        x: width / 2,
        y: height * (0.25 + rand() * 0.5),
        rotation: (rand() - 0.5) * 0.3,
        length: width * 0.9,
        amplitude: 8 + rand() * 15,
        frequency: 1 + rand() * 1.5,
        segments: 20,
        waveSpeed: 0.3 + rand() * 0.4,
        color: lightColor,
        alpha: 60 + rand() * 70,
        strokeWeight: 1.5 + rand() * 2,
        speedX: 0.05 + rand() * 0.1,
        speedY: 0.08 + rand() * 0.12,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: 2 + rand() * 4,
        driftY: 3 + rand() * 5,
        scaleSpeed: 0.1 + rand() * 0.15,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: 0.03 + rand() * 0.05,
        entranceTime: isNew ? entranceTime + (i * 100) : null,
      });
    }
  }
  
  // Accent wave lines
  for (let i = 0; i < 2; i++) {
    shapes.push({
      type: 'wave-line',
      x: width / 2,
      y: height * (0.2 + rand() * 0.6),
      rotation: (rand() - 0.5) * 0.2,
      length: width * 0.7,
      amplitude: 5 + rand() * 10,
      frequency: 1.5 + rand() * 1.5,
      segments: 15,
      waveSpeed: 0.4 + rand() * 0.3,
      color: { r: 255, g: 255, b: 255 },
      alpha: 40 + rand() * 50,
      strokeWeight: 1 + rand(),
      speedX: 0.08 + rand() * 0.1,
      speedY: 0.1 + rand() * 0.15,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: 3 + rand() * 5,
      driftY: 4 + rand() * 6,
      scaleSpeed: 0.12 + rand() * 0.15,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: 0.04 + rand() * 0.05,
      entranceTime: null,
    });
  }
  
  return shapes;
}

// ============================================================================
// BOKEH PATTERN - Soft glowing orbs like out-of-focus lights
// ============================================================================
function drawBokehPattern(p, rand, colors, width, height) {
  const numOrbs = 4 + Math.floor(rand() * 4);

  // Large soft background orbs - using actual habit colors
  for (let i = 0; i < numOrbs; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const x = rand() * width;
    const y = rand() * height;
    const size = 25 + rand() * 40;

    // Draw multiple concentric circles for soft glow effect
    // Outer glow uses slightly lighter color, inner uses actual color
    for (let j = 5; j >= 0; j--) {
      const glowAmount = (5 - j) * 0.12; // Lighter colors
      const glowColor = lightenColor(color, glowAmount);
      const alpha = (15 + rand() * 25) * (j / 5);
      const currentSize = size * (1 + (5 - j) * 0.15);
      p.noStroke();
      p.fill(glowColor.r, glowColor.g, glowColor.b, alpha);
      p.circle(x, y, currentSize);
    }

    // Softer color core
    p.fill(color.r, color.g, color.b, 50 + rand() * 35);
    p.circle(x, y, size * 0.5);
  }

  // Smaller accent orbs - using actual habit colors
  for (let i = 0; i < 3; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const x = rand() * width;
    const y = rand() * height;
    const size = 12 + rand() * 20;

    // Outer glow
    const lightColor = lightenColor(color, 0.4);
    for (let j = 3; j >= 0; j--) {
      const alpha = (25 + rand() * 30) * (j / 3);
      const currentSize = size * (0.6 + j * 0.2);
      p.noStroke();
      p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.circle(x, y, currentSize);
    }

    // Softer habit color center
    p.fill(color.r, color.g, color.b, 70 + rand() * 50);
    p.circle(x, y, size * 0.4);

    // Small subtle highlight
    p.fill(255, 255, 255, 20 + rand() * 20);
    p.circle(x - size * 0.1, y - size * 0.1, size * 0.15);
  }

  // Tiny sparkle dots
  for (let i = 0; i < 4; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const x = rand() * width;
    const y = rand() * height;
    const size = 2 + rand() * 4;
    p.fill(color.r, color.g, color.b, 60 + rand() * 50);
    p.noStroke();
    p.circle(x, y, size);
  }
}

// ============================================================================
// RINGS PATTERN - Concentric circles radiating outward
// ============================================================================
function drawRingsPattern(p, rand, colors, width, height) {
  const numCenters = 2 + Math.floor(rand() * 3);
  
  for (let c = 0; c < numCenters; c++) {
    const color = colors[c % colors.length];
    const lightColor = lightenColor(color, 0.6);
    const cx = rand() * width;
    const cy = rand() * height;
    const numRings = 3 + Math.floor(rand() * 4);
    const maxSize = 60 + rand() * 60;
    
    for (let i = 0; i < numRings; i++) {
      const size = maxSize * ((i + 1) / numRings);
      const alpha = 100 - (i * 20) + rand() * 30;
      const weight = 1.5 + rand() * 2;
      
      p.noFill();
      p.stroke(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.strokeWeight(weight);
      p.circle(cx, cy, size);
    }
    
    // Center glow
    p.noStroke();
    p.fill(lightColor.r, lightColor.g, lightColor.b, 60);
    p.circle(cx, cy, 15 + rand() * 10);
    p.fill(255, 255, 255, 50);
    p.circle(cx, cy, 6 + rand() * 4);
  }
  
  // Scattered smaller ring accents
  for (let i = 0; i < 3; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = 20 + rand() * 30;
    
    p.noFill();
    p.stroke(255, 255, 255, 60 + rand() * 40);
    p.strokeWeight(1 + rand());
    p.circle(x, y, size);
    
    if (rand() > 0.5) {
      p.circle(x, y, size * 0.6);
    }
  }
}

// ============================================================================
// MOSAIC PATTERN - Triangular tiles with decorative shape icons per habit
// ============================================================================
function drawMosaicPattern(p, rand, colors, width, height) {
  const tileSize = 25 + rand() * 15;
  const rows = Math.ceil(height / (tileSize * 0.866)) + 1;
  const cols = Math.ceil(width / tileSize) + 1;
  
  // Draw triangular mosaic base
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const xOffset = (row % 2) * (tileSize / 2);
      const x = col * tileSize + xOffset;
      const y = row * tileSize * 0.866;
      
      // Two triangles per cell (pointing up and down)
      for (let tri = 0; tri < 2; tri++) {
        const colorIndex = Math.floor(rand() * colors.length);
        const color = colors[colorIndex];
        const lightColor = lightenColor(color, 0.4 + rand() * 0.3);
        const alpha = 50 + rand() * 80;
        
        p.noStroke();
        p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
        
        p.beginShape();
        if (tri === 0) {
          // Upward pointing triangle
          p.vertex(x, y + tileSize * 0.866);
          p.vertex(x + tileSize / 2, y);
          p.vertex(x + tileSize, y + tileSize * 0.866);
        } else {
          // Downward pointing triangle
          p.vertex(x + tileSize / 2, y);
          p.vertex(x + tileSize, y + tileSize * 0.866);
          p.vertex(x + tileSize * 1.5, y);
        }
        p.endShape(p.CLOSE);
      }
    }
  }
  
  // Add subtle white edges for stained glass effect
  p.stroke(255, 255, 255, 30);
  p.strokeWeight(0.5);
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const xOffset = (row % 2) * (tileSize / 2);
      const x = col * tileSize + xOffset;
      const y = row * tileSize * 0.866;
      
      p.noFill();
      p.beginShape();
      p.vertex(x, y + tileSize * 0.866);
      p.vertex(x + tileSize / 2, y);
      p.vertex(x + tileSize, y + tileSize * 0.866);
      p.endShape(p.CLOSE);
    }
  }
  
  // Add a few highlight spots
  for (let i = 0; i < 4; i++) {
    const x = rand() * width;
    const y = rand() * height;
    p.noStroke();
    p.fill(255, 255, 255, 40 + rand() * 40);
    p.circle(x, y, 8 + rand() * 12);
  }
}

// ============================================================================
// GEOMETRIC PATTERN - Each habit gets its own unique shape type
// ============================================================================
function drawGeometricPattern(p, rand, colors, width, height) {
  const shapeTypes = ['circle', 'triangle', 'rect', 'hexagon', 'diamond', 'star'];
  const colorShapeMap = colors.map((_, i) => shapeTypes[i % shapeTypes.length]);
  
  // Draw 2-4 shapes per habit to ensure each is represented
  const shapesPerHabit = 2 + Math.floor(rand() * 3);
  
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.55 + rand() * 0.15);
    const shapeType = colorShapeMap[colorIndex];
    
    for (let i = 0; i < shapesPerHabit; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const size = 15 + rand() * 35;
      const rotation = rand() * p.TWO_PI;
      const alpha = 60 + rand() * 80;
      
      p.push();
      p.translate(x, y);
      p.rotate(rotation);
      p.noStroke();
      p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
      
      drawGeometricShape(p, shapeType, size);
      p.pop();
    }
  }
  
  // White accent rings
  for (let i = 0; i < 3; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = 20 + rand() * 35;
    
    p.noFill();
    p.stroke(255, 255, 255, 70 + rand() * 50);
    p.strokeWeight(1 + rand());
    p.circle(x, y, size);
  }
}

// Helper function to draw geometric shapes
function drawGeometricShape(p, shapeType, size) {
  const halfSize = size / 2;
  
  switch (shapeType) {
    case 'circle':
      p.circle(0, 0, size);
      break;
      
    case 'triangle':
      p.beginShape();
      for (let j = 0; j < 3; j++) {
        const angle = (j * p.TWO_PI / 3) - p.HALF_PI;
        p.vertex(Math.cos(angle) * halfSize, Math.sin(angle) * halfSize);
      }
      p.endShape(p.CLOSE);
      break;
      
    case 'rect':
      p.rectMode(p.CENTER);
      p.rect(0, 0, size * 0.8, size * 0.8);
      break;
      
    case 'hexagon':
      p.beginShape();
      for (let j = 0; j < 6; j++) {
        const angle = (j * p.TWO_PI / 6) - p.HALF_PI;
        p.vertex(Math.cos(angle) * halfSize, Math.sin(angle) * halfSize);
      }
      p.endShape(p.CLOSE);
      break;
      
    case 'diamond':
      p.beginShape();
      p.vertex(0, -halfSize);
      p.vertex(halfSize * 0.7, 0);
      p.vertex(0, halfSize);
      p.vertex(-halfSize * 0.7, 0);
      p.endShape(p.CLOSE);
      break;
      
    case 'star':
      p.beginShape();
      for (let j = 0; j < 10; j++) {
        const angle = (j * p.TWO_PI / 10) - p.HALF_PI;
        const r = j % 2 === 0 ? halfSize : halfSize * 0.5;
        p.vertex(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      p.endShape(p.CLOSE);
      break;
      
    default:
      p.circle(0, 0, size);
  }
}

// ============================================================================
// CONFETTI PATTERN - Scattered colorful shapes for a celebratory feel
// ============================================================================
function drawConfettiPattern(p, rand, colors, width, height) {
  // Draw confetti pieces for each color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.3 + rand() * 0.3);
    
    // Several pieces per color
    for (let i = 0; i < 6; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const size = 6 + rand() * 12;
      const rotation = rand() * Math.PI * 2;
      const alpha = 100 + rand() * 100;
      const shapeVariant = Math.floor(rand() * 3);
      
      p.push();
      p.translate(x, y);
      p.rotate(rotation);
      p.noStroke();
      p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
      
      if (shapeVariant === 0) {
        // Rectangle
        p.rect(-size/2, -size/4, size, size/2);
      } else if (shapeVariant === 1) {
        // Circle
        p.circle(0, 0, size);
      } else {
        // Triangle
        p.beginShape();
        p.vertex(0, -size/2);
        p.vertex(size/2, size/2);
        p.vertex(-size/2, size/2);
        p.endShape(p.CLOSE);
      }
      
      p.pop();
    }
  }
  
  // Extra white sparkles
  for (let i = 0; i < 8; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = 3 + rand() * 5;
    p.noStroke();
    p.fill(255, 255, 255, 80 + rand() * 80);
    p.circle(x, y, size);
  }
}

// ============================================================================
// STARBURST PATTERN - Rays radiating from points
// ============================================================================
function drawStarburstPattern(p, rand, colors, width, height) {
  // Create starburst centers per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    
    const cx = 20 + rand() * (width - 40);
    const cy = 20 + rand() * (height - 40);
    const numRays = 6 + Math.floor(rand() * 6);
    const baseAngle = rand() * Math.PI * 2;
    
    // Rays radiating from center
    for (let i = 0; i < numRays; i++) {
      const angle = baseAngle + (i / numRays) * Math.PI * 2;
      const length = 20 + rand() * 35;
      const alpha = 60 + rand() * 80;
      
      p.push();
      p.translate(cx, cy);
      p.rotate(angle);
      p.stroke(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.strokeWeight(1 + rand() * 2);
      p.line(0, 0, length, 0);
      p.pop();
    }
    
    // Center glow
    const glowSize = 12 + rand() * 15;
    for (let j = 3; j >= 0; j--) {
      const glowColor = lightenColor(color, j * 0.1);
      const alpha = (80 + rand() * 60) * (j / 3);
      const currentSize = glowSize * (1 + (3 - j) * 0.2);
      p.noStroke();
      p.fill(glowColor.r, glowColor.g, glowColor.b, alpha);
      p.circle(cx, cy, currentSize);
    }
    p.fill(color.r, color.g, color.b, 100 + rand() * 80);
    p.circle(cx, cy, glowSize * 0.4);
  }
}

// ============================================================================
// WAVES PATTERN - Flowing wave lines
// ============================================================================
function drawWavesPattern(p, rand, colors, width, height) {
  // Draw wave lines per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    
    // Multiple wave lines per color at different heights
    for (let i = 0; i < 2; i++) {
      const baseY = height * (0.25 + rand() * 0.5);
      const amplitude = 8 + rand() * 15;
      const frequency = 1 + rand() * 1.5;
      const segments = 20;
      const alpha = 60 + rand() * 70;
      const rotation = (rand() - 0.5) * 0.3;
      
      p.push();
      p.translate(width / 2, baseY);
      p.rotate(rotation);
      p.noFill();
      p.stroke(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.strokeWeight(1.5 + rand() * 2);
      
      p.beginShape();
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = t * width * 0.9 - width * 0.45;
        const y = Math.sin(t * frequency * Math.PI * 2) * amplitude;
        p.vertex(x, y);
      }
      p.endShape();
      
      p.pop();
    }
  }
  
  // Accent wave lines in white
  for (let i = 0; i < 2; i++) {
    const baseY = height * (0.2 + rand() * 0.6);
    const amplitude = 5 + rand() * 10;
    const frequency = 1.5 + rand() * 1.5;
    const segments = 15;
    const alpha = 40 + rand() * 50;
    const rotation = (rand() - 0.5) * 0.2;
    
    p.push();
    p.translate(width / 2, baseY);
    p.rotate(rotation);
    p.noFill();
    p.stroke(255, 255, 255, alpha);
    p.strokeWeight(1 + rand());
    
    p.beginShape();
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const x = t * width * 0.7 - width * 0.35;
      const y = Math.sin(t * frequency * Math.PI * 2) * amplitude;
      p.vertex(x, y);
    }
    p.endShape();
    
    p.pop();
  }
}

export default P5PatternBackground;
