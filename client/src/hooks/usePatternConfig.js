import { useCallback, useEffect, useMemo, useState } from 'react';
import bundledPatternConfig from '../config/patternPresets.json';

const DEV_ENDPOINT = '/__dev/pattern-config';

const cloneConfig = (config) => ({
  presets: { ...(config?.presets || {}) },
  emojiAssignments: { ...(config?.emojiAssignments || {}) },
});

export const getPatternOverrideForHabit = (habit, patternConfig) => {
  if (!habit?.emoji || !patternConfig?.emojiAssignments) {
    return null;
  }

  const presetId = patternConfig.emojiAssignments[habit.emoji];
  if (!presetId) {
    return null;
  }

  const preset = patternConfig.presets?.[presetId];
  return preset ? { ...preset } : null;
};

export const createPatternConfigClone = (config) => cloneConfig(config);

const usePatternConfig = () => {
  const [patternConfig, setPatternConfig] = useState(() => cloneConfig(bundledPatternConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    if (!import.meta.env.DEV) {
      setPatternConfig(cloneConfig(bundledPatternConfig));
      return;
    }

    try {
      const response = await fetch(DEV_ENDPOINT);
      if (!response.ok) {
        throw new Error(`Failed to load pattern config (${response.status})`);
      }

      const config = await response.json();
      setPatternConfig(cloneConfig(config));
      setError(null);
    } catch (loadError) {
      console.error('Failed to load dev pattern config:', loadError);
      setError(loadError.message);
      setPatternConfig(cloneConfig(bundledPatternConfig));
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async (nextConfig) => {
    const normalizedConfig = cloneConfig(nextConfig);

    if (!import.meta.env.DEV) {
      setPatternConfig(normalizedConfig);
      return true;
    }

    setSaving(true);
    try {
      const response = await fetch(DEV_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedConfig, null, 2),
      });

      if (!response.ok) {
        throw new Error(`Failed to save pattern config (${response.status})`);
      }

      const savedConfig = await response.json();
      setPatternConfig(cloneConfig(savedConfig));
      setError(null);
      return true;
    } catch (saveError) {
      console.error('Failed to save dev pattern config:', saveError);
      setError(saveError.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return useMemo(() => ({
    patternConfig,
    saving,
    error,
    saveConfig,
    reloadConfig: loadConfig,
  }), [patternConfig, saving, error, saveConfig, loadConfig]);
};

export default usePatternConfig;
