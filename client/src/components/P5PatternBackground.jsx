// P5PatternBackground.jsx
import { useEffect, useRef, useMemo } from 'react';
import p5 from 'p5';

// Prevent p5 friendly-error symbol scanning in dev, which can throw
// false-positive runtime errors ("reading 'pixels'") in module-bundled apps.
p5.disableFriendlyErrors = true;

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
const ACTIVE_FPS = 24;
const IDLE_FPS = 12;
const BACKGROUND_FPS = 8;
const ACTIVE_WINDOW_MS = 4000;

let interactionTrackingInitialized = false;
let lastInteractionAt = Date.now();

const markInteraction = () => {
  lastInteractionAt = Date.now();
};

const ensureInteractionTracking = () => {
  if (interactionTrackingInitialized || typeof window === 'undefined') return;

  const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel', 'scroll'];
  events.forEach((eventName) => {
    window.addEventListener(eventName, markInteraction, { passive: true });
  });
  interactionTrackingInitialized = true;
};

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
export const PATTERN_VARIANTS = {
  bokeh: ['mist', 'cluster', 'glow', 'drift'],
  rings: ['halo', 'orbit', 'ripple', 'bullseye'],
  mosaic: ['triangles', 'diamonds', 'shards', 'steps'],
  geometric: ['facets', 'lattice', 'hexes', 'totems'],
  confetti: ['sprinkles', 'capsules', 'cutouts', 'streamers'],
  starburst: ['burst', 'pinwheel', 'compass', 'firework'],
  waves: ['contour', 'interference', 'current', 'arcs'],
};

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

export const getPatternIdentityForHabit = (habitId) => {
  const family = getPatternForHabit(habitId);
  const variants = PATTERN_VARIANTS[family] || ['default'];
  const variantHash = hashString(`${habitId}_variant`);

  return {
    family,
    variant: variants[variantHash % variants.length],
  };
};

// Get a unique seed offset for a habit (for visual variety even with same pattern type)
export const getHabitSeedOffset = (habitId) => {
  if (!habitId) return 0;
  return hashString(habitId + '_seed') % 10000;
};

export const getPatternIntensityForDay = (completedCount, totalHabits) => {
  if (completedCount <= 0 || totalHabits <= 0) return 1;

  const completionRatio = completedCount / totalHabits;

  if (completedCount >= 4 || completionRatio >= 0.85) return 3;
  if (completedCount >= 2 || completionRatio >= 0.45) return 2;
  return 1;
};

