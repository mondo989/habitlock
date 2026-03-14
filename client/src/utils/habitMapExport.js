import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import dayjs from 'dayjs';
import { PatternBackgroundSvg } from '../components/PatternBackground';
import logoUrl from '../assets/habit-lock-logo.svg';
import { buildCalendarCellVisuals } from './calendarCellVisuals';
import { generateCalendarMatrix } from './dateUtils';

const CANVAS_SIZE = 1080;
const YEAR_GRID_COLUMNS = 3;
const YEAR_GRID_ROWS = 4;

const createSeedFromString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const normalized = hex.trim().replace('#', '');
  if (!/^[A-Fa-f0-9]{3}$|^[A-Fa-f0-9]{6}$/.test(normalized)) return null;

  const full = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const value = parseInt(full, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbaFromHex = (hex, alpha = 1) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(99, 102, 241, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mixColors = (colors) => {
  const valid = colors.map(hexToRgb).filter(Boolean);
  if (!valid.length) return { r: 99, g: 102, b: 241 };

  const totals = valid.reduce((acc, color) => ({
    r: acc.r + color.r,
    g: acc.g + color.g,
    b: acc.b + color.b,
  }), { r: 0, g: 0, b: 0 });

  return {
    r: Math.round(totals.r / valid.length),
    g: Math.round(totals.g / valid.length),
    b: Math.round(totals.b / valid.length),
  };
};

const mixColorsWeighted = (entries) => {
  const valid = entries
    .map(({ color, weight = 1 }) => {
      const rgb = hexToRgb(color);
      if (!rgb) return null;
      return {
        ...rgb,
        weight: Math.max(0, weight),
      };
    })
    .filter(Boolean);

  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return { r: 99, g: 102, b: 241 };

  const totals = valid.reduce((acc, color) => ({
    r: acc.r + (color.r * color.weight),
    g: acc.g + (color.g * color.weight),
    b: acc.b + (color.b * color.weight),
  }), { r: 0, g: 0, b: 0 });

  return {
    r: Math.round(totals.r / totalWeight),
    g: Math.round(totals.g / totalWeight),
    b: Math.round(totals.b / totalWeight),
  };
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const patternImageCache = new Map();

const encodeSvgDataUrl = (markup) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

const getPatternImage = async (patternLayers, seed) => {
  if (!patternLayers?.length) return null;

  const cacheKey = JSON.stringify({
    seed,
    patternLayers: patternLayers.map((layer) => ({
      habitId: layer.habitId,
      color: layer.color,
      seed: layer.seed,
      opacityMultiplier: layer.opacityMultiplier,
      scaleMultiplier: layer.scaleMultiplier,
      preset: layer.preset,
    })),
  });

  if (!patternImageCache.has(cacheKey)) {
    const svgMarkup = renderToStaticMarkup(
      createElement(PatternBackgroundSvg, {
        patternLayers,
        seed,
      }),
    );
    patternImageCache.set(cacheKey, loadImage(encodeSvgDataUrl(svgMarkup)).catch(() => null));
  }

  return patternImageCache.get(cacheKey);
};

const roundRect = (ctx, x, y, width, height, radius) => {
  const r = clamp(radius, 0, Math.min(width, height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawRoundedPanel = (ctx, x, y, width, height, radius, fillStyle, strokeStyle = null) => {
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
};

const drawNoiseTexture = (ctx, width, height, opacity = 0.045, density = 0.0025) => {
  const count = Math.floor(width * height * density);
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const alpha = opacity * (0.35 + Math.random() * 0.65);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
};

const drawStarfield = (ctx, width, height, seedBase, density = 220) => {
  for (let index = 0; index < density; index += 1) {
    const seed = seedBase + index * 17;
    const x = seededRandom(seed) * width;
    const y = seededRandom(seed + 1) * height;
    const radius = 0.35 + (seededRandom(seed + 2) * 1.7);
    const alpha = 0.1 + (seededRandom(seed + 3) * 0.42);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (seededRandom(seed + 4) > 0.9) {
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 4);
      ctx.stroke();
    }
  }
};

const createAngleGradient = (ctx, x, y, width, height, angleDegrees, stops) => {
  const radians = (angleDegrees - 90) * (Math.PI / 180);
  const cx = x + (width / 2);
  const cy = y + (height / 2);
  const halfDiagonal = Math.sqrt((width ** 2) + (height ** 2)) / 2;
  const dx = Math.cos(radians) * halfDiagonal;
  const dy = Math.sin(radians) * halfDiagonal;
  const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  stops.forEach(({ offset, color }) => {
    gradient.addColorStop(offset, color);
  });
  return gradient;
};

const drawCalendarCellBackground = (ctx, cell, backgroundModel) => {
  const { x, y, width, height, isCurrentMonth, date } = cell;

  drawRoundedPanel(
    ctx,
    x,
    y,
    width,
    height,
    0,
    isCurrentMonth ? 'rgba(30, 41, 59, 0.92)' : 'rgba(30, 41, 59, 0.72)',
    'rgba(71, 85, 105, 0.12)',
  );

  if (!isCurrentMonth) {
    return;
  }

  if (!backgroundModel) {
    drawEmptyCellTexture(ctx, cell);
    return;
  }

  ctx.save();
  roundRect(ctx, x, y, width, height, 0);
  ctx.clip();

  ctx.fillStyle = createAngleGradient(ctx, x, y, width, height, backgroundModel.angle2, [
    { offset: 0, color: rgbaFromHex(backgroundModel.primaryColor, backgroundModel.baseOpacity * 0.24) },
    { offset: 1, color: rgbaFromHex(backgroundModel.secondaryColor, backgroundModel.baseOpacity * 0.5) },
  ]);
  ctx.fillRect(x, y, width, height);

  if (backgroundModel.colors.length >= 2) {
    const auroraStops = backgroundModel.colors.map((color, index) => ({
      offset: backgroundModel.colors.length === 1 ? 0 : index / (backgroundModel.colors.length - 1),
      color: rgbaFromHex(color, backgroundModel.baseOpacity * 0.06),
    }));
    auroraStops.push({ offset: 1, color: 'rgba(255,255,255,0)' });
    ctx.fillStyle = createAngleGradient(ctx, x, y, width, height, backgroundModel.angle1, auroraStops);
  } else {
    ctx.fillStyle = createAngleGradient(ctx, x, y, width, height, backgroundModel.angle1, [
      { offset: 0, color: rgbaFromHex(backgroundModel.primaryColor, backgroundModel.baseOpacity * 0.08) },
      { offset: 1, color: rgbaFromHex(backgroundModel.centerGlowColor, backgroundModel.baseOpacity * 0.04) },
    ]);
  }
  ctx.fillRect(x, y, width, height);

  const centerGlow = ctx.createRadialGradient(x + width / 2, y + height / 2, 0, x + width / 2, y + height / 2, Math.max(width, height) * 0.72);
  centerGlow.addColorStop(0, rgbaFromHex(backgroundModel.centerGlowColor, backgroundModel.centerGlowOpacity));
  centerGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(x, y, width, height);

  backgroundModel.orbs.forEach((orb) => {
    const orbX = x + ((orb.x / 100) * width);
    const orbY = y + ((orb.y / 100) * height);
    const radius = Math.max(width, height) * (orb.size / 100);
    const gradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, radius);
    gradient.addColorStop(0, rgbaFromHex(orb.color, orb.opacity));
    gradient.addColorStop(0.38, rgbaFromHex(orb.color, orb.opacity * 0.32));
    gradient.addColorStop(0.72, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(orbX - radius, orbY - radius, radius * 2, radius * 2);
  });

  const edgeGlow = ctx.createRadialGradient(x + width / 2, y + height, 0, x + width / 2, y + height, Math.max(width, height) * 0.75);
  edgeGlow.addColorStop(0, rgbaFromHex(backgroundModel.secondaryColor, backgroundModel.edgeGlowOpacity));
  edgeGlow.addColorStop(0.5, rgbaFromHex(backgroundModel.secondaryColor, backgroundModel.edgeGlowOpacity * 0.25));
  edgeGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(x, y, width, height);

  const sheen = ctx.createLinearGradient(x, y, x + width, y + height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, width, height);

  ctx.restore();
};

const drawEmptyCellTexture = (ctx, cell) => {
  const { x, y, width, height, date } = cell;
  const seed = createSeedFromString(date);

  ctx.save();
  roundRect(ctx, x, y, width, height, 12);
  ctx.clip();

  const wash = ctx.createLinearGradient(x, y, x + width, y + height);
  wash.addColorStop(0, 'rgba(51, 65, 85, 0.18)');
  wash.addColorStop(1, 'rgba(30, 41, 59, 0.08)');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
  const dotStep = Math.max(8, Math.floor(width * 0.22));
  for (let py = y + 6; py < y + height - 4; py += dotStep) {
    for (let px = x + 6; px < x + width - 4; px += dotStep) {
      const jitterX = (seededRandom(seed + px + py) - 0.5) * 1.2;
      const jitterY = (seededRandom(seed + px + py + 9) - 0.5) * 1.2;
      ctx.fillRect(px + jitterX, py + jitterY, 1, 1);
    }
  }

  ctx.restore();
};

const drawColorBleedLandscape = (ctx, board, days, getCellRect, habitById) => {
  ctx.save();
  roundRect(ctx, board.x + 2, board.y + 2, board.width - 4, board.height - 4, 14);
  ctx.clip();

  days.forEach((day) => {
    if (!day.isCurrentMonth || day.completedHabitIds.length === 0) return;
    const rect = getCellRect(day);
    const colors = day.completedHabitIds
      .map((habitId) => habitById.get(habitId)?.color)
      .filter(Boolean);
    if (!colors.length) return;

    const mixed = mixColors(colors);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const radius = Math.max(rect.width, rect.height) * 1.2;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, 0.13)`);
    glow.addColorStop(0.5, `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, 0.055)`);
    glow.addColorStop(1, `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x - radius, rect.y - radius, radius * 2, radius * 2);
  });

  ctx.restore();
};

const computeLongestStreakDetails = (days) => {
  let streak = 0;
  let best = 0;
  let bestEndIndex = -1;

  days.forEach((day, index) => {
    if (day.active) {
      streak += 1;
      if (streak > best) {
        best = streak;
        bestEndIndex = index;
      }
    } else {
      streak = 0;
    }
  });

  if (best <= 0 || bestEndIndex < 0) {
    return { length: 0, dates: [] };
  }

  const startIndex = bestEndIndex - best + 1;
  return {
    length: best,
    dates: days.slice(startIndex, bestEndIndex + 1).map((day) => day.date),
  };
};

const computeTopHabits = (days) => {
  const counts = days.reduce((acc, day) => {
    day.completedHabitIds.forEach((habitId) => {
      acc[habitId] = (acc[habitId] || 0) + 1;
    });
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([habitId, total]) => ({ habitId, total }));
};

const mapTopHabitEntries = (entries, habitById) => entries
  .map(({ habitId, total }) => {
    const habit = habitById.get(habitId);
    if (!habit) return null;
    return {
      habitId,
      name: habit.name,
      color: habit.color,
      total,
    };
  })
  .filter(Boolean);

const buildMonthRenderData = ({
  year,
  month,
  getCompletedHabits,
  habitById,
  calendarMatrix = null,
}) => {
  const matrix = calendarMatrix || generateCalendarMatrix(year, month);
  const monthDays = [];
  const dayCells = [];

  matrix.forEach((week, rowIndex) => {
    week.forEach((day, colIndex) => {
      const completedHabitIds = (getCompletedHabits(day.date) || [])
        .filter((habitId) => habitById.has(habitId));

      if (day.isCurrentMonth) {
        monthDays.push({
          date: day.date,
          completedHabitIds,
          active: completedHabitIds.length > 0,
        });
      }

      dayCells.push({
        ...day,
        rowIndex,
        colIndex,
        completedHabitIds,
      });
    });
  });

  monthDays.sort((a, b) => a.date.localeCompare(b.date));
  const activeDays = monthDays.filter((day) => day.active).length;
  const topHabits = mapTopHabitEntries(computeTopHabits(monthDays), habitById);

  return {
    month,
    year,
    title: dayjs().year(year).month(month).format('MMMM YYYY'),
    shortLabel: dayjs().year(year).month(month).format('MMM').toUpperCase(),
    calendarMatrix: matrix,
    monthDays,
    dayCells,
    topHabits,
    dominantHabit: topHabits[0] || null,
    activityRate: monthDays.length > 0 ? activeDays / monthDays.length : 0,
  };
};

const computePosterStats = (days, habitById) => {
  const activeDays = days.filter((day) => day.active).length;
  const longestStreakDetails = computeLongestStreakDetails(days);
  const topHabits = mapTopHabitEntries(computeTopHabits(days), habitById);
  const topHabitEntry = topHabits[0] || null;

  return {
    activeDays,
    longestStreak: longestStreakDetails.length,
    longestStreakDetails,
    topHabit: topHabitEntry,
    topHabits,
    consistencyScore: days.length > 0
      ? Math.round((activeDays / days.length) * 100)
      : 0,
  };
};

const collectAccentColors = (stats, habits) => {
  const topColors = (stats?.topHabits || []).map((habit) => habit.color).filter(Boolean);
  if (topColors.length > 0) {
    return topColors.slice(0, 4);
  }

  return habits
    .map((habit) => habit.color)
    .filter(Boolean)
    .slice(0, 4);
};

const drawPosterBackdrop = (ctx, accentColors = []) => {
  const bg = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  bg.addColorStop(0, '#050816');
  bg.addColorStop(0.52, '#0b1124');
  bg.addColorStop(1, '#02050d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const cosmicWash = ctx.createRadialGradient(CANVAS_SIZE * 0.18, CANVAS_SIZE * 0.12, 0, CANVAS_SIZE * 0.18, CANVAS_SIZE * 0.12, 460);
  cosmicWash.addColorStop(0, 'rgba(96, 165, 250, 0.14)');
  cosmicWash.addColorStop(1, 'rgba(96, 165, 250, 0)');
  ctx.fillStyle = cosmicWash;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const paletteBlend = mixColorsWeighted(accentColors.map((color, index) => ({
    color,
    weight: Math.max(1, accentColors.length - index),
  })));
  const centerNebula = ctx.createRadialGradient(CANVAS_SIZE * 0.52, CANVAS_SIZE * 0.48, 0, CANVAS_SIZE * 0.52, CANVAS_SIZE * 0.48, 620);
  centerNebula.addColorStop(0, `rgba(${paletteBlend.r}, ${paletteBlend.g}, ${paletteBlend.b}, 0.12)`);
  centerNebula.addColorStop(0.55, `rgba(${paletteBlend.r}, ${paletteBlend.g}, ${paletteBlend.b}, 0.04)`);
  centerNebula.addColorStop(1, `rgba(${paletteBlend.r}, ${paletteBlend.g}, ${paletteBlend.b}, 0)`);
  ctx.fillStyle = centerNebula;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  accentColors.forEach((color, index) => {
    const x = 140 + (index % 2) * 620 + (index * 16);
    const y = 170 + Math.floor(index / 2) * 420;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 300);
    glow.addColorStop(0, rgbaFromHex(color, 0.16));
    glow.addColorStop(0.45, rgbaFromHex(color, 0.05));
    glow.addColorStop(1, rgbaFromHex(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  });

  const bottomGlow = ctx.createRadialGradient(920, 940, 0, 920, 940, 360);
  bottomGlow.addColorStop(0, 'rgba(56, 189, 248, 0.11)');
  bottomGlow.addColorStop(1, 'rgba(71, 85, 105, 0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  drawStarfield(ctx, CANVAS_SIZE, CANVAS_SIZE, createSeedFromString(accentColors.join('|') || 'habitlock-stars'));
  drawNoiseTexture(ctx, CANVAS_SIZE, CANVAS_SIZE, 0.024, 0.0015);
};

const drawPosterHeader = (ctx, title, subtitle) => {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.76)';
  ctx.font = '700 22px "Inter","SF Pro Display",sans-serif';
  ctx.fillText(title.toUpperCase(), 76, 78);
  ctx.fillStyle = 'rgba(248, 250, 252, 0.98)';
  ctx.font = subtitle.length <= 6
    ? '700 78px "Inter","SF Pro Display",sans-serif'
    : '700 56px "Inter","SF Pro Display",sans-serif';
  ctx.fillText(subtitle, 76, 142);
};

const drawStatsRow = (ctx, stats, y) => {
  const summaryWidth = (CANVAS_SIZE - 152 - 24) / 3;
  const summaryTitles = ['Active Days', 'Longest Streak', 'Top Habit'];
  const summaryValues = [
    `${stats.activeDays}`,
    `${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`,
    stats.topHabit ? stats.topHabit.name : 'No completed habits yet',
  ];

  summaryTitles.forEach((title, index) => {
    const x = 76 + index * (summaryWidth + 12);
    drawRoundedPanel(
      ctx,
      x,
      y,
      summaryWidth,
      136,
      14,
      'rgba(7, 12, 25, 0.58)',
      'rgba(148, 163, 184, 0.16)',
    );

    if (index < 2) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(248, 250, 252, 0.98)';
      ctx.font = '700 54px "Inter","SF Pro Display",sans-serif';
      ctx.fillText(summaryValues[index], x + 16, y + 72);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.82)';
      ctx.font = '600 13px "Inter","SF Pro Display",sans-serif';
      ctx.fillText(title, x + 18, y + 106);
      return;
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.82)';
    ctx.font = '600 13px "Inter","SF Pro Display",sans-serif';
    ctx.fillText(title, x + 18, y + 32);
    ctx.fillStyle = stats.topHabit?.color || 'rgba(241, 245, 249, 0.96)';
    ctx.font = '700 16px "Inter","SF Pro Display",sans-serif';

    const maxWidth = summaryWidth - 36;
    const words = summaryValues[index].split(' ');
    const lines = [];
    let current = '';

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);

    lines.slice(0, 3).forEach((line, lineIndex) => {
      ctx.fillText(line, x + 18, y + 66 + lineIndex * 22);
    });
  });
};

const drawMonthDensityGlow = (ctx, { x, y, width, height, color, density, variant }) => {
  if (!color || density <= 0) return;

  const cx = x + (width / 2);
  const cy = y + (height / 2);
  const radius = Math.max(width, height) * (variant === 'blend' ? 0.74 : 0.88);
  const alpha = variant === 'blend'
    ? 0.1 + (density * 0.18)
    : 0.08 + (density * 0.12);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  glow.addColorStop(0, rgbaFromHex(color, alpha));
  glow.addColorStop(0.55, rgbaFromHex(color, alpha * 0.25));
  glow.addColorStop(1, rgbaFromHex(color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 0.2, y - radius * 0.2, width + radius * 0.4, height + radius * 0.4);
};

const drawBrandFooter = (ctx, logoImage) => {
  const logoSize = 18;
  const gap = 8;
  const topLine = 'Generated with';
  const brandName = 'HabitLock';

  ctx.save();
  ctx.font = '600 15px "Inter","SF Pro Display",sans-serif';
  const topLineWidth = ctx.measureText(topLine).width;
  ctx.font = '700 16px "Inter","SF Pro Display",sans-serif';
  const brandWidth = ctx.measureText(brandName).width;
  const totalWidth = topLineWidth + gap + logoSize + gap + brandWidth;
  const startX = (CANVAS_SIZE - totalWidth) / 2;
  const baselineY = 1028;

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(203, 213, 225, 0.72)';
  ctx.font = '600 15px "Inter","SF Pro Display",sans-serif';
  ctx.fillText(topLine, startX, baselineY);

  const logoX = startX + topLineWidth + gap;
  if (logoImage) {
    ctx.drawImage(logoImage, logoX, baselineY - 15, logoSize, logoSize);
  } else {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.92)';
    ctx.beginPath();
    ctx.arc(logoX + (logoSize / 2), baselineY - 6, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
  ctx.font = '700 16px "Inter","SF Pro Display",sans-serif';
  ctx.fillText(brandName, logoX + logoSize + gap, baselineY);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.68)';
  ctx.font = '500 14px "Inter","SF Pro Display",sans-serif';
  ctx.fillText('habitlock.org', CANVAS_SIZE / 2, 1048);
  ctx.restore();
};

const drawPosterFooter = (ctx, consistencyScore, logoImage = null) => {
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.84)';
  ctx.font = '600 15px "Inter","SF Pro Display",sans-serif';
  ctx.fillText(`Consistency Score: ${consistencyScore}%`, 76, 1028);
  drawBrandFooter(ctx, logoImage);
};

const drawCalendarPanel = async (
  ctx,
  {
    x,
    y,
    width,
    height,
    habits,
    monthData,
    habitById,
    habitProgressByDate = {},
    showDayNumbers = false,
    showWeekdayHeaders = false,
    label = '',
    variant = 'panel',
  },
) => {
  const accentColor = monthData.dominantHabit?.color || '#7dd3fc';
  drawMonthDensityGlow(ctx, {
    x,
    y,
    width,
    height,
    color: accentColor,
    density: monthData.activityRate,
    variant,
  });

  if (variant === 'panel') {
    drawRoundedPanel(
      ctx,
      x,
      y,
      width,
      height,
      16,
      'rgba(15, 23, 42, 0.76)',
      'rgba(148, 163, 184, 0.14)',
    );
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, 0.38)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(248,250,252,0.04)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, 16);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    roundRect(ctx, x, y + 10, width, height - 10, 18);
    const wash = ctx.createLinearGradient(x, y, x + width, y + height);
    wash.addColorStop(0, rgbaFromHex(accentColor, 0.04 + (monthData.activityRate * 0.05)));
    wash.addColorStop(1, 'rgba(15, 23, 42, 0.015)');
    ctx.fillStyle = wash;
    ctx.fill();
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = variant === 'blend'
    ? 'rgba(226, 232, 240, 0.48)'
    : 'rgba(226, 232, 240, 0.78)';
  ctx.font = variant === 'blend'
    ? '600 11px "Inter","SF Pro Display",sans-serif'
    : '700 12px "Inter","SF Pro Display",sans-serif';
  ctx.fillText(label, x + (variant === 'blend' ? 4 : 14), y + 20);

  const gridTop = y + (showWeekdayHeaders ? 42 : (variant === 'blend' ? 28 : 34));
  const gridLeft = x + (variant === 'blend' ? 4 : 14);
  const gridWidth = width - (variant === 'blend' ? 8 : 28);
  const gridHeight = height - (gridTop - y) - (variant === 'blend' ? 4 : 14);
  const rows = Math.max(1, monthData.calendarMatrix.length);
  const gap = showDayNumbers ? 2 : 1.5;
  const headerHeight = showWeekdayHeaders ? 14 : 0;
  const cellWidth = (gridWidth - (gap * 6)) / 7;
  const cellHeight = (gridHeight - headerHeight - (gap * (rows - 1))) / rows;
  const getCellRect = (day) => ({
    x: gridLeft + day.colIndex * (cellWidth + gap),
    y: gridTop + headerHeight + day.rowIndex * (cellHeight + gap),
    width: cellWidth,
    height: cellHeight,
  });

  if (showWeekdayHeaders) {
    const headers = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    ctx.font = '600 10px "Inter","SF Pro Display",sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.74)';
    headers.forEach((header, index) => {
      ctx.textAlign = 'center';
      ctx.fillText(
        header,
        gridLeft + index * (cellWidth + gap) + (cellWidth / 2),
        gridTop + 10,
      );
    });
  }

  drawColorBleedLandscape(ctx, { x, y, width, height }, monthData.dayCells, getCellRect, habitById);

  for (const day of monthData.dayCells) {
    const rect = getCellRect(day);
    const cell = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      isCurrentMonth: day.isCurrentMonth,
      date: day.date,
    };

    const visual = buildCalendarCellVisuals({
      date: day.date,
      habits,
      habitById,
      completedHabitIds: day.completedHabitIds,
      habitProgressByDate,
      isPreview: true,
    });

    drawCalendarCellBackground(ctx, cell, visual.backgroundModel);

    if (day.isCurrentMonth && visual.patternLayers.length > 0) {
      const patternImage = await getPatternImage(visual.patternLayers, visual.patternSeed);
      ctx.save();
      roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
      ctx.clip();
      if (patternImage) {
        ctx.drawImage(patternImage, rect.x, rect.y, rect.width, rect.height);
      }
      ctx.restore();
    }

    if (showDayNumbers) {
      ctx.textAlign = 'left';
      ctx.fillStyle = day.isCurrentMonth
        ? 'rgba(226, 232, 240, 0.95)'
        : 'rgba(100, 116, 139, 0.52)';
      ctx.font = '600 9px "Inter","SF Pro Display",sans-serif';
      ctx.fillText(String(day.dayjs.date()), rect.x + 4, rect.y + 10);
    }
  }
};

const toBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Failed to render Habit Map image'));
      return;
    }
    resolve(blob);
  }, 'image/png');
});

export const createHabitMapMonthPosterBlob = async ({
  calendarMatrix,
  habits,
  getCompletedHabits,
  habitProgressByDate = {},
  monthDisplayName,
  year = null,
  month = null,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context is unavailable');
  }

  const anchorDate = calendarMatrix?.flat()?.find((day) => day.isCurrentMonth)?.date || dayjs().format('YYYY-MM-DD');
  const resolvedYear = year ?? dayjs(anchorDate).year();
  const resolvedMonth = month ?? dayjs(anchorDate).month();
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const monthData = buildMonthRenderData({
    year: resolvedYear,
    month: resolvedMonth,
    getCompletedHabits,
    habitById,
    calendarMatrix,
  });
  const stats = computePosterStats(monthData.monthDays, habitById);
  const accentColors = collectAccentColors(stats, habits);
  const logoImage = await loadImage(logoUrl).catch(() => null);

  drawPosterBackdrop(ctx, accentColors);
  drawPosterHeader(ctx, 'My Discipline Map', monthDisplayName.toUpperCase());

  await drawCalendarPanel(ctx, {
    x: 72,
    y: 160,
    width: 936,
    height: 664,
    habits,
    monthData,
    habitById,
    habitProgressByDate,
    showDayNumbers: true,
    showWeekdayHeaders: true,
    label: monthDisplayName.toUpperCase(),
    variant: 'panel',
  });

  drawStatsRow(ctx, stats, 846);
  drawPosterFooter(ctx, stats.consistencyScore, logoImage);

  return toBlob(canvas);
};

