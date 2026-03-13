import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { BASE_PATTERN_IDS, PATTERN_VARIANTS } from './P5PatternBackground';
import CalendarCell from './CalendarCell';
import styles from './PatternDebugPanel.module.scss';

const createPresetDraft = (index = 0) => ({
  id: `preset_${Date.now()}_${index}`,
  name: `Preset ${index + 1}`,
  family: 'mosaic',
  variant: PATTERN_VARIANTS.mosaic[0],
  intensity: 2,
  continuity: true,
  density: 1,
  scale: 1,
  opacity: 1,
  accentOpacity: 1,
  strokeWeight: 1,
  driftAmount: 1,
  animationMode: 'active',
  entranceStaggerMs: 160,
  tileSize: 32,
  shapeCount: 3,
  ringCount: 4,
  amplitude: 1,
  lineCount: 2,
  orbCount: 4,
  rayCount: 8,
  pieceCount: 6,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  rotationDeg: 0,
});

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getStepDecimals = (step = 1) => {
  const stepText = String(step);
  return stepText.includes('.') ? stepText.split('.')[1].length : 0;
};

const randomValueFromRange = (field) => {
  const min = toNumber(field.min, 0);
  const max = toNumber(field.max, min);
  const step = toNumber(field.step, 1);
  const steps = Math.max(0, Math.floor((max - min) / step));
  const offset = Math.floor(Math.random() * (steps + 1));
  const value = min + (offset * step);
  const decimals = getStepDecimals(step);
  return Number(value.toFixed(decimals));
};

const randomBoolean = () => Math.random() >= 0.5;

const normalizePreset = (preset) => {
  const family = preset.family || 'mosaic';
  const variants = PATTERN_VARIANTS[family] || ['default'];
  const variant = variants.includes(preset.variant) ? preset.variant : variants[0];

  return {
    ...createPresetDraft(),
    ...preset,
    family,
    variant,
    name: typeof preset.name === 'string' ? preset.name : (preset.id || ''),
    intensity: toNumber(preset.intensity, 2),
    continuity: Boolean(preset.continuity),
    density: toNumber(preset.density, 1),
    scale: toNumber(preset.scale, 1),
    opacity: toNumber(preset.opacity, 1),
    accentOpacity: toNumber(preset.accentOpacity, 1),
    strokeWeight: toNumber(preset.strokeWeight, 1),
    driftAmount: toNumber(preset.driftAmount, 1),
    entranceStaggerMs: toNumber(preset.entranceStaggerMs, 160),
    tileSize: toNumber(preset.tileSize, 32),
    shapeCount: toNumber(preset.shapeCount, 3),
    ringCount: toNumber(preset.ringCount, 4),
    amplitude: toNumber(preset.amplitude, 1),
    lineCount: toNumber(preset.lineCount, 2),
    orbCount: toNumber(preset.orbCount, 4),
    rayCount: toNumber(preset.rayCount, 8),
    pieceCount: toNumber(preset.pieceCount, 6),
    translateX: toNumber(preset.translateX, 0),
    translateY: toNumber(preset.translateY, 0),
    translateZ: toNumber(preset.translateZ, 0),
    rotationDeg: toNumber(preset.rotationDeg, 0),
  };
};

const normalizeConfig = (config) => {
  const presets = Object.entries(config?.presets || {}).reduce((acc, [id, preset]) => {
    acc[id] = normalizePreset({ id, ...preset });
    return acc;
  }, {});

  return {
    presets,
    emojiAssignments: { ...(config?.emojiAssignments || {}) },
  };
};

const FIELD_GROUPS = [
  { key: 'density', label: 'Density', min: 0.4, max: 2.2, step: 0.1 },
  { key: 'scale', label: 'Scale', min: 0.5, max: 2, step: 0.1 },
  { key: 'opacity', label: 'Opacity', min: 0.2, max: 1.4, step: 0.05 },
  { key: 'accentOpacity', label: 'Accent', min: 0, max: 1.5, step: 0.05 },
  { key: 'strokeWeight', label: 'Stroke', min: 0.4, max: 2.5, step: 0.1 },
  { key: 'driftAmount', label: 'Drift', min: 0, max: 2, step: 0.1 },
  { key: 'entranceStaggerMs', label: 'Stagger', min: 0, max: 500, step: 20 },
  { key: 'translateX', label: 'Translate X', min: -60, max: 60, step: 1 },
  { key: 'translateY', label: 'Translate Y', min: -60, max: 60, step: 1 },
  { key: 'translateZ', label: 'Translate Z', min: -50, max: 50, step: 1 },
  { key: 'rotationDeg', label: 'Rotate', min: -180, max: 180, step: 1 },
];

