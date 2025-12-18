'use client';

import { useEffect, useCallback, useRef } from 'react';

interface ShortcutConfig {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onNewEntry?: () => void;
  onEscape?: () => void;
  onSelectAll?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

/**
 * Hook for managing keyboard shortcuts in admin interface
 */
export function useAdminShortcuts({
  onSave,
  onUndo,
  onRedo,
  onSearch,
  onNewEntry,
  onEscape,
  onSelectAll,
  onDelete,
  enabled = true,
}: ShortcutConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      const isMeta = e.metaKey || e.ctrlKey;

      // Escape - always works
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Shortcuts that work even in inputs
      if (isMeta) {
        // Cmd/Ctrl + S - Save
        if (e.key === 's' && onSave) {
          e.preventDefault();
          onSave();
          return;
        }
      }

      // Shortcuts that don't work when focused on inputs
      if (!isInputFocused) {
        if (isMeta) {
          // Cmd/Ctrl + Z - Undo
          if (e.key === 'z' && !e.shiftKey && onUndo) {
            e.preventDefault();
            onUndo();
            return;
          }

          // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y - Redo
          if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
            if (onRedo) {
              e.preventDefault();
              onRedo();
              return;
            }
          }

          // Cmd/Ctrl + F or Cmd/Ctrl + K - Search
          if ((e.key === 'f' || e.key === 'k') && onSearch) {
            e.preventDefault();
            onSearch();
            return;
          }

          // Cmd/Ctrl + A - Select All
          if (e.key === 'a' && onSelectAll) {
            e.preventDefault();
            onSelectAll();
            return;
          }
        }

        // N - New entry (without modifier)
        if (e.key === 'n' && !isMeta && onNewEntry) {
          e.preventDefault();
          onNewEntry();
          return;
        }

        // Delete/Backspace - Delete selected
        if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
          e.preventDefault();
          onDelete();
          return;
        }
      }
    },
    [enabled, onSave, onUndo, onRedo, onSearch, onNewEntry, onEscape, onSelectAll, onDelete]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for detecting unsaved changes and warning before leaving
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}

/**
 * Hook for autosave functionality
 */
export function useAutosave(
  data: unknown,
  onSave: () => Promise<void>,
  options: {
    enabled?: boolean;
    debounceMs?: number;
    onAutoSaveStart?: () => void;
    onAutoSaveComplete?: () => void;
    onAutoSaveError?: (error: Error) => void;
  } = {}
) {
  const {
    enabled = true,
    debounceMs = 30000, // 30 seconds default
    onAutoSaveStart,
    onAutoSaveComplete,
    onAutoSaveError,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(data);

    // Skip if data hasn't changed
    if (currentData === lastSavedRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      onAutoSaveStart?.();

      try {
        await onSave();
        lastSavedRef.current = currentData;
        onAutoSaveComplete?.();
      } catch (error) {
        onAutoSaveError?.(error instanceof Error ? error : new Error('Autosave failed'));
      } finally {
        isSavingRef.current = false;
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, onSave, onAutoSaveStart, onAutoSaveComplete, onAutoSaveError]);

  // Function to manually trigger save
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isSavingRef.current) return;

    isSavingRef.current = true;
    try {
      await onSave();
      lastSavedRef.current = JSON.stringify(data);
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave]);

  return { saveNow };
}

export default useAdminShortcuts;
