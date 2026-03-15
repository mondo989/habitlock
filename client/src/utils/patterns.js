const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const hashString = (value = '') => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return Math.abs(hash);
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const seededRandom = (seed) => {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const createSeededRandomGenerator = (initialSeed = 0) => {
  let currentSeed = initialSeed;
  return () => {
    currentSeed += 1;
    return seededRandom(currentSeed);
  };
};

export const PATTERN_GENERATOR_OPTIONS = [
  { value: 'lines', label: 'Lines', description: 'Sweeping bands and line fields.' },
  { value: 'contours', label: 'Contours', description: 'Topographic loops and ripples.' },
  { value: 'rings', label: 'Rings', description: 'Concentric halos and offsets.' },
  { value: 'arcs', label: 'Arcs', description: 'Orbital slices and crescents.' },
  { value: 'burst', label: 'Burst', description: 'Radial rays and flares.' },
  { value: 'grid', label: 'Grid', description: 'Architectural grids and tiles.' },
  { value: 'petals', label: 'Petals', description: 'Layered floral blades.' },
  { value: 'shards', label: 'Shards', description: 'Broken polygon clusters.' },
  { value: 'weave', label: 'Weave', description: 'Crossed currents and lattices.' },
  { value: 'nodes', label: 'Nodes', description: 'Constellation dots and links.' },
];

export const BLEND_MODE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'multiply', label: 'Multiply' },
];

export const COLOR_MODE_OPTIONS = [
  { value: 'habit', label: 'Habit Color' },
  { value: 'accent', label: 'Accent' },
  { value: 'custom', label: 'Custom' },
];

export const MASK_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'radial-fade', label: 'Radial Fade' },
  { value: 'vertical-fade', label: 'Vertical Fade' },
  { value: 'diagonal-slice', label: 'Diagonal Slice' },
  { value: 'stripe-window', label: 'Stripe Window' },
];

export const SVG_COLOR_MODE_OPTIONS = [
  { value: 'original', label: 'Original Colors' },
  { value: 'single-tone', label: 'Single Tone' },
  { value: 'stroke-only', label: 'Stroke Only' },
];

const GENERATOR_LOOKUP = PATTERN_GENERATOR_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const AUTO_TEMPLATES = [
  {
    key: 'contour-current',
    name: 'Contour Current',
    layers: [
      { generator: 'contours', opacity: 0.64, density: 1.2, detail: 6, strokeWidth: 1.2, useGradient: true },
      { generator: 'lines', opacity: 0.34, density: 0.9, detail: 5, strokeWidth: 0.8, rotate: -18, blendMode: 'overlay' },
    ],
  },
  {
    key: 'orbital-halo',
    name: 'Orbital Halo',
    layers: [
      { generator: 'rings', opacity: 0.62, density: 1.1, detail: 5, strokeWidth: 1.4, useGradient: true },
      { generator: 'arcs', opacity: 0.42, density: 0.9, detail: 6, strokeWidth: 1.2, rotate: 18 },
    ],
  },
  {
    key: 'signal-grid',
    name: 'Signal Grid',
    layers: [
      { generator: 'grid', opacity: 0.3, density: 1.1, detail: 5, strokeWidth: 0.8 },
      { generator: 'nodes', opacity: 0.42, density: 0.9, detail: 4, strokeWidth: 1.1, blendMode: 'screen' },
    ],
  },
  {
    key: 'petal-burst',
    name: 'Petal Burst',
    layers: [
      { generator: 'petals', opacity: 0.54, density: 1, detail: 5, strokeWidth: 0.9, useGradient: true },
      { generator: 'burst', opacity: 0.28, density: 1.2, detail: 6, strokeWidth: 1.1, blendMode: 'overlay' },
    ],
  },
  {
    key: 'woven-tide',
    name: 'Woven Tide',
    layers: [
      { generator: 'weave', opacity: 0.44, density: 1.15, detail: 5, strokeWidth: 0.95 },
      { generator: 'lines', opacity: 0.22, density: 0.8, detail: 4, strokeWidth: 0.7, rotate: 90 },
    ],
  },
  {
    key: 'prism-shards',
    name: 'Prism Shards',
    layers: [
      { generator: 'shards', opacity: 0.32, density: 1.2, detail: 6, strokeWidth: 0.9, useGradient: true },
      { generator: 'rings', opacity: 0.18, density: 0.75, detail: 4, strokeWidth: 0.8, blendMode: 'overlay' },
    ],
  },
  {
    key: 'flare-grid',
    name: 'Flare Grid',
    layers: [
      { generator: 'grid', opacity: 0.22, density: 0.85, detail: 4, strokeWidth: 0.9 },
      { generator: 'burst', opacity: 0.36, density: 1.15, detail: 7, strokeWidth: 1.2 },
    ],
  },
  {
    key: 'constellation',
    name: 'Constellation',
    layers: [
      { generator: 'nodes', opacity: 0.45, density: 1.1, detail: 6, strokeWidth: 1.1 },
      { generator: 'arcs', opacity: 0.22, density: 0.7, detail: 5, strokeWidth: 0.8, blendMode: 'screen' },
    ],
  },
];

