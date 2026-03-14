import { memo, useId, useMemo } from 'react';
import {
  createSeededRandomGenerator,
  getAutoPatternPreset,
  getHabitSeedOffset,
  resolveAccentColor,
} from '../utils/patterns';

export { getAutoPatternPreset, getHabitSeedOffset } from '../utils/patterns';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const polarPoint = (cx, cy, radius, angle) => ({
  x: cx + (Math.cos(angle) * radius),
  y: cy + (Math.sin(angle) * radius),
});

const getViewport = (layer) => {
  const inset = clamp(layer.inset ?? 6, 0, 28);
  return {
    minX: inset,
    minY: inset,
    width: 100 - (inset * 2),
    height: 100 - (inset * 2),
    centerX: 50,
    centerY: 50,
  };
};

const buildTransform = (layer, scaleMultiplier = 1) => {
  const scale = clamp((layer.scale ?? 1) * scaleMultiplier, 0.3, 3);
  const translateX = (layer.translateX ?? 0) * 0.35;
  const translateY = (layer.translateY ?? 0) * 0.35;
  const rotate = layer.rotate ?? 0;

  return [
    `translate(${translateX} ${translateY})`,
    'translate(50 50)',
    `rotate(${rotate})`,
    `scale(${scale})`,
    'translate(-50 -50)',
  ].join(' ');
};

const buildMask = (maskType, id) => {
  switch (maskType) {
    case 'radial-fade':
      return (
        <mask id={id} key={id}>
          <radialGradient id={`${id}-gradient`} cx="50%" cy="50%" r="56%">
            <stop offset="0%" stopColor="white" />
            <stop offset="72%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <rect width="100" height="100" fill={`url(#${id}-gradient)`} />
        </mask>
      );
    case 'vertical-fade':
      return (
        <mask id={id} key={id}>
          <linearGradient id={`${id}-gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" />
            <stop offset="25%" stopColor="white" />
            <stop offset="78%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </linearGradient>
          <rect width="100" height="100" fill={`url(#${id}-gradient)`} />
        </mask>
      );
    case 'diagonal-slice':
      return (
        <mask id={id} key={id}>
          <rect width="100" height="100" fill="black" />
          <polygon points="0,85 0,22 100,0 100,64" fill="white" />
        </mask>
      );
    case 'stripe-window':
      return (
        <mask id={id} key={id}>
          <rect width="100" height="100" fill="black" />
          <rect x="10" y="14" width="80" height="14" rx="7" fill="white" />
          <rect x="10" y="43" width="80" height="14" rx="7" fill="white" />
          <rect x="10" y="72" width="80" height="14" rx="7" fill="white" />
        </mask>
      );
    default:
      return null;
  }
};

const createPaint = (layerId, color, accentColor, useGradient) => {
  if (!useGradient) {
    return { defs: [], stroke: color, fill: color };
  }

  const gradientId = `${layerId}-gradient`;
  return {
    defs: [
      (
        <linearGradient id={gradientId} key={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accentColor} />
          <stop offset="100%" stopColor={color} stopOpacity="0.76" />
        </linearGradient>
      ),
    ],
    stroke: `url(#${gradientId})`,
    fill: `url(#${gradientId})`,
  };
};

const renderLines = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(3, Math.round(2 + (layer.detail * layer.density)));
  return Array.from({ length: count }, (_, index) => {
    const y = viewport.minY + (((index + 1) / (count + 1)) * viewport.height);
    const points = Array.from({ length: 8 }, (_, pointIndex) => {
      const t = pointIndex / 7;
      const x = viewport.minX + (t * viewport.width);
      const wave = Math.sin((t * Math.PI * 2 * (1.2 + rand())) + (rand() * Math.PI * 2));
      return `${pointIndex === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${(y + (wave * viewport.height * 0.08 * (0.7 + layer.jitter))).toFixed(2)}`;
    }).join(' ');

    return <path key={`line-${index}`} d={points} fill="none" stroke={paint.stroke} strokeWidth={layer.strokeWidth} strokeOpacity={opacity} strokeLinecap="round" />;
  });
};

const renderContours = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(2, Math.round(2 + (layer.detail * 0.7 * layer.density)));
  return Array.from({ length: count }, (_, index) => (
    <ellipse
      key={`contour-${index}`}
      cx={viewport.centerX + ((rand() - 0.5) * viewport.width * 0.08)}
      cy={viewport.centerY + ((rand() - 0.5) * viewport.height * 0.08)}
      rx={viewport.width * (0.16 + (index * 0.12))}
      ry={viewport.height * (0.12 + (index * 0.1)) * (0.8 + rand() * 0.28)}
      fill="none"
      stroke={paint.stroke}
      strokeWidth={layer.strokeWidth}
      strokeOpacity={opacity * 0.9}
    />
  ));
};