export const getCrowdedPatternVariant = (family, variant, collisionIndex = 0, familyCount = 1) => {
  const variants = PATTERN_VARIANTS[family] || [variant];

  if (familyCount < 3 || collisionIndex <= 0 || variants.length <= 1) {
    return variant;
  }

  const baseIndex = Math.max(0, variants.indexOf(variant));
  return variants[(baseIndex + collisionIndex) % variants.length];
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ANIMATABLE_PATTERN_IDS = ['geometric', 'bokeh', 'rings', 'confetti', 'starburst'];
const getNumberSetting = (config, key, fallback) => {
  const value = config?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};
const getTransformSettings = (config = {}) => ({
  translateX: getNumberSetting(config, 'translateX', 0),
  translateY: getNumberSetting(config, 'translateY', 0),
  translateZ: getNumberSetting(config, 'translateZ', 0),
  rotationDeg: getNumberSetting(config, 'rotationDeg', 0),
});

const generateAnimatedShapesForPatternType = (patternType, rand, rgbColors, width, height, hexColors, entranceTimes, now, config) => {
  let generatedShapes = [];
  switch (patternType) {
    case 'bokeh':
      generatedShapes = generateBokehShapes(rand, rgbColors, width, height, hexColors, entranceTimes, now, config);
      break;
    case 'rings':
      generatedShapes = generateRingsShapes(rand, rgbColors, width, height, hexColors, entranceTimes, now, config);
      break;
    case 'confetti':
      generatedShapes = generateConfettiShapes(rand, rgbColors, width, height, hexColors, entranceTimes, now, config);
      break;
    case 'starburst':
      generatedShapes = generateStarburstShapes(rand, rgbColors, width, height, hexColors, entranceTimes, now, config);
      break;
    case 'waves':
      generatedShapes = generateWavesShapes(rand, rgbColors, width, height, hexColors, entranceTimes, now, config);
      break;
    case 'geometric':
    default:
      generatedShapes = generateGeometricShapes(rand, rgbColors, width, height, hexColors, entranceTimes, now, config);
      break;
  }
  const transform = getTransformSettings(config);
  return generatedShapes.map((shape) => ({ ...shape, ...transform }));
};

const drawStaticPatternType = (patternType, p, rand, rgbColors, width, height, config) => {
  const transform = getTransformSettings(config);
  const zScale = 1 + clamp(transform.translateZ, -90, 300) * 0.01;
  const rotation = (transform.rotationDeg * Math.PI) / 180;

  p.push();
  p.translate(width / 2 + transform.translateX, height / 2 + transform.translateY);
  if (rotation) p.rotate(rotation);
  if (zScale !== 1) p.scale(zScale);
  p.translate(-width / 2, -height / 2);

  switch (patternType) {
    case 'bokeh':
      drawBokehPattern(p, rand, rgbColors, width, height, config);
      break;
    case 'rings':
      drawRingsPattern(p, rand, rgbColors, width, height, config);
      break;
    case 'mosaic':
      drawMosaicPattern(p, rand, rgbColors, width, height, config);
      break;
    case 'confetti':
      drawConfettiPattern(p, rand, rgbColors, width, height, config);
      break;
    case 'starburst':
      drawStarburstPattern(p, rand, rgbColors, width, height, config);
      break;
    case 'waves':
      drawWavesPattern(p, rand, rgbColors, width, height, config);
      break;
    case 'geometric':
    default:
      drawGeometricPattern(p, rand, rgbColors, width, height, config);
      break;
  }

  p.pop();
};

const shouldUseAnimatedPattern = (patternType) => ANIMATABLE_PATTERN_IDS.includes(patternType);

const P5PatternBackground = ({ 
  colors = [], 
  seed = 0, 
  patternType = 'bokeh',
  patternVariant = null,
  intensity = 1,
  patternLayers = [],
  animated = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const prevColorsRef = useRef([]);
  const shapeEntranceTimesRef = useRef(new Map());

  const layerKey = useMemo(
    () => patternLayers.map((layer) => `${layer.patternType}:${layer.patternVariant}:${layer.intensity}:${layer.color}:${layer.seed}:${layer.entranceDelayMs || 0}:${layer.worldOffsetX || 0}:${layer.worldOffsetY || 0}:${layer.continuity ? 1 : 0}:${JSON.stringify(layer.settings || {})}`).join('|'),
    [patternLayers]
  );
  const colorKey = useMemo(() => colors.join(','), [colors]);
  const hasPatternLayers = patternLayers.length > 0;
  const renderKey = hasPatternLayers ? layerKey : colorKey;

  useEffect(() => {
    if (!containerRef.current) return;
    if (!hasPatternLayers && colors.length === 0) return;
    ensureInteractionTracking();

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = animated && !prefersReducedMotion && (
      hasPatternLayers
        ? patternLayers.some((layer) => ANIMATABLE_PATTERN_IDS.includes(layer.patternType))
        : ANIMATABLE_PATTERN_IDS.includes(patternType)
    );

    const resolvedIntensity = clamp(intensity, 1, 3);
    const resolvedVariant = patternVariant || PATTERN_VARIANTS[patternType]?.[0] || 'default';
    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.ceil(rect.width) || 120;
    const height = Math.ceil(rect.height) || 120;

    // Detect newly added colors
    const prevColors = prevColorsRef.current;
    const activeColors = hasPatternLayers ? patternLayers.map((layer) => layer.color) : colors;
    const newColors = activeColors.filter(c => !prevColors.includes(c));
    const now = Date.now();
    
    // Mark entrance times for new colors
    newColors.forEach(color => {
      shapeEntranceTimesRef.current.set(color, now);
    });
    
    // Update previous colors reference
    prevColorsRef.current = [...activeColors];

    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
    }

    let staticLayerBuffer = null;

    const sketch = (p) => {
      const rand = createSeededRandomGenerator(seed);
      let shapes = [];
      let staticLayers = [];
      let currentFrameRate = ACTIVE_FPS;
      let lastFrameRateCheckAt = 0;
      const entranceTimes = shapeEntranceTimesRef.current;
      const patternConfig = {
        variant: resolvedVariant,
        intensity: resolvedIntensity,
      };

      const getTargetFrameRate = () => {
        if (typeof document !== 'undefined' && document.hidden) return BACKGROUND_FPS;
        if (typeof document !== 'undefined' && !document.hasFocus()) return IDLE_FPS;
        return (Date.now() - lastInteractionAt) <= ACTIVE_WINDOW_MS ? ACTIVE_FPS : IDLE_FPS;
      };

      const syncFrameRate = (force = false) => {
        if (!shouldAnimate) return;

        const nowMs = Date.now();
        if (!force && nowMs - lastFrameRateCheckAt < 1000) return;
        lastFrameRateCheckAt = nowMs;

        const nextFrameRate = getTargetFrameRate();
        if (force || nextFrameRate !== currentFrameRate) {
          p.frameRate(nextFrameRate);
          currentFrameRate = nextFrameRate;
        }
      };

      const drawStaticLayerSet = (target) => {
        if (!hasPatternLayers || staticLayers.length === 0) return;

        staticLayers.forEach((layer, index) => {
          const layerColor = layer.color || colors[index];
          const layerSeed = layer.seed ?? (seed + index * 997);
          const layerRand = createSeededRandomGenerator(layerSeed);
          const layerRgbColors = [hexToRgb(layerColor)];
          const layerConfig = {
            variant: layer.patternVariant || PATTERN_VARIANTS[layer.patternType]?.[0] || 'default',
            intensity: clamp(layer.intensity ?? intensity, 1, 3),
            worldOffsetX: layer.worldOffsetX,
            worldOffsetY: layer.worldOffsetY,
            continuity: layer.continuity,
            baseSeed: layerSeed,
            ...(layer.settings || {}),
          };
          drawStaticPatternType(layer.patternType, target, layerRand, layerRgbColors, width, height, layerConfig);
        });
      };

      p.setup = () => {
        const canvas = p.createCanvas(width, height);
        canvas.style('display', 'block');
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.25));
        
        if (shouldAnimate) {
          syncFrameRate(true);
          if (hasPatternLayers) {
            staticLayers = patternLayers.filter((layer) => !shouldUseAnimatedPattern(layer.patternType));
            shapes = patternLayers
              .filter((layer) => shouldUseAnimatedPattern(layer.patternType))
              .flatMap((layer, index) => {
                const layerColor = layer.color || colors[index];
                const layerSeed = layer.seed ?? (seed + index * 997);
                const layerRand = createSeededRandomGenerator(layerSeed);
                const layerRgbColors = [hexToRgb(layerColor)];
                const layerConfig = {
                  variant: layer.patternVariant || PATTERN_VARIANTS[layer.patternType]?.[0] || 'default',
                  intensity: clamp(layer.intensity ?? intensity, 1, 3),
                  worldOffsetX: layer.worldOffsetX,
                  worldOffsetY: layer.worldOffsetY,
                  continuity: layer.continuity,
                  baseSeed: layerSeed,
                  ...(layer.settings || {}),
                };
                const layerEntranceTimes = new Map([[layerColor, now + (layer.entranceDelayMs || 0)]]);

                return generateAnimatedShapesForPatternType(
                  layer.patternType,
                  layerRand,
                  layerRgbColors,
                  width,
                  height,
                  [layerColor],
                  layerEntranceTimes,
                  now,
                  layerConfig
                );
              });

            // Render static layers once into an offscreen buffer and reuse every frame.
            if (staticLayers.length > 0) {
              staticLayerBuffer = p.createGraphics(width, height);
              staticLayerBuffer.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.25));
              staticLayerBuffer.clear();
              drawStaticLayerSet(staticLayerBuffer);
            }
          } else {
            const rgbColors = colors.map(hexToRgb);
            shapes = generateAnimatedShapesForPatternType(patternType, rand, rgbColors, width, height, colors, entranceTimes, now, patternConfig);
          }
        } else {
          p.noLoop();
          p.clear();
        }
        
        if (!shouldAnimate) {
          if (hasPatternLayers) {
            staticLayers = patternLayers.filter((layer) => !shouldUseAnimatedPattern(layer.patternType));
            drawStaticLayerSet(p);
          } else {
            const rgbColors = colors.map(hexToRgb);
            drawStaticPatternType(patternType, p, rand, rgbColors, width, height, patternConfig);
          }
        }
      };

      p.draw = () => {
        if (!shouldAnimate || shapes.length === 0) return;
        syncFrameRate();
        
        p.clear();
        if (staticLayerBuffer) {
          p.image(staticLayerBuffer, 0, 0, width, height);
        }
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
          const zScale = 1 + clamp(shape.translateZ || 0, -90, 300) * 0.01;
          const globalRotation = ((shape.rotationDeg || 0) * Math.PI) / 180;
          const baseRotation = (shape.rotation || 0) + globalRotation;
          
          // Apply entrance animation: fade + scale up
          const entranceScale = 0.3 + entranceProgress * 0.7;
          const entranceAlpha = entranceProgress;
          
          p.push();
          p.translate(
            shape.x + offsetX + (shape.translateX || 0),
            shape.y + offsetY + (shape.translateY || 0)
          );
          
          if (shape.rotAmount) {
            const rotationOffset = Math.sin(time * shape.rotSpeed + shape.rotPhase) * shape.rotAmount;
            p.rotate(baseRotation + rotationOffset);
          } else if (baseRotation) {
            p.rotate(baseRotation);
          }
          
          p.scale(scaleOffset * entranceScale * zScale);
          
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

    const onVisibilityChange = () => {
      const instance = p5InstanceRef.current;
      if (!instance) return;

      if (document.hidden) {
        instance.noLoop();
      } else {
        instance.loop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (staticLayerBuffer) {
        staticLayerBuffer.remove();
        staticLayerBuffer = null;
      }
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [renderKey, seed, patternType, patternVariant, intensity, animated, hasPatternLayers, colors, patternLayers]);

  if (!hasPatternLayers && colors.length === 0) {
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

const getVariantDensityMultiplier = (intensity, config = {}) => (0.9 + (intensity - 1) * 0.35) * getNumberSetting(config, 'density', 1);
const getVariantAlphaMultiplier = (intensity, config = {}) => (0.85 + (intensity - 1) * 0.18) * getNumberSetting(config, 'opacity', 1);
const getVariantSizeMultiplier = (intensity, config = {}) => (0.95 + (intensity - 1) * 0.12) * getNumberSetting(config, 'scale', 1);
const getVariantMotionMultiplier = (intensity, config = {}) => {
  const animationMode = config?.animationMode || 'active';
  const modeScale = animationMode === 'static' ? 0 : animationMode === 'subtle' ? 0.45 : 1;
  return (0.9 + (intensity - 1) * 0.12) * getNumberSetting(config, 'driftAmount', 1) * modeScale;
};

// ============================================================================
// ANIMATED GEOMETRIC - Generate shapes with animation parameters
// Each habit (color) gets its own unique shape type
// ============================================================================
function generateGeometricShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now(), config = {}) {
  const shapes = [];
  const { variant = 'facets', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  const motionScale = getVariantMotionMultiplier(intensity, config);
  const shapeTypesByVariant = {
    facets: ['triangle', 'diamond', 'hexagon', 'triangle', 'diamond', 'star'],
    lattice: ['rect', 'diamond', 'rect', 'hexagon', 'diamond', 'rect'],
    hexes: ['hexagon', 'hexagon', 'diamond', 'circle', 'hexagon', 'diamond'],
    totems: ['rect', 'circle', 'triangle', 'rect', 'diamond', 'circle'],
  };
  const shapeTypes = shapeTypesByVariant[variant] || ['circle', 'triangle', 'rect', 'hexagon', 'diamond', 'star'];
  const colorShapeMap = colors.map((_, i) => shapeTypes[i % shapeTypes.length]);
  
  // Generate 2-4 shapes per habit to ensure each habit is represented
  const shapeCount = getNumberSetting(config, 'shapeCount', 3);
  const shapesPerHabit = Math.max(1, Math.round(shapeCount * density));
  
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
        size: (15 + rand() * 35) * sizeScale * (variant === 'totems' ? 0.85 : 1),
        aspectRatio: variant === 'totems' ? 1.3 + rand() * 0.8 : 0.7 + rand() * 0.6,
        rotation: variant === 'lattice' ? (Math.PI / 4) * Math.floor(rand() * 4) : rand() * Math.PI * 2,
        color: lightColor,
        alpha: (60 + rand() * 80) * alphaScale,
        strokeWeight: (1 + rand() * 2) * getNumberSetting(config, 'strokeWeight', 1),
        speedX: (0.3 + rand() * 0.4) * motionScale,
        speedY: (0.25 + rand() * 0.35) * motionScale,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: (variant === 'lattice' ? 1 : 2 + rand() * 4) * motionScale,
        driftY: (variant === 'lattice' ? 1 : 2 + rand() * 4) * motionScale,
        rotSpeed: 0.15 + rand() * 0.25,
        rotPhase: rand() * Math.PI * 2,
        rotAmount: variant === 'lattice' ? 0.02 + rand() * 0.04 : 0.05 + rand() * 0.1,
        scaleSpeed: 0.2 + rand() * 0.3,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: variant === 'facets' ? 0.03 + rand() * 0.05 : 0.02 + rand() * 0.03,
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
      size: (20 + rand() * 30) * sizeScale,
      rotation: 0,
      color: { r: 255, g: 255, b: 255 },
      alpha: (50 + rand() * 40) * alphaScale,
      strokeWeight: 1 + rand(),
      speedX: (0.2 + rand() * 0.3) * motionScale,
      speedY: (0.2 + rand() * 0.3) * motionScale,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: (3 + rand() * 5) * motionScale,
      driftY: (3 + rand() * 5) * motionScale,
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
function generateBokehShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now(), config = {}) {
  const shapes = [];
  const { variant = 'mist', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  const driftBoost = variant === 'drift' ? 1.4 : 1;
  
  // Generate orbs per color/habit for better representation
  const baseOrbsPerColor = getNumberSetting(config, 'orbCount', variant === 'cluster' ? 4 : variant === 'glow' ? 3 : 2);
  const orbsPerColor = Math.max(baseOrbsPerColor, Math.floor((8 / colors.length) * density));
  
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
        size: (30 + rand() * (variant === 'glow' ? 60 : 45)) * sizeScale,
        color: color,
        alpha: (120 + rand() * 80) * alphaScale,
        layers: variant === 'glow' ? 6 : variant === 'mist' ? 4 : 5,
        speedX: 0.15 + rand() * 0.2,
        speedY: 0.12 + rand() * 0.18,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: (3 + rand() * 5) * driftBoost,
        driftY: (3 + rand() * 5) * driftBoost,
        scaleSpeed: 0.15 + rand() * 0.2,
        scalePhase: rand() * Math.PI * 2,
        scaleAmount: variant === 'glow' ? 0.06 + rand() * 0.05 : 0.04 + rand() * 0.04,
        entranceTime: isNew ? entranceTime + (i * 80) : null,
      });
    }
    
    // Tiny sparkles for this color
    for (let i = 0; i < 2; i++) {
      shapes.push({
        type: 'bokeh-sparkle',
        x: rand() * width,
        y: rand() * height,
        size: (3 + rand() * 5) * (variant === 'cluster' ? 1.2 : 1),
        color: color,
        alpha: (120 + rand() * 100) * alphaScale,
        speedX: 0.3 + rand() * 0.4,
        speedY: 0.25 + rand() * 0.35,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: (2 + rand() * 4) * driftBoost,
        driftY: (2 + rand() * 4) * driftBoost,
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
function generateRingsShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now(), config = {}) {
  const shapes = [];
  const { variant = 'halo', intensity = 1 } = config;
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  const motionScale = getVariantMotionMultiplier(intensity, config);
  const ringCountSetting = getNumberSetting(config, 'ringCount', variant === 'ripple' ? 6 : 4);
  
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
      x: variant === 'bullseye' ? width * (0.3 + colorIndex * 0.35) : rand() * width,
      y: variant === 'bullseye' ? height * (0.35 + (colorIndex % 2) * 0.3) : rand() * height,
      size: (50 + rand() * 50) * sizeScale,
      ringCount: Math.max(1, Math.round(ringCountSetting + rand() * 1)),
      color: lightColor,
      alpha: (90 + rand() * 50) * alphaScale,
      strokeWeight: (variant === 'orbit' ? 1 + rand() : 1.5 + rand() * 1.5) * getNumberSetting(config, 'strokeWeight', 1),
      speedX: (0.1 + rand() * 0.15) * motionScale,
      speedY: (0.08 + rand() * 0.12) * motionScale,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: (variant === 'bullseye' ? 1 : 2 + rand() * 3) * motionScale,
      driftY: (variant === 'bullseye' ? 1 : 2 + rand() * 3) * motionScale,
      scaleSpeed: 0.12 + rand() * 0.15,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: variant === 'ripple' ? 0.09 + rand() * 0.07 : 0.06 + rand() * 0.06,
      entranceTime: isNew ? entranceTime : null,
    });
    
    // Additional smaller ring for this color
    shapes.push({
      type: 'ring',
      x: variant === 'orbit' ? width * 0.5 : rand() * width,
      y: variant === 'orbit' ? height * 0.5 : rand() * height,
      size: (25 + rand() * 30) * sizeScale,
      color: lightColor,
      alpha: (60 + rand() * 50) * alphaScale,
      strokeWeight: (1 + rand()) * getNumberSetting(config, 'strokeWeight', 1),
      speedX: (0.15 + rand() * 0.2) * motionScale,
      speedY: (0.12 + rand() * 0.18) * motionScale,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      driftX: (variant === 'orbit' ? 5 + rand() * 7 : 3 + rand() * 5) * motionScale,
      driftY: (variant === 'orbit' ? 5 + rand() * 7 : 3 + rand() * 5) * motionScale,
      scaleSpeed: 0.18 + rand() * 0.2,
      scalePhase: rand() * Math.PI * 2,
      scaleAmount: variant === 'halo' ? 0.05 + rand() * 0.05 : 0.08 + rand() * 0.08,
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
function generateConfettiShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now(), config = {}) {
  const shapes = [];
  const { variant = 'sprinkles', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  
  // Create confetti pieces for each color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    // Several pieces per color
    const pieceCount = getNumberSetting(config, 'pieceCount', variant === 'streamers' ? 5 : 4);
    const piecesPerColor = Math.max(2, Math.round(pieceCount * density));
    for (let i = 0; i < piecesPerColor; i++) {
      shapes.push({
        type: 'confetti-piece',
        shapeVariant: variant === 'capsules' ? 0 : variant === 'cutouts' ? 2 : Math.floor(rand() * 3),
        x: rand() * width,
        y: rand() * height,
        size: (6 + rand() * (variant === 'streamers' ? 16 : 10)) * sizeScale,
        rotation: rand() * Math.PI * 2,
        color: lightenColor(color, 0.3 + rand() * 0.3),
        alpha: (100 + rand() * 100) * alphaScale,
        speedX: 0.5 + rand() * 0.8,
        speedY: (variant === 'streamers' ? 0.6 : 0.4) + rand() * 0.7,
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
function generateStarburstShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now(), config = {}) {
  const shapes = [];
  const { variant = 'burst', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  
  // Create starburst center per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    const cx = 20 + rand() * (width - 40);
    const cy = 20 + rand() * (height - 40);
    const numRaysBase = getNumberSetting(config, 'rayCount', variant === 'firework' ? 10 : variant === 'compass' ? 8 : 6);
    const numRays = Math.max(numRaysBase, Math.round((numRaysBase + rand() * 4) * density));
    const baseAngle = variant === 'compass' ? 0 : rand() * Math.PI * 2;
    
    // Rays radiating from center
    for (let i = 0; i < numRays; i++) {
      const angle = baseAngle + (i / numRays) * Math.PI * 2;
      shapes.push({
        type: 'ray',
        x: cx,
        y: cy,
        rotation: angle,
        length: (20 + rand() * (variant === 'firework' ? 42 : 35)) * sizeScale,
        color: lightColor,
        alpha: (60 + rand() * 80) * alphaScale,
        strokeWeight: (variant === 'compass' ? 1.5 + rand() * 1.5 : 1 + rand() * 2) * getNumberSetting(config, 'strokeWeight', 1),
        speedX: 0.1 + rand() * 0.15,
        speedY: 0.1 + rand() * 0.15,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        driftX: 1 + rand() * 2,
        driftY: 1 + rand() * 2,
        rotSpeed: 0.05 + rand() * 0.1,
        rotPhase: rand() * Math.PI * 2,
        rotAmount: variant === 'pinwheel' ? 0.18 + rand() * 0.18 : 0.1 + rand() * 0.15,
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
      size: (12 + rand() * 15) * sizeScale,
      color: color,
      alpha: (100 + rand() * 80) * alphaScale,
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
function generateWavesShapes(rand, colors, width, height, hexColors = [], entranceTimes = new Map(), now = Date.now(), config = {}) {
  const shapes = [];
  const { variant = 'contour', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const motionScale = getVariantMotionMultiplier(intensity, config);
  
  // Create wave lines per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const hexColor = hexColors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    const entranceTime = hexColor && entranceTimes.get(hexColor);
    const isNew = entranceTime && (now - entranceTime < ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS + 100);
    
    // Multiple wave lines per color at different heights
    const linesPerColor = Math.max(1, Math.round(getNumberSetting(config, 'lineCount', variant === 'interference' ? 3 : 2) * density));
    for (let i = 0; i < linesPerColor; i++) {
      shapes.push({
        type: 'wave-line',
        x: width / 2,
        y: height * (variant === 'arcs' ? 0.4 + rand() * 0.35 : 0.25 + rand() * 0.5),
        rotation: variant === 'arcs' ? (rand() - 0.5) * 0.55 : (rand() - 0.5) * 0.3,
        length: width * (variant === 'current' ? 1 : 0.9),
        amplitude: (variant === 'contour' ? 5 + rand() * 10 : 8 + rand() * 15) * getNumberSetting(config, 'amplitude', 1),
        frequency: variant === 'interference' ? 1.8 + rand() * 1.8 : 1 + rand() * 1.5,
        segments: variant === 'contour' ? 28 : 20,
        waveSpeed: (0.3 + rand() * 0.4) * motionScale,
        color: lightColor,
        alpha: (60 + rand() * 70) * alphaScale,
        strokeWeight: (variant === 'contour' ? 1 + rand() * 1.4 : 1.5 + rand() * 2) * getNumberSetting(config, 'strokeWeight', 1),
        speedX: (0.05 + rand() * 0.1) * motionScale,
        speedY: (0.08 + rand() * 0.12) * motionScale,
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
function drawBokehPattern(p, rand, colors, width, height, config = {}) {
  const { variant = 'mist', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  const numOrbs = Math.max(1, Math.round(getNumberSetting(config, 'orbCount', 4 + Math.floor(rand() * 4)) * density));

  // Large soft background orbs - using actual habit colors
  for (let i = 0; i < numOrbs; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const x = rand() * width;
    const y = rand() * height;
    const size = (25 + rand() * (variant === 'glow' ? 55 : 40)) * sizeScale;

    // Draw multiple concentric circles for soft glow effect
    // Outer glow uses slightly lighter color, inner uses actual color
    for (let j = 5; j >= 0; j--) {
      const glowAmount = (5 - j) * 0.12; // Lighter colors
      const glowColor = lightenColor(color, glowAmount);
      const alpha = (15 + rand() * 25) * (j / 5) * alphaScale;
      const currentSize = size * (1 + (5 - j) * 0.15);
      p.noStroke();
      p.fill(glowColor.r, glowColor.g, glowColor.b, alpha);
      p.circle(x, y, currentSize);
    }

    // Softer color core
    p.fill(color.r, color.g, color.b, (50 + rand() * 35) * alphaScale);
    p.circle(x, y, size * 0.5);
  }

  // Smaller accent orbs - using actual habit colors
  const accentCount = variant === 'cluster' ? 5 : 3;
  for (let i = 0; i < accentCount; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const x = rand() * width;
    const y = rand() * height;
    const size = (12 + rand() * 20) * (variant === 'cluster' ? 1.2 : 1);

    // Outer glow
    const lightColor = lightenColor(color, 0.4);
    for (let j = 3; j >= 0; j--) {
      const alpha = (25 + rand() * 30) * (j / 3) * alphaScale;
      const currentSize = size * (0.6 + j * 0.2);
      p.noStroke();
      p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.circle(x, y, currentSize);
    }

    // Softer habit color center
    p.fill(color.r, color.g, color.b, (70 + rand() * 50) * alphaScale);
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
function drawRingsPattern(p, rand, colors, width, height, config = {}) {
  const { variant = 'halo', intensity = 1 } = config;
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  const numCenters = variant === 'bullseye' ? Math.min(3, colors.length) : 2 + Math.floor(rand() * 3);
  
  for (let c = 0; c < numCenters; c++) {
    const color = colors[c % colors.length];
    const lightColor = lightenColor(color, 0.6);
    const cx = variant === 'bullseye' ? width * (0.25 + (c / Math.max(1, numCenters - 1)) * 0.5) : rand() * width;
    const cy = variant === 'bullseye' ? height * (0.35 + (c % 2) * 0.25) : rand() * height;
    const numRings = Math.max(1, Math.round(getNumberSetting(config, 'ringCount', variant === 'ripple' ? 6 : 4)));
    const maxSize = (60 + rand() * 60) * sizeScale;
    
    for (let i = 0; i < numRings; i++) {
      const size = maxSize * ((i + 1) / numRings);
      const alpha = (100 - (i * 20) + rand() * 30) * alphaScale;
      const weight = (variant === 'orbit' ? 1 + rand() * 1.5 : 1.5 + rand() * 2) * getNumberSetting(config, 'strokeWeight', 1);
      
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
function drawMosaicPattern(p, rand, colors, width, height, config = {}) {
  const { variant = 'triangles', intensity = 1, continuity = false, worldOffsetX = 0, worldOffsetY = 0, baseSeed = 0 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const sizeScale = getVariantSizeMultiplier(intensity, config);
  const accentScale = getNumberSetting(config, 'accentOpacity', 1);
  const strokeScale = getNumberSetting(config, 'strokeWeight', 1);
  const tileSize = getNumberSetting(
    config,
    'tileSize',
    ((variant === 'steps' ? 20 : 25) + rand() * (variant === 'shards' ? 20 : 15)) * sizeScale
  ) * sizeScale;
  const rowHeight = tileSize * 0.866;
  const rows = Math.ceil(height / rowHeight) + 1;
  const cols = Math.ceil(width / tileSize) + 1;

  if (continuity && variant === 'triangles') {
    const worldX = worldOffsetX * width;
    const worldY = worldOffsetY * height;
    const startRow = Math.floor(worldY / rowHeight) - 2;
    const endRow = Math.ceil((worldY + height) / rowHeight) + 2;

    for (let row = startRow; row <= endRow; row++) {
      const xOffset = (row % 2) * (tileSize / 2);
      const startCol = Math.floor((worldX - xOffset) / tileSize) - 2;
      const endCol = Math.ceil((worldX + width - xOffset) / tileSize) + 2;

      for (let col = startCol; col <= endCol; col++) {
        const localX = col * tileSize + xOffset - worldX;
        const localY = row * rowHeight - worldY;

        for (let tri = 0; tri < 2; tri++) {
          const positionSeed = hashString(`${baseSeed}:${row}:${col}:${tri}`);
          const color = colors[positionSeed % colors.length];
          const lightColor = lightenColor(color, 0.35 + seededRandom(positionSeed) * 0.25);
          const alpha = (50 + seededRandom(positionSeed + 1) * 80) * alphaScale;

          p.noStroke();
          p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
          p.beginShape();
          if (tri === 0) {
            p.vertex(localX, localY + rowHeight);
            p.vertex(localX + tileSize / 2, localY);
            p.vertex(localX + tileSize, localY + rowHeight);
          } else {
            p.vertex(localX + tileSize / 2, localY);
            p.vertex(localX + tileSize, localY + rowHeight);
            p.vertex(localX + tileSize * 1.5, localY);
          }
          p.endShape(p.CLOSE);
        }
      }
    }

    p.stroke(255, 255, 255, 30 * accentScale);
    p.strokeWeight(0.5 * strokeScale);
    for (let row = startRow; row <= endRow; row++) {
      const xOffset = (row % 2) * (tileSize / 2);
      const startCol = Math.floor((worldX - xOffset) / tileSize) - 2;
      const endCol = Math.ceil((worldX + width - xOffset) / tileSize) + 2;

      for (let col = startCol; col <= endCol; col++) {
        const localX = col * tileSize + xOffset - worldX;
        const localY = row * rowHeight - worldY;

        p.noFill();
        p.beginShape();
        p.vertex(localX, localY + rowHeight);
        p.vertex(localX + tileSize / 2, localY);
        p.vertex(localX + tileSize, localY + rowHeight);
        p.endShape(p.CLOSE);
      }
    }

    return;
  }
  
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
        const alpha = (50 + rand() * 80) * alphaScale;
        
        p.noStroke();
        p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
        
        p.beginShape();
        if (variant === 'diamonds') {
          p.vertex(x + tileSize / 2, y);
          p.vertex(x + tileSize, y + tileSize * 0.433);
          p.vertex(x + tileSize / 2, y + tileSize * 0.866);
          p.vertex(x, y + tileSize * 0.433);
        } else if (variant === 'shards') {
          p.vertex(x, y + tileSize * (0.7 + rand() * 0.2));
          p.vertex(x + tileSize * (0.2 + rand() * 0.2), y);
          p.vertex(x + tileSize, y + tileSize * (0.5 + rand() * 0.3));
        } else if (tri === 0) {
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
  p.stroke(255, 255, 255, 30 * accentScale);
  p.strokeWeight(0.5 * strokeScale);
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
  for (let i = 0; i < Math.max(4, Math.round(4 * density)); i++) {
    const x = rand() * width;
    const y = rand() * height;
    p.noStroke();
    p.fill(255, 255, 255, (40 + rand() * 40) * accentScale);
    p.circle(x, y, 8 + rand() * 12);
  }
}

// ============================================================================
// GEOMETRIC PATTERN - Each habit gets its own unique shape type
// ============================================================================
function drawGeometricPattern(p, rand, colors, width, height, config = {}) {
  const { variant = 'facets', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  const shapeTypesByVariant = {
    facets: ['triangle', 'diamond', 'hexagon', 'triangle', 'diamond', 'star'],
    lattice: ['rect', 'diamond', 'rect', 'hexagon', 'diamond', 'rect'],
    hexes: ['hexagon', 'hexagon', 'diamond', 'circle', 'hexagon', 'diamond'],
    totems: ['rect', 'circle', 'triangle', 'rect', 'diamond', 'circle'],
  };
  const shapeTypes = shapeTypesByVariant[variant] || ['circle', 'triangle', 'rect', 'hexagon', 'diamond', 'star'];
  const colorShapeMap = colors.map((_, i) => shapeTypes[i % shapeTypes.length]);
  
  // Draw 2-4 shapes per habit to ensure each is represented
  const shapesPerHabit = Math.max(1, Math.round(getNumberSetting(config, 'shapeCount', 3) * density));
  
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.55 + rand() * 0.15);
    const shapeType = colorShapeMap[colorIndex];
    
    for (let i = 0; i < shapesPerHabit; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const size = 15 + rand() * (variant === 'totems' ? 28 : 35);
      const rotation = variant === 'lattice' ? (p.PI / 4) * Math.floor(rand() * 4) : rand() * p.TWO_PI;
      const alpha = (60 + rand() * 80) * alphaScale;
      
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
function drawConfettiPattern(p, rand, colors, width, height, config = {}) {
  const { variant = 'sprinkles', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  // Draw confetti pieces for each color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.3 + rand() * 0.3);
    
    // Several pieces per color
    const piecesPerColor = Math.max(1, Math.round(getNumberSetting(config, 'pieceCount', variant === 'streamers' ? 7 : 6) * density));
    for (let i = 0; i < piecesPerColor; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const size = 6 + rand() * (variant === 'streamers' ? 16 : 12);
      const rotation = rand() * Math.PI * 2;
      const alpha = (100 + rand() * 100) * alphaScale;
      const shapeVariant = variant === 'capsules' ? 0 : variant === 'cutouts' ? 2 : Math.floor(rand() * 3);
      
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
function drawStarburstPattern(p, rand, colors, width, height, config = {}) {
  const { variant = 'burst', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  // Create starburst centers per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    
    const cx = 20 + rand() * (width - 40);
    const cy = 20 + rand() * (height - 40);
    const numRays = Math.max(2, Math.round(getNumberSetting(config, 'rayCount', (variant === 'firework' ? 10 : 6) + Math.floor(rand() * 4)) * density));
    const baseAngle = variant === 'compass' ? 0 : rand() * Math.PI * 2;
    
    // Rays radiating from center
    for (let i = 0; i < numRays; i++) {
      const angle = baseAngle + (i / numRays) * Math.PI * 2;
      const length = 20 + rand() * (variant === 'firework' ? 42 : 35);
      const alpha = (60 + rand() * 80) * alphaScale;
      
      p.push();
      p.translate(cx, cy);
      p.rotate(angle);
      p.stroke(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.strokeWeight((variant === 'compass' ? 1.5 + rand() * 1.5 : 1 + rand() * 2) * getNumberSetting(config, 'strokeWeight', 1));
      p.line(0, 0, length, 0);
      p.pop();
    }
    
    // Center glow
    const glowSize = 12 + rand() * 15;
    for (let j = 3; j >= 0; j--) {
      const glowColor = lightenColor(color, j * 0.1);
      const alpha = (80 + rand() * 60) * (j / 3) * alphaScale;
      const currentSize = glowSize * (1 + (3 - j) * 0.2);
      p.noStroke();
      p.fill(glowColor.r, glowColor.g, glowColor.b, alpha);
      p.circle(cx, cy, currentSize);
    }
    p.fill(color.r, color.g, color.b, (100 + rand() * 80) * alphaScale);
    p.circle(cx, cy, glowSize * 0.4);
  }
}

// ============================================================================
// WAVES PATTERN - Flowing wave lines
// ============================================================================
function drawWavesPattern(p, rand, colors, width, height, config = {}) {
  const { variant = 'contour', intensity = 1 } = config;
  const density = getVariantDensityMultiplier(intensity, config);
  const alphaScale = getVariantAlphaMultiplier(intensity, config);
  // Draw wave lines per color
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    const lightColor = lightenColor(color, 0.4);
    
    // Multiple wave lines per color at different heights
    const linesPerColor = Math.max(1, Math.round(getNumberSetting(config, 'lineCount', variant === 'interference' ? 3 : 2) * density));
    for (let i = 0; i < linesPerColor; i++) {
      const baseY = height * (variant === 'arcs' ? 0.4 + rand() * 0.35 : 0.25 + rand() * 0.5);
      const amplitude = (variant === 'contour' ? 5 + rand() * 10 : 8 + rand() * 15) * getNumberSetting(config, 'amplitude', 1);
      const frequency = variant === 'interference' ? 1.8 + rand() * 1.8 : 1 + rand() * 1.5;
      const segments = variant === 'contour' ? 28 : 20;
      const alpha = (60 + rand() * 70) * alphaScale;
      const rotation = variant === 'arcs' ? (rand() - 0.5) * 0.55 : (rand() - 0.5) * 0.3;
      
      p.push();
      p.translate(width / 2, baseY);
      p.rotate(rotation);
      p.noFill();
      p.stroke(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.strokeWeight((variant === 'contour' ? 1 + rand() * 1.4 : 1.5 + rand() * 2) * getNumberSetting(config, 'strokeWeight', 1));
      
      p.beginShape();
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = t * width * (variant === 'current' ? 1 : 0.9) - width * (variant === 'current' ? 0.5 : 0.45);
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