const LEGACY_GENERATOR_MAP = {
  bokeh: 'nodes',
  rings: 'rings',
  mosaic: 'shards',
  geometric: 'grid',
  starburst: 'burst',
  waves: 'contours',
  confetti: 'burst',
};

const DEFAULT_LAYER = {
  id: '',
  type: 'generator',
  generator: 'lines',
  visible: true,
  blendMode: 'screen',
  colorMode: 'habit',
  customColor: '#f8fafc',
  opacity: 0.58,
  scale: 1,
  rotate: 0,
  translateX: 0,
  translateY: 0,
  strokeWidth: 1,
  density: 1,
  detail: 5,
  jitter: 0.24,
  inset: 6,
  blur: 0,
  useGradient: false,
  mask: 'none',
  svgMarkup: '',
  svgColorMode: 'original',
};

const DEFAULT_PRESET = {
  id: '',
  name: 'Preset',
  continuity: false,
  layers: [],
};

const makeLayerId = (index = 0) => `layer_${Date.now()}_${index}`;

export const createPatternLayerDraft = (index = 0, generator = 'lines') => ({
  ...DEFAULT_LAYER,
  id: makeLayerId(index),
  generator,
});

export const createImportedSvgLayerDraft = (index = 0) => ({
  ...DEFAULT_LAYER,
  id: makeLayerId(index),
  type: 'imported-svg',
  generator: 'lines',
  blendMode: 'normal',
  colorMode: 'habit',
  svgColorMode: 'single-tone',
  opacity: 0.82,
  scale: 0.9,
  strokeWidth: 1,
  detail: 4,
  svgMarkup: '<svg viewBox="0 0 100 100"><path d="M15 70 C30 20, 70 20, 85 70" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>',
});

export const createPatternPresetDraft = (index = 0) => ({
  ...DEFAULT_PRESET,
  id: `preset_${Date.now()}_${index}`,
  name: `Preset ${index + 1}`,
  layers: [
    createPatternLayerDraft(index * 2, 'contours'),
    {
      ...createPatternLayerDraft(index * 2 + 1, 'rings'),
      opacity: 0.24,
      density: 0.8,
      detail: 4,
      blendMode: 'overlay',
    },
  ],
});

const normalizeBlendMode = (value) => (
  BLEND_MODE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_LAYER.blendMode
);

const normalizeColorMode = (value) => (
  COLOR_MODE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_LAYER.colorMode
);

const normalizeMask = (value) => (
  MASK_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_LAYER.mask
);

const normalizeSvgColorMode = (value) => (
  SVG_COLOR_MODE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_LAYER.svgColorMode
);

