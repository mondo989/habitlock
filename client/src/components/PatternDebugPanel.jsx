import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import CalendarCell from './CalendarCell';
import styles from './PatternDebugPanel.module.scss';
import {
  BLEND_MODE_OPTIONS,
  COLOR_MODE_OPTIONS,
  MASK_OPTIONS,
  PATTERN_GENERATOR_OPTIONS,
  SVG_COLOR_MODE_OPTIONS,
  assessPatternPerformance,
  createImportedSvgLayerDraft,
  createPatternConfigClone,
  createPatternLayerDraft,
  createPatternPresetDraft,
  getGeneratorDescription,
  getGeneratorLabel,
  normalizePatternConfig,
  normalizePatternPreset,
} from '../utils/patterns';

const PREVIEW_DAY = {
  date: '2026-03-14',
  dayjs: dayjs('2026-03-14'),
  isCurrentMonth: true,
  isToday: false,
};

const PERFORMANCE_LABELS = {
  safe: 'Fast',
  watch: 'Watch',
  danger: 'Heavy',
};

const LAYER_SLIDERS = [
  { key: 'opacity', label: 'Opacity', min: 0, max: 1.4, step: 0.05 },
  { key: 'scale', label: 'Scale', min: 0.35, max: 2.5, step: 0.05 },
  { key: 'rotate', label: 'Rotate', min: -180, max: 180, step: 1 },
  { key: 'translateX', label: 'Translate X', min: -60, max: 60, step: 1 },
  { key: 'translateY', label: 'Translate Y', min: -60, max: 60, step: 1 },
  { key: 'strokeWidth', label: 'Stroke', min: 0.3, max: 4, step: 0.1 },
  { key: 'density', label: 'Density', min: 0.25, max: 2.4, step: 0.05 },
  { key: 'detail', label: 'Detail', min: 1, max: 12, step: 1 },
  { key: 'jitter', label: 'Jitter', min: 0, max: 1, step: 0.05 },
  { key: 'inset', label: 'Inset', min: 0, max: 28, step: 1 },
  { key: 'blur', label: 'Blur', min: 0, max: 12, step: 0.5 },
];

const randomFromRange = (min, max, step = 1) => {
  const totalSteps = Math.floor((max - min) / step);
  return Number((min + (Math.floor(Math.random() * (totalSteps + 1)) * step)).toFixed(2));
};

const PerformanceBadge = ({ level }) => (
  <span className={`${styles.performanceBadge} ${styles[`performance${level[0].toUpperCase()}${level.slice(1)}`]}`}>
    {PERFORMANCE_LABELS[level] || level}
  </span>
);

