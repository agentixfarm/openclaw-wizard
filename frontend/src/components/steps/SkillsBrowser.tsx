import { useState } from 'react';
import { Search, X, Download, Package, CheckCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSkills } from '../../hooks/useSkills';
import { SkillDetail } from './SkillDetail';
import type { SkillMetadata } from '../../types/SkillMetadata';
import type { SkillCategory } from '../../types/SkillCategory';

const CATEGORIES: Array<SkillCategory | 'All'> = [
  'All',
  'DevTools',
  'DataProcessing',
  'ApiIntegration',
  'Automation',
  'Security',
  'Monitoring',
];

const CATEGORY_LABELS: Record<string, string> = {
  All: 'All',
  DevTools: 'Dev Tools',
  DataProcessing: 'Data Processing',
  ApiIntegration: 'API Integration',
  Automation: 'Automation',
  Security: 'Security',
  Monitoring: 'Monitoring',
};

function formatDownloads(count: number | null): string {
  if (count === null || count === undefined) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatBytes(bytes: bigint | null): string {
  if (bytes === null || bytes === undefined) return '';
  const num = Number(bytes);
  if (num >= 1_048_576) return `${(num / 1_048_576).toFixed(1)} MB`;
  if (num >= 1_024) return `${(num / 1_024).toFixed(1)} KB`;
  return `${num} B`;
}

/**
 * Skeleton loading cards for the skills grid
 */
function SkillCardSkeleton() {
  return (
    <div className="bg-zinc-800 rounded-lg p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-zinc-700 rounded w-36" />
        <div className="h-5 bg-zinc-700 rounded w-14" />
      </div>
      <div className="h-4 bg-zinc-700 rounded w-28 mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-zinc-700 rounded w-full" />
        <div className="h-3 bg-zinc-700 rounded w-3/4" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 bg-zinc-700 rounded w-12" />
        <div className="h-5 bg-zinc-700 rounded w-16" />
        <div className="h-5 bg-zinc-700 rounded w-10" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-8 bg-zinc-700 rounded w-24" />
        <div className="h-8 bg-zinc-700 rounded w-20" />
      </div>
    </div>
  );
}

/**
 * Individual skill card in the browse grid
 */
function SkillCard({
  skill,
  installed,
  installing,
  onViewDetails,
  onInstall,
  onUninstall,
}: {
  skill: SkillMetadata;
  installed: boolean;
  installing: boolean;
  onViewDetails: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  const maxTags = 4;
  const visibleTags = skill.tags.slice(0, maxTags);
  const remainingTags = skill.tags.length - maxTags;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 hover:border-zinc-600 transition-colors">
      {/* Name + Version */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-zinc-100 text-lg truncate">{skill.name}</h3>
        <span className="text-xs bg-zinc-700 text-zinc-300 rounded px-2 py-0.5 shrink-0 ml-2">
          v{skill.version}
        </span>
      </div>

      {/* Author */}
      <p className="text-zinc-400 text-sm mb-2">by {skill.author}</p>

      {/* Description */}
      <p className="text-zinc-300 text-sm line-clamp-2 mb-3">{skill.description}</p>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {visibleTags.map(tag => (
            <span key={tag} className="text-xs bg-zinc-900 text-zinc-400 rounded px-2 py-0.5">
              {tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="text-xs text-zinc-500">+{remainingTags} more</span>
          )}
        </div>
      )}

      {/* Downloads */}
      {skill.downloads !== null && skill.downloads > 0 && (
        <div className="flex items-center gap-1.5 text-zinc-500 text-sm mb-4">
          <Download className="w-3.5 h-3.5" />
          <span>{formatDownloads(skill.downloads)} downloads</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
        <button
          onClick={onViewDetails}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5 rounded hover:bg-zinc-700/50"
        >
          View Details
        </button>

        {installing ? (
          <span className="flex items-center gap-2 text-sm text-sky-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Installing...
          </span>
        ) : installed ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Installed
            </span>
            <button
              onClick={onUninstall}
              className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
            >
              Uninstall
            </button>
          </div>
        ) : (
          <button
            onClick={onInstall}
            className="text-sm bg-sky-400/60 hover:bg-sky-400/80 text-white px-4 py-1.5 rounded transition-colors"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Installed skills list view
 */
function InstalledView({
  installedSkills,
  onUninstall,
  onSwitchToBrowse,
}: {
  installedSkills: Array<{ name: string; version: string; path: string; size_bytes: bigint | null }>;
  onUninstall: (name: string) => void;
  onSwitchToBrowse: () => void;
}) {
  if (installedSkills.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-300 mb-2">No OpenClaw skills installed</h3>
        <p className="text-zinc-500 mb-4">Browse available skills to get started.</p>
        <button
          onClick={onSwitchToBrowse}
          className="text-sm bg-sky-400/60 hover:bg-sky-400/80 text-white px-5 py-2 rounded transition-colors"
        >
          Browse Skills
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">{installedSkills.length} skill{installedSkills.length !== 1 ? 's' : ''} installed</p>
      {installedSkills.map(skill => (
        <div key={skill.name} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-bold text-zinc-100">{skill.name}</span>
              <span className="text-xs bg-zinc-700 text-zinc-300 rounded px-2 py-0.5">
                v{skill.version}
              </span>
              {skill.size_bytes !== null && (
                <span className="text-xs text-zinc-500">{formatBytes(skill.size_bytes)}</span>
              )}
            </div>
            <button
              onClick={() => onUninstall(skill.name)}
              className="text-sm text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/50 hover:bg-red-400/10 px-3 py-1.5 rounded transition-colors shrink-0 ml-4"
            >
              Uninstall
            </button>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1.5 truncate" title={skill.path}>
            {skill.path}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Skills browser component -- main skills browsing and management page.
 * This is a dashboard component, NOT a wizard step.
 * Provides search, category filtering, browse/installed tabs, and skill detail panel.
 */
export function SkillsBrowser() {
  const {
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
  } = useSkills();

  const [uninstallConfirm, setUninstallConfirm] = useState<string | null>(null);

  const handleInstall = async (skill: SkillMetadata) => {
    await installSkill(skill.name, skill.version);
  };

  const handleUninstall = (name: string) => {
    setUninstallConfirm(name);
  };

  const confirmUninstall = async () => {
    if (uninstallConfirm) {
      await uninstallSkill(uninstallConfirm);
      setUninstallConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Skills</h2>
        <p className="text-zinc-400 text-sm mt-1">Browse and manage OpenClaw skills from ClawHub</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-700">
        <button
          onClick={() => setTab('browse')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'browse'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => setTab('installed')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'installed'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Installed ({installedSkills.length})
        </button>
      </div>

      {tab === 'browse' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search OpenClaw skills..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                  (cat === 'All' && !selectedCategory) || selectedCategory === cat
                    ? 'bg-sky-400/60 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 font-medium text-sm">Could not load skills</p>
                  <p className="text-red-400/70 text-sm mt-1">{error}</p>
                </div>
                <button
                  onClick={() => searchSkills()}
                  className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkillCardSkeleton />
              <SkillCardSkeleton />
              <SkillCardSkeleton />
              <SkillCardSkeleton />
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && skills.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No skills found</h3>
              <p className="text-zinc-500">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different search term.`
                  : 'Try a different search or category.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-sky-400 hover:text-sky-300 mt-3 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Skills grid */}
          {!loading && !error && skills.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map(skill => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  installed={isInstalled(skill.name)}
                  installing={installing === skill.name}
                  onViewDetails={() => selectSkill(skill.name)}
                  onInstall={() => handleInstall(skill)}
                  onUninstall={() => handleUninstall(skill.name)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'installed' && (
        <InstalledView
          installedSkills={installedSkills}
          onUninstall={handleUninstall}
          onSwitchToBrowse={() => setTab('browse')}
        />
      )}

      {/* Skill detail slide-over */}
      {selectedSkill && (
        <SkillDetail
          skill={selectedSkill}
          onClose={clearSelection}
          onInstall={name => installSkill(name)}
          onUninstall={name => uninstallSkill(name)}
          isInstalled={isInstalled(selectedSkill.name)}
          installing={installing === selectedSkill.name}
          scanResult={scanResult}
          onScan={(name, version) => scanSkill(name, version)}
        />
      )}

      {/* Uninstall confirmation dialog */}
      {uninstallConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Remove {uninstallConfirm}?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This will uninstall the skill globally. You can reinstall it later from ClawHub.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUninstallConfirm(null)}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUninstall}
                className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
              >
                Uninstall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