const FAMILY_FIELDS = {
  mosaic: [
    { key: 'tileSize', label: 'Tile Size', min: 12, max: 64, step: 2 },
  ],
  geometric: [
    { key: 'shapeCount', label: 'Shape Count', min: 1, max: 8, step: 1 },
  ],
  rings: [
    { key: 'ringCount', label: 'Ring Count', min: 1, max: 8, step: 1 },
  ],
  waves: [
    { key: 'amplitude', label: 'Amplitude', min: 0.4, max: 2, step: 0.1 },
    { key: 'lineCount', label: 'Line Count', min: 1, max: 6, step: 1 },
  ],
  bokeh: [
    { key: 'orbCount', label: 'Orb Count', min: 1, max: 10, step: 1 },
  ],
  starburst: [
    { key: 'rayCount', label: 'Ray Count', min: 4, max: 16, step: 1 },
  ],
  confetti: [
    { key: 'pieceCount', label: 'Piece Count', min: 2, max: 12, step: 1 },
  ],
};

const PatternDebugPanel = ({
  habits,
  patternConfig,
  saving,
  error,
  onSaveConfig,
  calendarMatrix = [],
  getCompletedHabits = () => [],
  calendarEntries = {},
  hasHabitMetWeeklyGoal = () => false,
  patternType = 'mixed',
}) => {
  const [status, setStatus] = useState(null);
  const [previewCellSize, setPreviewCellSize] = useState({ width: 120, height: 120 });
  const [hasMeasuredPreviewCell, setHasMeasuredPreviewCell] = useState(false);
  const [previewLoadingByPreset, setPreviewLoadingByPreset] = useState({});
  const [draftConfig, setDraftConfig] = useState(() => normalizeConfig(patternConfig));
  const [expandedPresetId, setExpandedPresetId] = useState(null);
  const measureHostRef = useRef(null);
  const previewLoadingTimersRef = useRef(new Map());

  useEffect(() => {
    setDraftConfig(normalizeConfig(patternConfig));
  }, [patternConfig]);

  const presetList = useMemo(
    () => Object.values(draftConfig?.presets || {}),
    [draftConfig]
  );
  const uniqueHabitEmojis = useMemo(() => {
    const seen = new Set();
    return habits
      .map((habit) => habit?.emoji)
      .filter((emoji) => {
        if (!emoji || seen.has(emoji)) return false;
        seen.add(emoji);
        return true;
      });
  }, [habits]);
  const previewHabitByPresetId = useMemo(() => {
    const habitsByEmoji = new Map(habits.map((habit) => [habit.emoji, habit]));
    const mapping = {};

    Object.entries(draftConfig?.emojiAssignments || {}).forEach(([emoji, presetId]) => {
      if (!presetId || mapping[presetId]) return;
      const habit = habitsByEmoji.get(emoji);
      if (habit) {
        mapping[presetId] = habit;
      }
    });

    return mapping;
  }, [habits, draftConfig]);
  const previewDay = useMemo(() => ({
    date: '2026-03-14',
    dayjs: dayjs('2026-03-14'),
  }), []);
  const measurementWeek = useMemo(
    () => Array.from({ length: 7 }, (_, index) => ({
      date: dayjs('2026-03-08').add(index, 'day').format('YYYY-MM-DD'),
      dayjs: dayjs('2026-03-08').add(index, 'day'),
      isCurrentMonth: true,
      isToday: false,
    })),
    []
  );
  const fallbackCalendarDay = useMemo(() => {
    for (let row = 0; row < calendarMatrix.length; row++) {
      for (let col = 0; col < calendarMatrix[row].length; col++) {
        const day = calendarMatrix[row][col];
        if (day?.isCurrentMonth) {
          return { day, gridRow: row, gridCol: col };
        }
      }
    }
    return null;
  }, [calendarMatrix]);
  const previewSourceByPresetId = useMemo(() => {
    const lookup = {};
    presetList.forEach((preset) => {
      const habit = previewHabitByPresetId[preset.id] || habits[0];
      if (!habit) return;

      for (let row = 0; row < calendarMatrix.length; row++) {
        let found = false;
        for (let col = 0; col < calendarMatrix[row].length; col++) {
          const day = calendarMatrix[row][col];
          if (!day?.date) continue;
          const completed = getCompletedHabits(day.date) || [];
          if (completed.includes(habit.id)) {
            lookup[preset.id] = {
              day,
              gridRow: row,
              gridCol: col,
              completedHabits: completed,
            };
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!lookup[preset.id] && fallbackCalendarDay) {
        lookup[preset.id] = {
          day: fallbackCalendarDay.day,
          gridRow: fallbackCalendarDay.gridRow,
          gridCol: fallbackCalendarDay.gridCol,
          completedHabits: getCompletedHabits(fallbackCalendarDay.day.date) || [],
        };
      }
    });
    return lookup;
  }, [presetList, previewHabitByPresetId, habits, calendarMatrix, getCompletedHabits, fallbackCalendarDay]);

  useEffect(() => {
    const sourceCell = measureHostRef.current?.querySelector('[data-calendar-cell="true"]');
    if (!sourceCell) return undefined;

    const updateSize = () => {
      const rect = sourceCell.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setHasMeasuredPreviewCell(true);
        setPreviewCellSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(sourceCell);
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [habits.length]);

  useEffect(() => () => {
    previewLoadingTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    previewLoadingTimersRef.current.clear();
  }, []);

  const markPreviewLoading = (presetIds) => {
    if (!presetIds?.length) return;

    setPreviewLoadingByPreset((current) => {
      const next = { ...current };
      presetIds.forEach((presetId) => {
        next[presetId] = true;
      });
      return next;
    });

    presetIds.forEach((presetId) => {
      const existingTimer = previewLoadingTimersRef.current.get(presetId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timerId = setTimeout(() => {
        setPreviewLoadingByPreset((current) => {
          if (!current[presetId]) return current;
          const next = { ...current };
          delete next[presetId];
          return next;
        });
        previewLoadingTimersRef.current.delete(presetId);
      }, 220);

      previewLoadingTimersRef.current.set(presetId, timerId);
    });
  };

  const commit = (updater) => {
    setDraftConfig((current) => normalizeConfig(updater(current)));
  };

  const updatePreset = (presetId, updates) => {
    markPreviewLoading([presetId]);
    commit((current) => {
      const nextPresets = { ...(current?.presets || {}) };
      const existingPreset = nextPresets[presetId];
      if (!existingPreset) return current;
      nextPresets[presetId] = normalizePreset({ ...existingPreset, ...updates });
      return {
        ...current,
        presets: nextPresets,
      };
    });
  };

  const createPreset = () => {
    commit((current) => {
      const nextPreset = createPresetDraft(Object.keys(current?.presets || {}).length);
      return {
        presets: {
          ...(current?.presets || {}),
          [nextPreset.id]: nextPreset,
        },
        emojiAssignments: { ...(current?.emojiAssignments || {}) },
      };
    });
  };

  const deletePreset = (presetId) => {
    commit((current) => {
      const nextPresets = { ...(current?.presets || {}) };
      const nextAssignments = { ...(current?.emojiAssignments || {}) };
      delete nextPresets[presetId];
      Object.entries(nextAssignments).forEach(([emoji, assignedPresetId]) => {
        if (assignedPresetId === presetId) {
          delete nextAssignments[emoji];
        }
      });
      return { presets: nextPresets, emojiAssignments: nextAssignments };
    });
  };

  const updateAssignment = (emoji, presetId) => {
    const assignedPresetIds = Object.keys(draftConfig?.presets || {});
    markPreviewLoading(assignedPresetIds);
    commit((current) => {
      const nextAssignments = { ...(current?.emojiAssignments || {}) };
      if (!presetId) delete nextAssignments[emoji];
      else nextAssignments[emoji] = presetId;
      return {
        presets: { ...(current?.presets || {}) },
        emojiAssignments: nextAssignments,
      };
    });
  };

  const handleSave = async () => {
    const success = await onSaveConfig(draftConfig);
    setStatus(success ? 'Saved pattern config.' : 'Save failed.');
  };

  const handleSavePreset = async (presetId) => {
    const presetName = draftConfig?.presets?.[presetId]?.name || presetId;
    const success = await onSaveConfig(draftConfig);
    setStatus(success ? `Saved ${presetName}.` : `Save failed for ${presetName}.`);
  };

  const randomizePreset = (presetId) => {
    const existing = draftConfig?.presets?.[presetId];
    if (!existing) return;

    const family = BASE_PATTERN_IDS[Math.floor(Math.random() * BASE_PATTERN_IDS.length)] || existing.family;
    const variants = PATTERN_VARIANTS[family] || ['default'];
    const variant = variants[Math.floor(Math.random() * variants.length)] || variants[0];
    const familyFields = FAMILY_FIELDS[family] || [];

    const updates = {
      family,
      variant,
      intensity: 1 + Math.floor(Math.random() * 3),
      continuity: randomBoolean(),
    };

    FIELD_GROUPS.forEach((field) => {
      updates[field.key] = randomValueFromRange(field);
    });

    familyFields.forEach((field) => {
      updates[field.key] = randomValueFromRange(field);
    });

    updatePreset(presetId, updates);
    setStatus(`Randomized ${existing.name || presetId}.`);
  };

  const expandedPreset = presetList.find((preset) => preset.id === expandedPresetId) || null;

  return (
    <div className={styles.debugPanel}>
      <div className={styles.panelBody}>
          <div className={styles.panelHeader}>
            <p>Edits preview live in the calendar. Save writes the current draft to the local JSON config.</p>
            <div className={styles.panelActions}>
              <button className={styles.primaryButton} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Config'}
              </button>
            </div>
          </div>

          {(status || error) && (
            <div className={styles.statusRow}>
              {status && <span>{status}</span>}
              {error && <span className={styles.errorText}>{error}</span>}
            </div>
          )}

          <div className={styles.section}>
            <h3>Habit Assignments</h3>
            <div className={styles.assignmentGrid}>
              {uniqueHabitEmojis.map((emoji) => (
                <div key={emoji} className={styles.assignmentCard}>
                  <div className={styles.assignmentHabit}>
                    <span className={styles.assignmentEmoji}>{emoji}</span>
                    <div>
                      <div className={styles.assignmentMeta}>Set preset</div>
                    </div>
                  </div>
                  <select
                    className={styles.select}
                    value={draftConfig?.emojiAssignments?.[emoji] || ''}
                    onChange={(e) => updateAssignment(emoji, e.target.value)}
                  >
                    <option value="">Auto</option>
                    {presetList.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Preset Library</h3>
              <button className={styles.presetHeaderButton} onClick={createPreset}>
                New Preset
              </button>
            </div>
            <div className={styles.presetButtonRow}>
              {presetList.map((preset) => {
                const isExpanded = expandedPresetId === preset.id;
                const source = previewSourceByPresetId[preset.id];
                const sourceGridRow = source?.gridRow || 0;
                const sourceGridCol = source?.gridCol || 0;
                const sourceDay = source?.day || previewDay;
                const previewHabit = previewHabitByPresetId[preset.id] || habits[0] || null;
                const showPreviewLoading = saving || !hasMeasuredPreviewCell || Boolean(previewLoadingByPreset[preset.id]);
                const previewOverrides = previewHabit ? { [previewHabit.id]: preset } : null;
                const previewPatternConfig = previewHabit ? {
                  ...draftConfig,
                  presets: {
                    ...(draftConfig?.presets || {}),
                    [preset.id]: preset,
                  },
                  emojiAssignments: {
                    ...(draftConfig?.emojiAssignments || {}),
                    [previewHabit.emoji]: preset.id,
                  },
                } : { presets: {}, emojiAssignments: {} };
                const sourceCompleted = previewHabit ? [previewHabit.id] : [];
                const previewRenderKey = [
                  'chip',
                  preset.id,
                  previewHabit?.id || 'none',
                  sourceDay?.date || 'none',
                  preset.family,
                  preset.variant,
                  preset.intensity,
                  preset.continuity ? 1 : 0,
                  preset.density,
                  preset.scale,
                  preset.opacity,
                  preset.accentOpacity,
                  preset.strokeWeight,
                  preset.driftAmount,
                  preset.entranceStaggerMs,
                  preset.tileSize,
                  preset.shapeCount,
                  preset.ringCount,
                  preset.amplitude,
                  preset.lineCount,
                  preset.orbCount,
                  preset.rayCount,
                  preset.pieceCount,
                  preset.translateX,
                  preset.translateY,
                  preset.translateZ,
                  preset.rotationDeg,
                  previewCellSize.width,
                  previewCellSize.height,
                ].join(':');

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetChip} ${isExpanded ? styles.presetChipActive : ''}`}
                    onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                    style={{
                      width: `${previewCellSize.width}px`,
                      height: `${previewCellSize.height}px`,
                      minWidth: `${previewCellSize.width}px`,
                      minHeight: `${previewCellSize.height}px`,
                    }}
                  >
                    <span className={styles.presetChipPreview} aria-hidden="true">
                      {previewHabit ? (
                        <CalendarCell
                          key={previewRenderKey}
                          day={sourceDay}
                          gridRow={sourceGridRow}
                          gridCol={sourceGridCol}
                          habits={habits}
                          patternConfig={previewPatternConfig}
                          completedHabits={sourceCompleted}
                          onHabitDetailClick={() => {}}
                          onDayClick={() => {}}
                          onDayHabitsClick={() => {}}
                          hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                          isCurrentMonth={Boolean(sourceDay?.isCurrentMonth)}
                          isToday={dayjs(sourceDay?.date).isSame(dayjs(), 'day')}
                          animationIndex={0}
                          calendarEntries={calendarEntries}
                          hoveredHabitId={null}
                          patternType={patternType}
                          isPreview={true}
                          previewOverrides={previewOverrides}
                          patternOnly={true}
                        />
                      ) : null}
                    </span>
                    {showPreviewLoading && (
                      <div className={styles.previewLoadingOverlay}>
                        <div className={styles.previewSpinner} />
                      </div>
                    )}
                    <span className={styles.presetChipOverlay} aria-hidden="true" />
                    <span className={styles.presetChipText}>
                      <span className={styles.presetChipName}>{preset.name}</span>
                      <span className={styles.presetChipType}>{preset.family} / {preset.variant}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {expandedPreset && (
              <div className={styles.presetCard}>
                {(() => {
                  const preset = expandedPreset;
                  const variantOptions = PATTERN_VARIANTS[preset.family] || [];
                  const familyFields = FAMILY_FIELDS[preset.family] || [];
                  const previewHabit = previewHabitByPresetId[preset.id] || habits[0] || null;
                  const showPreviewLoading = saving || !hasMeasuredPreviewCell || Boolean(previewLoadingByPreset[preset.id]);
                  const previewOverrides = previewHabit ? { [previewHabit.id]: preset } : null;
                  const previewPatternConfig = previewHabit ? {
                    ...draftConfig,
                    presets: {
                      ...(draftConfig?.presets || {}),
                      [preset.id]: preset,
                    },
                    emojiAssignments: {
                      ...(draftConfig?.emojiAssignments || {}),
                      [previewHabit.emoji]: preset.id,
                    },
                  } : { presets: {}, emojiAssignments: {} };
                  const source = previewSourceByPresetId[preset.id];
                  const sourceDay = source?.day || previewDay;
                  const sourceCompleted = previewHabit ? [previewHabit.id] : [];
                  const sourceGridRow = source?.gridRow || 0;
                  const sourceGridCol = source?.gridCol || 0;
                  const previewRenderKey = [
                    preset.id,
                    previewHabit?.id || 'none',
                    sourceDay?.date || 'none',
                    preset.family,
                    preset.variant,
                    preset.intensity,
                    preset.continuity ? 1 : 0,
                    preset.density,
                    preset.scale,
                    preset.opacity,
                    preset.accentOpacity,
                    preset.strokeWeight,
                    preset.driftAmount,
                    preset.entranceStaggerMs,
                    preset.tileSize,
                    preset.shapeCount,
                    preset.ringCount,
                    preset.amplitude,
                    preset.lineCount,
                    preset.orbCount,
                    preset.rayCount,
                    preset.pieceCount,
                    preset.translateX,
                    preset.translateY,
                    preset.translateZ,
                    preset.rotationDeg,
                    previewCellSize.width,
                    previewCellSize.height,
                  ].join(':');

                  return (
                    <div className={styles.presetEditor}>
                      <div className={styles.presetHeader}>
                        <input
                          className={styles.textInput}
                          value={preset.name}
                          onChange={(e) => updatePreset(preset.id, { name: e.target.value })}
                        />
                        <div className={styles.presetActionRow}>
                          <button
                            className={styles.secondaryButton}
                            onClick={() => randomizePreset(preset.id)}
                            disabled={saving}
                          >
                            Randomize
                          </button>
                          <button
                            className={styles.primaryButton}
                            onClick={() => handleSavePreset(preset.id)}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button className={styles.deleteButton} onClick={() => deletePreset(preset.id)}>
                            Delete
                          </button>
                        </div>
                      </div>

                      <div
                        className={styles.previewDay}
                        style={{
                          width: `${previewCellSize.width}px`,
                          height: `${previewCellSize.height}px`,
                          minWidth: `${previewCellSize.width}px`,
                          minHeight: `${previewCellSize.height}px`,
                        }}
                      >
                        {previewHabit ? (
                          <>
                            <CalendarCell
                              key={previewRenderKey}
                              day={sourceDay}
                              gridRow={sourceGridRow}
                              gridCol={sourceGridCol}
                              habits={habits}
                              patternConfig={previewPatternConfig}
                              completedHabits={sourceCompleted}
                              onHabitDetailClick={() => {}}
                              onDayClick={() => {}}
                              onDayHabitsClick={() => {}}
                              hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                              isCurrentMonth={Boolean(sourceDay?.isCurrentMonth)}
                              isToday={dayjs(sourceDay?.date).isSame(dayjs(), 'day')}
                              animationIndex={0}
                              calendarEntries={calendarEntries}
                              hoveredHabitId={null}
                              patternType={patternType}
                              isPreview={true}
                              previewOverrides={previewOverrides}
                              patternOnly={true}
                            />
                            {showPreviewLoading && (
                              <div className={styles.previewLoadingOverlay}>
                                <div className={styles.previewSpinner} />
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>

                      <div className={styles.presetGrid}>
                        <label className={styles.field}>
                          <span>Family</span>
                          <select
                            className={styles.select}
                            value={preset.family}
                            onChange={(e) => updatePreset(preset.id, {
                              family: e.target.value,
                              variant: PATTERN_VARIANTS[e.target.value]?.[0] || 'default',
                            })}
                          >
                            {BASE_PATTERN_IDS.map((family) => (
                              <option key={family} value={family}>{family}</option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.field}>
                          <span>Variant</span>
                          <select
                            className={styles.select}
                            value={preset.variant}
                            onChange={(e) => updatePreset(preset.id, { variant: e.target.value })}
                          >
                            {variantOptions.map((variant) => (
                              <option key={variant} value={variant}>{variant}</option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.field}>
                          <span>Intensity</span>
                          <select
                            className={styles.select}
                            value={String(preset.intensity)}
                            onChange={(e) => updatePreset(preset.id, { intensity: Number(e.target.value) })}
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
                        </label>

                        <label className={`${styles.field} ${styles.checkboxField}`}>
                          <span>Continuity</span>
                          <input
                            type="checkbox"
                            checked={preset.continuity}
                            onChange={(e) => updatePreset(preset.id, { continuity: e.target.checked })}
                          />
                        </label>
                      </div>

                      <div className={styles.sliderGrid}>
                        {FIELD_GROUPS.map((field) => (
                          <label key={field.key} className={styles.field}>
                            <span>{field.label}: {preset[field.key]}</span>
                            <input
                              className={styles.rangeInput}
                              type="range"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={preset[field.key]}
                              onChange={(e) => updatePreset(preset.id, { [field.key]: Number(e.target.value) })}
                            />
                          </label>
                        ))}
                      </div>

                      {familyFields.length > 0 && (
                        <div className={styles.sliderGrid}>
                          {familyFields.map((field) => (
                            <label key={field.key} className={styles.field}>
                              <span>{field.label}: {preset[field.key]}</span>
                              <input
                                className={styles.rangeInput}
                                type="range"
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={preset[field.key]}
                                onChange={(e) => updatePreset(preset.id, { [field.key]: Number(e.target.value) })}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        <div className={styles.measurementHost} ref={measureHostRef}>
          <div className={styles.measurementWeek}>
            {measurementWeek.map((day, index) => (
              <CalendarCell
                key={day.date}
                day={day}
                gridRow={0}
                gridCol={index}
                habits={habits}
                patternConfig={draftConfig}
                completedHabits={[]}
                onHabitDetailClick={() => {}}
                onDayClick={() => {}}
                onDayHabitsClick={() => {}}
                hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                isCurrentMonth={true}
                isToday={false}
                animationIndex={0}
                calendarEntries={{}}
                hoveredHabitId={null}
                patternType={patternType}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternDebugPanel;
