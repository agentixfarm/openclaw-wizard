import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { SkillMetadata } from '../types/SkillMetadata';
import type { InstalledSkill } from '../types/InstalledSkill';
import type { ScanResult } from '../types/ScanResult';
import type { SkillInstallResponse } from '../types/SkillInstallResponse';

/**
 * Hook managing skills browsing, installation, uninstallation, and VT scanning.
 * Provides debounced search, category filtering, tab switching, and install state tracking.
 */
export function useSkills() {
  // Browse state
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'browse' | 'installed'>('browse');

  // Track mount state for async cleanup
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Debounced search: 300ms after query or category change
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSkills();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  // Load installed skills on mount and when tab changes to 'installed'
  useEffect(() => {
    if (tab === 'installed') {
      loadInstalled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Also load installed on mount for the isInstalled check in browse tab
  useEffect(() => {
    loadInstalled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchSkills(
        searchQuery || undefined,
        selectedCategory || undefined
      );
      if (mountedRef.current) {
        setSkills(result.skills);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to search skills');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [searchQuery, selectedCategory]);

  const loadInstalled = useCallback(async () => {
    try {
      const result = await api.listInstalledSkills();
      if (mountedRef.current) {
        setInstalledSkills(result);
      }
    } catch (err) {
      // Silently fail -- installed list is supplementary
      console.error('Failed to load installed skills:', err);
    }
  }, []);

  const selectSkill = useCallback(async (name: string) => {
    setError(null);
    try {
      const details = await api.getSkillDetails(name);
      if (mountedRef.current) {
        setSelectedSkill(details);
        setScanResult(null); // Reset scan result for new skill
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load skill details');
      }
    }
  }, []);

  const installSkill = useCallback(async (name: string, version?: string): Promise<SkillInstallResponse | null> => {
    setInstalling(name);
    setError(null);
    try {
      const result = await api.installSkill({ name, version: version ?? null });
      if (mountedRef.current) {
        if (result.scan_result) {
          setScanResult(result.scan_result);
        }
        if (result.success) {
          await loadInstalled();
        }
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to install skill');
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setInstalling(null);
      }
    }
  }, [loadInstalled]);

  const uninstallSkill = useCallback(async (name: string) => {
    setError(null);
    try {
      await api.uninstallSkill(name);
      if (mountedRef.current) {
        await loadInstalled();
        // If we just uninstalled the selected skill, clear selection
        if (selectedSkill?.name === name) {
          setSelectedSkill(null);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to uninstall skill');
      }
    }
  }, [loadInstalled, selectedSkill]);

  const scanSkill = useCallback(async (name: string, version: string) => {
    setError(null);
    try {
      const result = await api.scanSkill({ skill_name: name, version });
      if (mountedRef.current) {
        setScanResult(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to scan skill');
      }
      return null;
    }
  }, []);

  const isInstalled = useCallback((name: string): boolean => {
    return installedSkills.some(s => s.name === name);
  }, [installedSkills]);

  const clearSelection = useCallback(() => {
    setSelectedSkill(null);
    setScanResult(null);
  }, []);

  return {
    // State
    skills,
    installedSkills,
    selectedSkill,
    searchQuery,
    selectedCategory,
    loading,
    installing,
    scanResult,
    error,
    tab,
    // Actions
    setSearchQuery,
    setSelectedCategory,
    setTab,
    selectSkill,
    clearSelection,
    installSkill,
    uninstallSkill,
    scanSkill,
    isInstalled,
    searchSkills,
  };
}