export const normalizePatternLayer = (layer = {}, index = 0) => {
  const nextType = layer.type === 'imported-svg' ? 'imported-svg' : 'generator';
  const nextGenerator = GENERATOR_LOOKUP[layer.generator] ? layer.generator : DEFAULT_LAYER.generator;

  return {
    ...DEFAULT_LAYER,
    ...layer,
    id: typeof layer.id === 'string' && layer.id ? layer.id : makeLayerId(index),
    type: nextType,
    generator: nextGenerator,
    visible: layer.visible !== false,
    blendMode: normalizeBlendMode(layer.blendMode),
    colorMode: normalizeColorMode(layer.colorMode),
    customColor: typeof layer.customColor === 'string' && layer.customColor ? layer.customColor : DEFAULT_LAYER.customColor,
    opacity: clamp(toNumber(layer.opacity, DEFAULT_LAYER.opacity), 0, 1.4),
    scale: clamp(toNumber(layer.scale, DEFAULT_LAYER.scale), 0.35, 2.5),
    rotate: clamp(toNumber(layer.rotate, DEFAULT_LAYER.rotate), -180, 180),
    translateX: clamp(toNumber(layer.translateX, DEFAULT_LAYER.translateX), -60, 60),
    translateY: clamp(toNumber(layer.translateY, DEFAULT_LAYER.translateY), -60, 60),
    strokeWidth: clamp(toNumber(layer.strokeWidth, DEFAULT_LAYER.strokeWidth), 0.3, 4),
    density: clamp(toNumber(layer.density, DEFAULT_LAYER.density), 0.25, 2.4),
    detail: clamp(Math.round(toNumber(layer.detail, DEFAULT_LAYER.detail)), 1, 12),
    jitter: clamp(toNumber(layer.jitter, DEFAULT_LAYER.jitter), 0, 1),
    inset: clamp(toNumber(layer.inset, DEFAULT_LAYER.inset), 0, 28),
    blur: clamp(toNumber(layer.blur, DEFAULT_LAYER.blur), 0, 12),
    useGradient: Boolean(layer.useGradient),
    mask: normalizeMask(layer.mask),
    svgMarkup: typeof layer.svgMarkup === 'string' ? layer.svgMarkup : '',
    svgColorMode: normalizeSvgColorMode(layer.svgColorMode),
  };
};

const migrateLegacyPreset = (preset = {}) => {
  const legacyGenerator = LEGACY_GENERATOR_MAP[preset.family] || 'contours';
  const legacyLayer = normalizePatternLayer({
    id: `${preset.id || 'legacy'}_layer_0`,
    type: 'generator',
    generator: legacyGenerator,
    opacity: preset.opacity ?? 0.58,
    scale: preset.scale ?? 1,
    rotate: preset.rotationDeg ?? 0,
    translateX: preset.translateX ?? 0,
    translateY: preset.translateY ?? 0,
    strokeWidth: preset.strokeWeight ?? 1,
    density: preset.density ?? 1,
    detail: Math.round(
      preset.lineCount
      || preset.ringCount
      || preset.shapeCount
      || preset.rayCount
      || preset.orbCount
      || preset.tileSize / 8
      || 5
    ),
    useGradient: (preset.accentOpacity ?? 0) > 0.55,
    blendMode: (preset.accentOpacity ?? 0) > 0.75 ? 'overlay' : 'screen',
  });

  const migratedLayers = [legacyLayer];

  if ((preset.accentOpacity ?? 0) > 0.3 && legacyGenerator !== 'arcs') {
    migratedLayers.push(normalizePatternLayer({
      id: `${preset.id || 'legacy'}_layer_1`,
      type: 'generator',
      generator: legacyGenerator === 'burst' ? 'arcs' : 'rings',
      opacity: clamp((preset.accentOpacity ?? 0.35) * 0.45, 0.12, 0.52),
      scale: clamp((preset.scale ?? 1) * 1.05, 0.5, 2.5),
      strokeWidth: clamp((preset.strokeWeight ?? 1) * 0.7, 0.3, 4),
      density: clamp((preset.density ?? 1) * 0.85, 0.25, 2.4),
      detail: clamp(Math.round((preset.intensity ?? 2) + 3), 1, 12),
      blendMode: 'overlay',
    }));
  }

  return {
    id: preset.id,
    name: typeof preset.name === 'string' && preset.name ? preset.name : DEFAULT_PRESET.name,
    continuity: Boolean(preset.continuity),
    layers: migratedLayers,
  };
};