const renderRings = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(2, Math.round(2 + (layer.detail * 0.75 * layer.density)));
  const cx = viewport.centerX + ((rand() - 0.5) * viewport.width * 0.1);
  const cy = viewport.centerY + ((rand() - 0.5) * viewport.height * 0.1);
  return Array.from({ length: count }, (_, index) => (
    <circle
      key={`ring-${index}`}
      cx={cx}
      cy={cy}
      r={viewport.width * (0.12 + (index * 0.1))}
      fill="none"
      stroke={paint.stroke}
      strokeWidth={layer.strokeWidth}
      strokeOpacity={opacity}
    />
  ));
};

const renderArcs = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(2, Math.round(2 + (layer.detail * 0.65 * layer.density)));
  const cx = viewport.centerX;
  const cy = viewport.centerY;
  return Array.from({ length: count }, (_, index) => {
    const radius = viewport.width * (0.18 + (index * 0.12));
    const start = rand() * Math.PI * 2;
    const end = start + (Math.PI * (0.35 + rand() * 0.45));
    const a = polarPoint(cx, cy, radius, start);
    const b = polarPoint(cx, cy, radius, end);
    return (
      <path
        key={`arc-${index}`}
        d={`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`}
        fill="none"
        stroke={paint.stroke}
        strokeWidth={layer.strokeWidth}
        strokeOpacity={opacity}
        strokeLinecap="round"
      />
    );
  });
};

