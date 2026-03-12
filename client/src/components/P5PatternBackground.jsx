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
};

const P5PatternBackground = ({ 
  colors = [], 
  seed = 0, 
  patternType = 'bokeh',
  className = ''
}) => {
  const containerRef = useRef(null);
  const p5InstanceRef = useRef(null);

  const colorKey = useMemo(() => colors.join(','), [colors]);

  useEffect(() => {
    if (!containerRef.current || colors.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.ceil(rect.width) || 120;
    const height = Math.ceil(rect.height) || 120;

    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
    }

    const sketch = (p) => {
      const rand = createSeededRandomGenerator(seed);
      const rgbColors = colors.map(hexToRgb);

      p.setup = () => {
        const canvas = p.createCanvas(width, height);
        canvas.style('display', 'block');
        p.noLoop();
        p.pixelDensity(2);
        p.clear();
        
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
          case 'geometric':
          default:
            drawGeometricPattern(p, rand, rgbColors, width, height);
            break;
        }
      };
    };

    p5InstanceRef.current = new p5(sketch, containerRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [colorKey, seed, patternType]);

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
// BOKEH PATTERN - Soft glowing orbs like out-of-focus lights
// ============================================================================
function drawBokehPattern(p, rand, colors, width, height) {
  const numOrbs = 5 + Math.floor(rand() * 6);
  
  // Large soft background orbs
  for (let i = 0; i < numOrbs; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const lightColor = lightenColor(color, 0.5);
    const x = rand() * width;
    const y = rand() * height;
    const size = 30 + rand() * 50;
    
    // Draw multiple concentric circles for soft glow effect
    for (let j = 5; j >= 0; j--) {
      const alpha = (20 + rand() * 30) * (j / 5);
      const currentSize = size * (1 + (5 - j) * 0.15);
      p.noStroke();
      p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.circle(x, y, currentSize);
    }
  }
  
  // Smaller bright accent orbs
  for (let i = 0; i < 4; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const lightColor = lightenColor(color, 0.7);
    const x = rand() * width;
    const y = rand() * height;
    const size = 15 + rand() * 25;
    
    // Core glow
    for (let j = 3; j >= 0; j--) {
      const alpha = (40 + rand() * 40) * (j / 3);
      const currentSize = size * (0.5 + j * 0.2);
      p.noStroke();
      p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
      p.circle(x, y, currentSize);
    }
    
    // Bright center
    p.fill(255, 255, 255, 60 + rand() * 40);
    p.circle(x, y, size * 0.3);
  }
  
  // Tiny sparkle dots
  for (let i = 0; i < 8; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = 2 + rand() * 4;
    p.fill(255, 255, 255, 80 + rand() * 80);
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
// MOSAIC PATTERN - Triangular/hexagonal tiles like stained glass
// ============================================================================
function drawMosaicPattern(p, rand, colors, width, height) {
  const tileSize = 25 + rand() * 15;
  const rows = Math.ceil(height / (tileSize * 0.866)) + 1;
  const cols = Math.ceil(width / tileSize) + 1;
  
  // Draw triangular mosaic
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const xOffset = (row % 2) * (tileSize / 2);
      const x = col * tileSize + xOffset;
      const y = row * tileSize * 0.866;
      
      // Two triangles per cell (pointing up and down)
      for (let tri = 0; tri < 2; tri++) {
        const color = colors[Math.floor(rand() * colors.length)];
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
// GEOMETRIC PATTERN - Mixed shapes (circles, triangles, rectangles)
// ============================================================================
function drawGeometricPattern(p, rand, colors, width, height) {
  const numShapes = 6 + Math.floor(rand() * 8);
  const subPattern = Math.floor(rand() * 4);

  switch (subPattern) {
    case 0:
      drawCircleSubPattern(p, rand, colors, width, height, numShapes);
      break;
    case 1:
      drawTriangleSubPattern(p, rand, colors, width, height, numShapes);
      break;
    case 2:
      drawRectSubPattern(p, rand, colors, width, height, numShapes);
      break;
    default:
      drawMixedSubPattern(p, rand, colors, width, height, numShapes);
  }
}

function drawCircleSubPattern(p, rand, colors, width, height, numShapes) {
  for (let i = 0; i < numShapes; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const lightColor = lightenColor(color, 0.7);
    const x = rand() * width;
    const y = rand() * height;
    const size = 15 + rand() * 40;
    const alpha = 80 + rand() * 100;

    p.noStroke();
    p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
    p.circle(x, y, size);
  }

  for (let i = 0; i < 4; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = 25 + rand() * 40;

    p.noFill();
    p.stroke(255, 255, 255, 100 + rand() * 80);
    p.strokeWeight(1.5 + rand() * 2);
    p.circle(x, y, size);
  }
}

function drawTriangleSubPattern(p, rand, colors, width, height, numShapes) {
  for (let i = 0; i < numShapes; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const lightColor = lightenColor(color, 0.6);
    const cx = rand() * width;
    const cy = rand() * height;
    const size = 20 + rand() * 35;
    const rotation = rand() * p.TWO_PI;
    const alpha = 70 + rand() * 100;

    p.push();
    p.translate(cx, cy);
    p.rotate(rotation);
    p.noStroke();
    p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
    
    p.beginShape();
    for (let j = 0; j < 3; j++) {
      const angle = (j * p.TWO_PI / 3) - p.HALF_PI;
      p.vertex(p.cos(angle) * size / 2, p.sin(angle) * size / 2);
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  for (let i = 0; i < 3; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const size = 30 + rand() * 30;
    const rotation = rand() * p.TWO_PI;

    p.push();
    p.translate(cx, cy);
    p.rotate(rotation);
    p.noFill();
    p.stroke(255, 255, 255, 90 + rand() * 60);
    p.strokeWeight(1.5);
    
    p.beginShape();
    for (let j = 0; j < 3; j++) {
      const angle = (j * p.TWO_PI / 3) - p.HALF_PI;
      p.vertex(p.cos(angle) * size / 2, p.sin(angle) * size / 2);
    }
    p.endShape(p.CLOSE);
    p.pop();
  }
}

function drawRectSubPattern(p, rand, colors, width, height, numShapes) {
  for (let i = 0; i < numShapes; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const lightColor = lightenColor(color, 0.55);
    const x = rand() * width;
    const y = rand() * height;
    const w = 15 + rand() * 30;
    const h = 15 + rand() * 30;
    const rotation = rand() * p.HALF_PI;
    const alpha = 60 + rand() * 80;

    p.push();
    p.translate(x, y);
    p.rotate(rotation);
    p.noStroke();
    p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);
    p.rectMode(p.CENTER);
    p.rect(0, 0, w, h);
    p.pop();
  }

  for (let i = 0; i < 3; i++) {
    const x1 = rand() * width;
    const y1 = rand() * height;
    const x2 = rand() * width;
    const y2 = rand() * height;

    p.stroke(255, 255, 255, 50);
    p.strokeWeight(1);
    p.line(x1, y1, x2, y2);
  }
}

function drawMixedSubPattern(p, rand, colors, width, height, numShapes) {
  for (let i = 0; i < numShapes; i++) {
    const shapeType = Math.floor(rand() * 3);
    const color = colors[Math.floor(rand() * colors.length)];
    const lightColor = lightenColor(color, 0.55);
    const x = rand() * width;
    const y = rand() * height;
    const alpha = 60 + rand() * 80;

    p.noStroke();
    p.fill(lightColor.r, lightColor.g, lightColor.b, alpha);

    switch (shapeType) {
      case 0: {
        const size = 15 + rand() * 30;
        p.circle(x, y, size);
        break;
      }
      case 1: {
        const size = 18 + rand() * 28;
        const rotation = rand() * p.TWO_PI;
        p.push();
        p.translate(x, y);
        p.rotate(rotation);
        p.beginShape();
        for (let j = 0; j < 3; j++) {
          const angle = (j * p.TWO_PI / 3) - p.HALF_PI;
          p.vertex(p.cos(angle) * size / 2, p.sin(angle) * size / 2);
        }
        p.endShape(p.CLOSE);
        p.pop();
        break;
      }
      case 2: {
        const w = 15 + rand() * 25;
        const h = 15 + rand() * 25;
        const rotation = rand() * p.HALF_PI;
        p.push();
        p.translate(x, y);
        p.rotate(rotation);
        p.rectMode(p.CENTER);
        p.rect(0, 0, w, h);
        p.pop();
        break;
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = 18 + rand() * 22;
    
    p.noFill();
    p.stroke(255, 255, 255, 70);
    p.strokeWeight(1);
    p.circle(x, y, size);
  }
}

export default P5PatternBackground;