const PatternDebugPanel = ({
  habits,
  patternConfig,
  saving,
  error,
  onSaveConfig,
}) => {
  const [status, setStatus] = useState(null);
  const [draftConfig, setDraftConfig] = useState(() => normalizePatternConfig(patternConfig));
  const [expandedPresetId, setExpandedPresetId] = useState(null);
  const [selectedLayerId, setSelectedLayerId] = useState(null);

  useEffect(() => {
    setDraftConfig(normalizePatternConfig(patternConfig));
  }, [patternConfig]);

  const presetList = useMemo(
    () => Object.values(draftConfig?.presets || {}),
    [draftConfig],
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
    return Object.entries(draftConfig?.emojiAssignments || {}).reduce((acc, [emoji, presetId]) => {
      if (!presetId || acc[presetId]) return acc;
      const habit = habitsByEmoji.get(emoji);
      if (habit) acc[presetId] = habit;
      return acc;
    }, {});
  }, [draftConfig, habits]);

  const expandedPreset = presetList.find((preset) => preset.id === expandedPresetId) || null;

  useEffect(() => {
    if (!expandedPreset) {
      setSelectedLayerId(null);
      return;
    }

    const hasSelectedLayer = expandedPreset.layers.some((layer) => layer.id === selectedLayerId);
    if (!hasSelectedLayer) {
      setSelectedLayerId(expandedPreset.layers[0]?.id || null);
    }
  }, [expandedPreset, selectedLayerId]);

  const selectedLayer = expandedPreset?.layers.find((layer) => layer.id === selectedLayerId) || null;

  const previewHabitsForPreset = useMemo(() => presetList.reduce((acc, preset) => {
    const primary = previewHabitByPresetId[preset.id] || habits[0] || null;
    const otherHabits = habits.filter((habit) => habit?.id && habit.id !== primary?.id).slice(0, 2);
    acc[preset.id] = [primary, ...otherHabits].filter(Boolean);
    return acc;
  }, {}), [presetList, previewHabitByPresetId, habits]);

  const commit = (updater) => {
    setDraftConfig((current) => normalizePatternConfig(updater(current)));
  };

  const updatePreset = (presetId, updates) => {
    commit((current) => {
      const nextPresets = { ...(current?.presets || {}) };
      const existingPreset = nextPresets[presetId];
      if (!existingPreset) return current;
      nextPresets[presetId] = normalizePatternPreset({ ...existingPreset, ...updates });
      return {
        ...current,
        presets: nextPresets,
      };
    });
  };

  const updateLayer = (presetId, layerId, updates) => {
    commit((current) => {
      const nextPresets = { ...(current?.presets || {}) };
      const existingPreset = nextPresets[presetId];
      if (!existingPreset) return current;

      nextPresets[presetId] = normalizePatternPreset({
        ...existingPreset,
        layers: existingPreset.layers.map((layer) => (
          layer.id === layerId ? { ...layer, ...updates } : layer
        )),
      });

      return {
        ...current,
        presets: nextPresets,
      };
    });
  };

  const createPreset = () => {
    commit((current) => {
      const nextPreset = createPatternPresetDraft(Object.keys(current?.presets || {}).length);
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
        if (assignedPresetId === presetId) delete nextAssignments[emoji];
      });
      return {
        presets: nextPresets,
        emojiAssignments: nextAssignments,
      };
    });

    if (expandedPresetId === presetId) {
      setExpandedPresetId(null);
    }
  };

  const updateAssignment = (emoji, presetId) => {
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

  const addLayer = (presetId, type = 'generator') => {
    const nextLayer = type === 'imported-svg'
      ? createImportedSvgLayerDraft(Date.now())
      : createPatternLayerDraft(Date.now(), 'lines');

    updatePreset(presetId, {
      layers: [...(draftConfig?.presets?.[presetId]?.layers || []), nextLayer],
    });
    setSelectedLayerId(nextLayer.id);
  };

  const deleteLayer = (presetId, layerId) => {
    const preset = draftConfig?.presets?.[presetId];
    if (!preset || preset.layers.length <= 1) return;

    updatePreset(presetId, {
      layers: preset.layers.filter((layer) => layer.id !== layerId),
    });
  };

  const duplicateLayer = (presetId, layerId) => {
    const preset = draftConfig?.presets?.[presetId];
    const layer = preset?.layers.find((entry) => entry.id === layerId);
    if (!layer) return;

    const duplicate = {
      ...layer,
      id: `${layer.id}_copy_${Date.now()}`,
      translateX: (layer.translateX || 0) + 6,
      translateY: (layer.translateY || 0) + 6,
    };

    updatePreset(presetId, {
      layers: [...preset.layers, duplicate],
    });
    setSelectedLayerId(duplicate.id);
  };

  const moveLayer = (presetId, layerId, direction) => {
    const preset = draftConfig?.presets?.[presetId];
    if (!preset) return;

    const currentIndex = preset.layers.findIndex((layer) => layer.id === layerId);
    const nextIndex = currentIndex + direction;
    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= preset.layers.length) return;

    const nextLayers = [...preset.layers];
    [nextLayers[currentIndex], nextLayers[nextIndex]] = [nextLayers[nextIndex], nextLayers[currentIndex]];
    updatePreset(presetId, { layers: nextLayers });
  };

  const randomizePreset = (presetId) => {
    const preset = draftConfig?.presets?.[presetId];
    if (!preset) return;

    const layerCount = Math.min(4, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const nextLayers = Array.from({ length: layerCount }, (_, index) => {
      const generator = PATTERN_GENERATOR_OPTIONS[Math.floor(Math.random() * PATTERN_GENERATOR_OPTIONS.length)]?.value || 'lines';
      return {
        ...createPatternLayerDraft(index, generator),
        blendMode: BLEND_MODE_OPTIONS[Math.floor(Math.random() * BLEND_MODE_OPTIONS.length)]?.value || 'screen',
        colorMode: Math.random() > 0.7 ? 'accent' : 'habit',
        opacity: randomFromRange(0.18, 0.92, 0.02),
        scale: randomFromRange(0.55, 1.8, 0.05),
        rotate: randomFromRange(-120, 120, 1),
        translateX: randomFromRange(-22, 22, 1),
        translateY: randomFromRange(-22, 22, 1),
        strokeWidth: randomFromRange(0.4, 2.6, 0.1),
        density: randomFromRange(0.45, 1.8, 0.05),
        detail: randomFromRange(3, 9, 1),
        jitter: randomFromRange(0, 0.75, 0.05),
        inset: randomFromRange(2, 14, 1),
        blur: Math.random() > 0.78 ? randomFromRange(0.5, 4, 0.5) : 0,
        useGradient: Math.random() > 0.45,
        mask: Math.random() > 0.7 ? MASK_OPTIONS[Math.floor(Math.random() * (MASK_OPTIONS.length - 1)) + 1]?.value || 'none' : 'none',
      };
    });

    updatePreset(presetId, { layers: nextLayers });
    setStatus(`Randomized ${preset.name || presetId}.`);
  };

  const handleSave = async () => {
    const success = await onSaveConfig(createPatternConfigClone(draftConfig));
    setStatus(success ? 'Saved pattern config.' : 'Save failed.');
  };

  const handleSavePreset = async (presetId) => {
    const presetName = draftConfig?.presets?.[presetId]?.name || presetId;
    const success = await onSaveConfig(createPatternConfigClone(draftConfig));
    setStatus(success ? `Saved ${presetName}.` : `Save failed for ${presetName}.`);
  };

  const buildSinglePreviewConfig = (preset, previewHabit) => (
    previewHabit ? {
      ...draftConfig,
      presets: {
        ...(draftConfig?.presets || {}),
        [preset.id]: preset,
      },
      emojiAssignments: {
        ...(draftConfig?.emojiAssignments || {}),
        [previewHabit.emoji]: preset.id,
      },
    } : draftConfig
  );

  return (
    <div className={styles.debugPanel}>
      <div className={styles.panelBody}>
        <div className={styles.panelHeader}>
          <p>Layered static SVG presets for calendar days. Edit layers visually, paste imported SVG markup when needed, and watch for performance badges before saving.</p>
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
          <div className={styles.sectionHeader}>
            <h3>Habit Assignments</h3>
            <p>Emoji mapping stays intact. Assign a preset or leave it on Auto.</p>
          </div>
          <div className={styles.assignmentGrid}>
            {uniqueHabitEmojis.map((emoji) => (
              <div key={emoji} className={styles.assignmentCard}>
                <div className={styles.assignmentHabit}>
                  <span className={styles.assignmentEmoji}>{emoji}</span>
                  <div className={styles.assignmentMeta}>Set preset</div>
                </div>
                <select
                  className={styles.select}
                  value={draftConfig?.emojiAssignments?.[emoji] || ''}
                  onChange={(event) => updateAssignment(emoji, event.target.value)}
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
            <div>
              <h3>Preset Library</h3>
              <p>Each preset is a layered day pattern that can stack with other completed habits.</p>
            </div>
            <button className={styles.presetHeaderButton} onClick={createPreset}>
              New Preset
            </button>
          </div>

          <div className={styles.presetButtonRow}>
            {presetList.map((preset) => {
              const previewHabit = previewHabitByPresetId[preset.id] || habits[0] || null;
              const performance = assessPatternPerformance(preset);
              const previewPatternConfig = buildSinglePreviewConfig(preset, previewHabit);
              const isExpanded = expandedPresetId === preset.id;

              return (
                <div key={preset.id} className={styles.presetChipCard}>
                  <button
                    type="button"
                    className={`${styles.presetChip} ${isExpanded ? styles.presetChipActive : ''}`}
                    onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                  >
                    <span className={styles.presetChipPreview}>
                      {previewHabit && (
                        <CalendarCell
                          day={PREVIEW_DAY}
                          habits={habits}
                          patternConfig={previewPatternConfig}
                          completedHabits={[previewHabit.id]}
                          onHabitDetailClick={() => {}}
                          onDayClick={() => {}}
                          onDayHabitsClick={() => {}}
                          hasHabitMetWeeklyGoal={() => false}
                          isCurrentMonth={true}
                          isToday={false}
                          animationIndex={0}
                          calendarEntries={{}}
                          hoveredHabitId={null}
                          patternType="mixed"
                          isPreview={true}
                          previewScale="month"
                          previewOverrides={{ [previewHabit.id]: preset }}
                          animatePatterns={false}
                          showEmojis={false}
                          disableInteractions={true}
                          disableAnimations={true}
                        />
                      )}
                    </span>
                    <span className={styles.presetChipOverlay} />
                    <span className={styles.presetChipText}>
                      <PerformanceBadge level={performance.level} />
                      <span className={styles.presetChipName}>{preset.name}</span>
                      <span className={styles.presetChipType}>{preset.layers.length} layers</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {expandedPreset && (() => {
            const performance = assessPatternPerformance(expandedPreset);
            const previewHabit = previewHabitByPresetId[expandedPreset.id] || habits[0] || null;
            const compositeHabits = previewHabitsForPreset[expandedPreset.id] || [];
            const previewPatternConfig = buildSinglePreviewConfig(expandedPreset, previewHabit);

            return (
              <div className={styles.presetCard}>
                <div className={styles.presetEditor}>
                  <div className={styles.presetHeader}>
                    <input
                      className={styles.textInput}
                      value={expandedPreset.name}
                      onChange={(event) => updatePreset(expandedPreset.id, { name: event.target.value })}
                    />
                    <div className={styles.presetActionRow}>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => randomizePreset(expandedPreset.id)}
                        disabled={saving}
                      >
                        Randomize
                      </button>
                      <button
                        className={styles.primaryButton}
                        onClick={() => handleSavePreset(expandedPreset.id)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button className={styles.deleteButton} onClick={() => deletePreset(expandedPreset.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className={styles.previewGrid}>
                    <div className={styles.previewPanel}>
                      <div className={styles.previewLabel}>Preset Preview</div>
                      <div className={styles.previewDay}>
                        {previewHabit && (
                          <CalendarCell
                            day={PREVIEW_DAY}
                            habits={habits}
                            patternConfig={previewPatternConfig}
                            completedHabits={[previewHabit.id]}
                            onHabitDetailClick={() => {}}
                            onDayClick={() => {}}
                            onDayHabitsClick={() => {}}
                            hasHabitMetWeeklyGoal={() => false}
                            isCurrentMonth={true}
                            isToday={false}
                            animationIndex={0}
                            calendarEntries={{}}
                          hoveredHabitId={null}
                          patternType="mixed"
                          isPreview={true}
                          previewScale="month"
                          previewOverrides={{ [previewHabit.id]: expandedPreset }}
                          animatePatterns={false}
                          showEmojis={false}
                          disableInteractions={true}
                          disableAnimations={true}
                        />
                        )}
                      </div>
                    </div>

                    <div className={styles.previewPanel}>
                      <div className={styles.previewLabel}>Composite Preview</div>
                      <div className={styles.previewDay}>
                        <CalendarCell
                          day={PREVIEW_DAY}
                          habits={habits}
                          patternConfig={previewPatternConfig}
                          completedHabits={compositeHabits.map((habit) => habit.id)}
                          onHabitDetailClick={() => {}}
                          onDayClick={() => {}}
                          onDayHabitsClick={() => {}}
                          hasHabitMetWeeklyGoal={() => false}
                          isCurrentMonth={true}
                          isToday={false}
                          animationIndex={0}
                          calendarEntries={{}}
                          hoveredHabitId={null}
                          patternType="mixed"
                          isPreview={true}
                          previewScale="month"
                          previewOverrides={previewHabit ? { [previewHabit.id]: expandedPreset } : null}
                          animatePatterns={false}
                          showEmojis={false}
                          disableInteractions={true}
                          disableAnimations={true}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.metaRow}>
                    <label className={`${styles.field} ${styles.checkboxField}`}>
                      <span>Continuity</span>
                      <input
                        type="checkbox"
                        checked={expandedPreset.continuity}
                        onChange={(event) => updatePreset(expandedPreset.id, { continuity: event.target.checked })}
                      />
                    </label>

                    <div className={styles.performancePanel}>
                      <div className={styles.performanceHeader}>
                        <PerformanceBadge level={performance.level} />
                        <span>{performance.nodeCount} estimated nodes</span>
                      </div>
                      {performance.reasons.length > 0 ? (
                        <ul className={styles.performanceList}>
                          {performance.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.performanceCopy}>Current preset is in the fast path.</p>
                      )}
                    </div>
                  </div>

                  <div className={styles.layerToolbar}>
                    <h4>Layers</h4>
                    <div className={styles.layerToolbarActions}>
                      <button className={styles.secondaryButton} onClick={() => addLayer(expandedPreset.id, 'generator')}>
                        Add Generator
                      </button>
                      <button className={styles.secondaryButton} onClick={() => addLayer(expandedPreset.id, 'imported-svg')}>
                        Paste SVG Layer
                      </button>
                    </div>
                  </div>

                  <div className={styles.layerGrid}>
                    {expandedPreset.layers.map((layer, index) => {
                      const layerImpact = assessPatternPerformance({ layers: [layer] });
                      const isSelected = selectedLayerId === layer.id;
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          className={`${styles.layerCard} ${isSelected ? styles.layerCardActive : ''}`}
                          onClick={() => setSelectedLayerId(layer.id)}
                        >
                          <div className={styles.layerCardHeader}>
                            <div>
                              <div className={styles.layerTitle}>{layer.type === 'imported-svg' ? 'Imported SVG' : getGeneratorLabel(layer.generator)}</div>
                              <div className={styles.layerSubtitle}>
                                Layer {index + 1}
                                {layer.type === 'generator' && ` · ${getGeneratorDescription(layer.generator)}`}
                              </div>
                            </div>
                            <PerformanceBadge level={layerImpact.level} />
                          </div>
                          <div className={styles.layerCardMeta}>
                            <span>{layer.visible ? 'Visible' : 'Hidden'}</span>
                            <span>{layer.blendMode}</span>
                            <span>{layer.mask}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedLayer && (
                    <div className={styles.layerEditor}>
                      <div className={styles.layerEditorHeader}>
                        <div>
                          <h4>{selectedLayer.type === 'imported-svg' ? 'Imported SVG Layer' : getGeneratorLabel(selectedLayer.generator)}</h4>
                          <p>Edit properties live. Performance-heavy combinations will surface warnings above.</p>
                        </div>
                        <div className={styles.layerActionRow}>
                          <button className={styles.secondaryButton} onClick={() => moveLayer(expandedPreset.id, selectedLayer.id, -1)}>
                            Move Up
                          </button>
                          <button className={styles.secondaryButton} onClick={() => moveLayer(expandedPreset.id, selectedLayer.id, 1)}>
                            Move Down
                          </button>
                          <button className={styles.secondaryButton} onClick={() => duplicateLayer(expandedPreset.id, selectedLayer.id)}>
                            Duplicate
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => deleteLayer(expandedPreset.id, selectedLayer.id)}
                            disabled={expandedPreset.layers.length <= 1}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className={styles.controlGrid}>
                        {selectedLayer.type === 'generator' && (
                          <label className={styles.field}>
                            <span>Generator</span>
                            <select
                              className={styles.select}
                              value={selectedLayer.generator}
                              onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { generator: event.target.value })}
                            >
                              {PATTERN_GENERATOR_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                        )}

                        <label className={styles.field}>
                          <span>Blend Mode</span>
                          <select
                            className={styles.select}
                            value={selectedLayer.blendMode}
                            onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { blendMode: event.target.value })}
                          >
                            {BLEND_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.field}>
                          <span>Color Source</span>
                          <select
                            className={styles.select}
                            value={selectedLayer.colorMode}
                            onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { colorMode: event.target.value })}
                          >
                            {COLOR_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        {selectedLayer.colorMode === 'custom' && (
                          <label className={styles.field}>
                            <span>Custom Color</span>
                            <input
                              className={styles.colorInput}
                              type="color"
                              value={selectedLayer.customColor}
                              onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { customColor: event.target.value })}
                            />
                          </label>
                        )}

                        <label className={styles.field}>
                          <span>Mask</span>
                          <select
                            className={styles.select}
                            value={selectedLayer.mask}
                            onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { mask: event.target.value })}
                          >
                            {MASK_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        {selectedLayer.type === 'imported-svg' && (
                          <label className={styles.field}>
                            <span>SVG Color Mode</span>
                            <select
                              className={styles.select}
                              value={selectedLayer.svgColorMode}
                              onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { svgColorMode: event.target.value })}
                            >
                              {SVG_COLOR_MODE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                        )}

                        {selectedLayer.type === 'generator' && (
                          <label className={`${styles.field} ${styles.checkboxField}`}>
                            <span>Gradient Paint</span>
                            <input
                              type="checkbox"
                              checked={selectedLayer.useGradient}
                              onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { useGradient: event.target.checked })}
                            />
                          </label>
                        )}

                        <label className={`${styles.field} ${styles.checkboxField}`}>
                          <span>Visible</span>
                          <input
                            type="checkbox"
                            checked={selectedLayer.visible}
                            onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { visible: event.target.checked })}
                          />
                        </label>
                      </div>

                      {selectedLayer.type === 'imported-svg' && (
                        <label className={styles.field}>
                          <span>Paste SVG Markup</span>
                          <textarea
                            className={styles.textArea}
                            value={selectedLayer.svgMarkup}
                            onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { svgMarkup: event.target.value })}
                            spellCheck={false}
                          />
                        </label>
                      )}

                      <div className={styles.sliderGrid}>
                        {LAYER_SLIDERS.map((field) => (
                          <label key={field.key} className={styles.field}>
                            <span>{field.label}: {selectedLayer[field.key]}</span>
                            <input
                              className={styles.rangeInput}
                              type="range"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={selectedLayer[field.key]}
                              onChange={(event) => updateLayer(expandedPreset.id, selectedLayer.id, { [field.key]: Number(event.target.value) })}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default PatternDebugPanel;