const renderBurst = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(8, Math.round(8 + (layer.detail * 1.6 * layer.density)));
  const cx = viewport.centerX;
  const cy = viewport.centerY;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const start = polarPoint(cx, cy, viewport.width * 0.08, angle);
    const end = polarPoint(cx, cy, viewport.width * (0.18 + rand() * 0.26), angle);
    return <line key={`burst-${index}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={paint.stroke} strokeWidth={layer.strokeWidth} strokeOpacity={opacity} strokeLinecap="round" />;
  });
};

const renderGrid = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(3, Math.round(3 + (layer.detail * 0.8 * layer.density)));
  const nodes = [];
  for (let index = 0; index < count; index += 1) {
    const x = viewport.minX + ((index / (count - 1 || 1)) * viewport.width);
    const y = viewport.minY + ((index / (count - 1 || 1)) * viewport.height);
    nodes.push(<line key={`gv-${index}`} x1={x} y1={viewport.minY} x2={x} y2={viewport.minY + viewport.height} stroke={paint.stroke} strokeWidth={layer.strokeWidth * 0.75} strokeOpacity={opacity * 0.8} />);
    nodes.push(<line key={`gh-${index}`} x1={viewport.minX} y1={y} x2={viewport.minX + viewport.width} y2={y} stroke={paint.stroke} strokeWidth={layer.strokeWidth * 0.75} strokeOpacity={opacity * 0.8} />);
  }
  for (let index = 0; index < Math.max(2, count - 1); index += 1) {
    nodes.push(<rect key={`box-${index}`} x={viewport.minX + rand() * viewport.width * 0.7} y={viewport.minY + rand() * viewport.height * 0.7} width={viewport.width * 0.14} height={viewport.width * 0.14} fill="none" stroke={paint.stroke} strokeWidth={layer.strokeWidth * 0.65} strokeOpacity={opacity * 0.6} />);
  }
  return nodes;
};

const renderPetals = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(5, Math.round(5 + (layer.detail * layer.density)));
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * 360;
    const cx = viewport.centerX;
    const cy = viewport.centerY;
    return (
      <ellipse
        key={`petal-${index}`}
        cx={cx}
        cy={cy - (viewport.height * 0.14)}
        rx={viewport.width * (0.08 + rand() * 0.03)}
        ry={viewport.height * (0.2 + rand() * 0.04)}
        fill={paint.fill}
        fillOpacity={opacity * 0.18}
        stroke={paint.stroke}
        strokeWidth={layer.strokeWidth * 0.7}
        strokeOpacity={opacity * 0.82}
        transform={`rotate(${angle} ${cx} ${cy})`}
      />
    );
  });
};

const renderShards = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(4, Math.round(4 + (layer.detail * layer.density)));
  return Array.from({ length: count }, (_, index) => {
    const cx = viewport.minX + (rand() * viewport.width);
    const cy = viewport.minY + (rand() * viewport.height);
    const points = Array.from({ length: 3 + Math.round(rand() * 2) }, () => (
      `${(cx + ((rand() - 0.5) * viewport.width * 0.32)).toFixed(2)},${(cy + ((rand() - 0.5) * viewport.height * 0.32)).toFixed(2)}`
    )).join(' ');
    return <polygon key={`shard-${index}`} points={points} fill={paint.fill} fillOpacity={opacity * 0.14} stroke={paint.stroke} strokeWidth={layer.strokeWidth * 0.7} strokeOpacity={opacity * 0.82} />;
  });
};

const renderWeave = (layer, viewport, paint, rand, opacity) => (
  [...renderLines(layer, viewport, paint, rand, opacity * 0.92), ...renderLines({ ...layer, rotate: (layer.rotate ?? 0) + 90 }, viewport, paint, rand, opacity * 0.52)]
);

const renderNodes = (layer, viewport, paint, rand, opacity) => {
  const count = Math.max(4, Math.round(4 + (layer.detail * layer.density)));
  const points = Array.from({ length: count }, () => ({
    x: viewport.minX + (rand() * viewport.width),
    y: viewport.minY + (rand() * viewport.height),
    r: viewport.width * (0.018 + rand() * 0.03),
  }));
  const elements = [];
  points.forEach((point, index) => {
    const next = points[index + 1];
    if (next) {
      elements.push(<line key={`node-line-${index}`} x1={point.x} y1={point.y} x2={next.x} y2={next.y} stroke={paint.stroke} strokeWidth={layer.strokeWidth * 0.6} strokeOpacity={opacity * 0.48} />);
    }
    elements.push(<circle key={`node-${index}`} cx={point.x} cy={point.y} r={point.r} fill={paint.fill} fillOpacity={opacity * 0.22} stroke={paint.stroke} strokeWidth={layer.strokeWidth * 0.7} strokeOpacity={opacity} />);
  });
  return elements;
};

const RENDERERS = {
  lines: renderLines,
  contours: renderContours,
  rings: renderRings,
  arcs: renderArcs,
  burst: renderBurst,
  grid: renderGrid,
  petals: renderPetals,
  shards: renderShards,
  weave: renderWeave,
  nodes: renderNodes,
};

const sanitizeMarkup = (markup = '') => markup
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
  .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');

export const PatternBackgroundSvg = ({ patternLayers = [], seed = 0 }) => {
  const svgId = useId();

  const { defs, elements } = useMemo(() => {
    const nextDefs = [];
    const nextElements = [];

    patternLayers.forEach((patternLayer, outerIndex) => {
      const preset = patternLayer.preset || getAutoPatternPreset(patternLayer.habitId || `${seed}-${outerIndex}`);
      const baseColor = patternLayer.color || '#ffffff';
      const accentColor = resolveAccentColor(baseColor);
      const layerElements = [];

      (preset.layers || []).forEach((layer, innerIndex) => {
        if (layer.visible === false) return;

        const layerId = `${svgId}-${outerIndex}-${innerIndex}`;
        const color = layer.colorMode === 'accent'
          ? accentColor
          : layer.colorMode === 'custom'
            ? (layer.customColor || '#ffffff')
            : baseColor;
        const paint = createPaint(layerId, color, accentColor, layer.useGradient);
        const mask = buildMask(layer.mask, `${layerId}-mask`);
        const opacity = clamp((layer.opacity ?? 1) * (patternLayer.opacityMultiplier ?? 1), 0, 1);
        const rand = createSeededRandomGenerator((patternLayer.seed ?? seed) + innerIndex + 1);
        const viewport = getViewport(layer);

        nextDefs.push(...paint.defs);
        if (mask) nextDefs.push(mask);

        if (layer.type === 'imported-svg' && layer.svgMarkup) {
          layerElements.push(
            <g
              key={layerId}
              transform={buildTransform(layer, patternLayer.scaleMultiplier ?? 1)}
              mask={mask ? `url(#${layerId}-mask)` : undefined}
              style={{ mixBlendMode: layer.blendMode, opacity, color }}
            >
              <svg
                x="0"
                y="0"
                width="100"
                height="100"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                dangerouslySetInnerHTML={{ __html: sanitizeMarkup(layer.svgMarkup).replace(/currentColor/g, color) }}
              />
            </g>,
          );
          return;
        }

        const renderer = RENDERERS[layer.generator] || renderLines;
        layerElements.push(
          <g
            key={layerId}
            transform={buildTransform(layer, patternLayer.scaleMultiplier ?? 1)}
            mask={mask ? `url(#${layerId}-mask)` : undefined}
            style={{
              mixBlendMode: layer.blendMode,
              opacity,
              filter: layer.blur > 0 ? `blur(${(layer.blur * 0.32).toFixed(2)}px)` : undefined,
            }}
          >
            {renderer(layer, viewport, paint, rand, opacity)}
          </g>,
        );
      });

      if (layerElements.length > 0) {
        nextElements.push(
          <g
            key={`${svgId}-pattern-layer-${outerIndex}`}
            data-layer-habit-id={patternLayer.habitId || undefined}
          >
            {layerElements}
          </g>,
        );
      }
    });

    return { defs: nextDefs, elements: nextElements };
  }, [patternLayers, seed, svgId]);

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {defs.length > 0 && <defs>{defs}</defs>}
      {elements}
    </svg>
  );
};

const PatternBackground = ({ patternLayers = [], seed = 0, className = '' }) => (
  <div className={className}>
    <PatternBackgroundSvg patternLayers={patternLayers} seed={seed} />
  </div>
);

export default memo(PatternBackground);