export const createHabitMapYearPosterBlob = async ({
  year,
  habits,
  getCompletedHabits,
  habitProgressByDate = {},
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context is unavailable');
  }

  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const monthsData = Array.from({ length: 12 }, (_, monthIndex) => (
    buildMonthRenderData({
      year,
      month: monthIndex,
      getCompletedHabits,
      habitById,
    })
  ));
  const stats = computePosterStats(
    monthsData.flatMap((monthData) => monthData.monthDays),
    habitById,
  );
  const accentColors = collectAccentColors(stats, habits);
  const logoImage = await loadImage(logoUrl).catch(() => null);

  drawPosterBackdrop(ctx, accentColors);
  drawPosterHeader(ctx, 'My Discipline Map', String(year));

  const gridX = 72;
  const gridY = 160;
  const gridWidth = 936;
  const gridHeight = 660;
  const gapX = 12;
  const gapY = 12;
  const panelWidth = (gridWidth - gapX * (YEAR_GRID_COLUMNS - 1)) / YEAR_GRID_COLUMNS;
  const panelHeight = (gridHeight - gapY * (YEAR_GRID_ROWS - 1)) / YEAR_GRID_ROWS;

  for (const [index, monthData] of monthsData.entries()) {
    const col = index % YEAR_GRID_COLUMNS;
    const row = Math.floor(index / YEAR_GRID_COLUMNS);
    const x = gridX + col * (panelWidth + gapX);
    const y = gridY + row * (panelHeight + gapY);

    await drawCalendarPanel(ctx, {
      x,
      y,
      width: panelWidth,
      height: panelHeight,
      habits,
      monthData,
      habitById,
      habitProgressByDate,
      showDayNumbers: false,
      showWeekdayHeaders: false,
      label: monthData.shortLabel,
      variant: 'blend',
    });
  }

  drawStatsRow(ctx, stats, 848);
  drawPosterFooter(ctx, stats.consistencyScore, logoImage);

  return toBlob(canvas);
};