export const normalizePatternPreset = (preset = {}, index = 0) => {
  const normalizedInput = Array.isArray(preset.layers)
    ? preset
    : migrateLegacyPreset(preset);

  const layers = Array.isArray(normalizedInput.layers) && normalizedInput.layers.length > 0
    ? normalizedInput.layers.map((layer, layerIndex) => normalizePatternLayer(layer, (index * 10) + layerIndex))
    : [createPatternLayerDraft(index)];

  return {
    ...DEFAULT_PRESET,
    ...normalizedInput,
    id: typeof normalizedInput.id === 'string' && normalizedInput.id ? normalizedInput.id : `preset_${Date.now()}_${index}`,
    name: typeof normalizedInput.name === 'string' && normalizedInput.name ? normalizedInput.name : DEFAULT_PRESET.name,
    continuity: Boolean(normalizedInput.continuity),
    layers,
  };
};

export const normalizePatternConfig = (config = {}) => ({
  presets: Object.entries(config?.presets || {}).reduce((acc, [presetId, preset], index) => {
    acc[presetId] = normalizePatternPreset({ id: presetId, ...preset }, index);
    return acc;
  }, {}),
  emojiAssignments: { ...(config?.emojiAssignments || {}) },
});

export const createPatternConfigClone = (config = {}) => normalizePatternConfig(config);

const resolvePresetById = (presetId, patternConfig) => {
  if (!presetId) return null;

  const preset = patternConfig?.presets?.[presetId];
  return preset ? normalizePatternPreset({ ...preset, id: presetId }) : null;
};

export const getPatternIntensityForDay = (completedCount, totalHabits) => {
  if (completedCount <= 0 || totalHabits <= 0) return 1;
  const completionRatio = completedCount / totalHabits;
  if (completedCount >= 4 || completionRatio >= 0.85) return 3;
  if (completedCount >= 2 || completionRatio >= 0.45) return 2;
  return 1;
};

export const getHabitSeedOffset = (habitId) => {
  if (!habitId) return 0;
  return hashString(`${habitId}_seed`) % 10000;
};

export const getPatternForHabit = (habitId) => {
  if (!habitId) return AUTO_TEMPLATES[0].key;
  return AUTO_TEMPLATES[hashString(habitId) % AUTO_TEMPLATES.length].key;
};

export const getPatternIdentityForHabit = (habitId) => {
  const template = AUTO_TEMPLATES[hashString(habitId || '') % AUTO_TEMPLATES.length] || AUTO_TEMPLATES[0];
  return {
    family: template.layers[0]?.generator || 'lines',
    variant: template.key,
  };
};

const createAutoPresetFromTemplate = (template, habitId) => normalizePatternPreset({
  id: `auto_${habitId}`,
  name: template.name,
  continuity: false,
  layers: template.layers.map((layer, index) => ({
    ...DEFAULT_LAYER,
    ...layer,
    id: `${template.key}_${index}`,
    type: 'generator',
  })),
});

export const getAutoPatternPreset = (habitId) => {
  const template = AUTO_TEMPLATES[hashString(habitId || '') % AUTO_TEMPLATES.length] || AUTO_TEMPLATES[0];
  return createAutoPresetFromTemplate(template, habitId || 'default');
};

const estimateImportedSvgNodes = (markup = '') => {
  if (!markup) return 0;
  const tagMatches = markup.match(/<(path|circle|ellipse|line|polyline|polygon|rect|g)\b/gi) || [];
  return tagMatches.length;
};

