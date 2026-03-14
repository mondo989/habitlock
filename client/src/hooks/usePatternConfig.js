import { useCallback, useEffect, useMemo, useState } from 'react';
import bundledPatternConfig from '../config/patternPresets.json';
import {
  createPatternConfigClone,
  getPatternOverrideForHabit,
  normalizePatternConfig,
} from '../utils/patterns';

const DEV_ENDPOINT = '/__dev/pattern-config';

const usePatternConfig = () => {
  const [patternConfig, setPatternConfig] = useState(() => createPatternConfigClone(bundledPatternConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    if (!import.meta.env.DEV) {
      setPatternConfig(createPatternConfigClone(bundledPatternConfig));
      return;
    }

    try {
      const response = await fetch(DEV_ENDPOINT);
      if (!response.ok) {
        throw new Error(`Failed to load pattern config (${response.status})`);
      }

      const config = await response.json();
      setPatternConfig(normalizePatternConfig(config));
      setError(null);
    } catch (loadError) {
      console.error('Failed to load dev pattern config:', loadError);
      setError(loadError.message);
      setPatternConfig(createPatternConfigClone(bundledPatternConfig));
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async (nextConfig) => {
    const normalizedConfig = normalizePatternConfig(nextConfig);

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
      setPatternConfig(normalizePatternConfig(savedConfig));
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

export { getPatternOverrideForHabit };
export default usePatternConfig;