export const createHabitMapPosterBlob = async ({
  view = 'month',
  calendarMatrix,
  habits,
  getCompletedHabits,
  habitProgressByDate = {},
  monthDisplayName,
  year = null,
  month = null,
}) => {
  if (view === 'year') {
    return createHabitMapYearPosterBlob({
      year: year ?? dayjs().year(),
      habits,
      getCompletedHabits,
      habitProgressByDate,
    });
  }

  return createHabitMapMonthPosterBlob({
    calendarMatrix,
    habits,
    getCompletedHabits,
    habitProgressByDate,
    monthDisplayName,
    year,
    month,
  });
};

const downloadBlob = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};

export const downloadHabitMapPoster = async ({
  view = 'month',
  calendarMatrix,
  habits,
  getCompletedHabits,
  habitProgressByDate = {},
  monthDisplayName,
  year = null,
  month = null,
  filename = null,
}) => {
  const blob = await createHabitMapPosterBlob({
    view,
    calendarMatrix,
    habits,
    getCompletedHabits,
    habitProgressByDate,
    monthDisplayName,
    year,
    month,
  });

  const fallbackName = view === 'year'
    ? `habit-map-${year}.png`
    : `habit-map-${monthDisplayName.toLowerCase().replace(/\s+/g, '-')}.png`;

  downloadBlob(blob, filename || fallbackName);
};

export const exportHabitMapPoster = downloadHabitMapPoster;

export default exportHabitMapPoster;