export const estimatePatternLayerImpact = (layer = {}) => {
  if (layer.type === 'imported-svg') {
    const nodeCount = estimateImportedSvgNodes(layer.svgMarkup);
    return {
      nodeCount,
      warnings: [
        ...(nodeCount > 60 ? ['Large imported SVG structure.'] : []),
        ...((/<filter\b/i.test(layer.svgMarkup) || /<mask\b/i.test(layer.svgMarkup)) ? ['Imported SVG uses filter or mask markup.'] : []),
      ],
    };
  }

  const detail = toNumber(layer.detail, DEFAULT_LAYER.detail);
  const density = toNumber(layer.density, DEFAULT_LAYER.density);
  const generator = layer.generator || DEFAULT_LAYER.generator;

  let nodeCount = 24;
  switch (generator) {
    case 'grid':
      nodeCount = detail * detail * density * 2.4;
      break;
    case 'nodes':
      nodeCount = detail * density * 10;
      break;
    case 'shards':
      nodeCount = detail * density * 7;
      break;
    case 'weave':
    case 'lines':
    case 'contours':
      nodeCount = detail * density * 8;
      break;
    case 'burst':
      nodeCount = detail * density * 11;
      break;
    case 'petals':
      nodeCount = detail * density * 6;
      break;
    case 'rings':
    case 'arcs':
    default:
      nodeCount = detail * density * 6.5;
      break;
  }

  const warnings = [];
  if ((layer.blur ?? 0) > 0) warnings.push('Blur adds paint cost.');
  if (layer.mask && layer.mask !== 'none') warnings.push('Masking adds compositing work.');
  if (layer.useGradient) warnings.push('Gradient paint increases layer cost.');
  if (nodeCount > 90) warnings.push('High node estimate for this layer.');

  return {
    nodeCount: Math.round(nodeCount),
    warnings,
  };
};

export const assessPatternPerformance = (preset = {}) => {
  const visibleLayers = (preset.layers || []).filter((layer) => layer.visible !== false);
  const reasons = [];
  let nodeCount = 0;

  visibleLayers.forEach((layer) => {
    const estimate = estimatePatternLayerImpact(layer);
    nodeCount += estimate.nodeCount;
    reasons.push(...estimate.warnings);
  });

  if (visibleLayers.length > 4) {
    reasons.push('Many visible layers in one preset.');
  }

  const uniqueReasons = [...new Set(reasons)];
  let level = 'safe';
  if (nodeCount >= 260 || uniqueReasons.length >= 4) {
    level = 'danger';
  } else if (nodeCount >= 150 || uniqueReasons.length >= 2) {
    level = 'watch';
  }

  return {
    level,
    nodeCount,
    reasons: uniqueReasons,
  };
};

export const getPatternOverrideForHabit = (habit, patternConfig) => {
  const directPreset = resolvePresetById(habit?.patternPresetId, patternConfig);
  if (directPreset) {
    return directPreset;
  }

  if (!habit?.emoji || !patternConfig?.emojiAssignments) {
    return null;
  }

  const presetId = patternConfig.emojiAssignments[habit.emoji];
  return resolvePresetById(presetId, patternConfig);
};

export const getGeneratorLabel = (generator) => (
  GENERATOR_LOOKUP[generator]?.label || generator
);

export const getGeneratorDescription = (generator) => (
  GENERATOR_LOOKUP[generator]?.description || ''
);

export const resolveGeneratorForLegacyPatternType = (patternType) => (
  LEGACY_GENERATOR_MAP[patternType] || (GENERATOR_LOOKUP[patternType] ? patternType : 'contours')
);

export const resolveAccentColor = (hex = '#ffffff') => {
  const value = hex.replace('#', '');
  if (!/^[A-Fa-f0-9]{6}$/.test(value)) return '#ffffff';
  const channel = (offset) => parseInt(value.slice(offset, offset + 2), 16);
  const mix = (base) => Math.round(base + ((255 - base) * 0.48));
  return `#${[mix(channel(0)), mix(channel(2)), mix(channel(4))]
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('')}`;
};
