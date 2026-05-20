import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizablePanelOptions {
  storageKey: string;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
}

/**
 * Drives a right-anchored, mouse-resizable panel. Width is clamped to
 * [minWidth, maxWidth], persisted under `storageKey`, and hydrated from
 * localStorage on mount.
 *
 * Attach `containerRef` to the element whose right edge anchors the panel —
 * `event.clientX` is measured against `container.getBoundingClientRect().right`.
 */
export function useResizablePanel({
  storageKey,
  minWidth,
  maxWidth,
  defaultWidth,
}: UseResizablePanelOptions) {
  const clampWidth = useCallback(
    (value: number) => Math.min(maxWidth, Math.max(minWidth, value)),
    [minWidth, maxWidth],
  );

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth;
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? Number.parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed) ? clampWidth(parsed) : defaultWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setPanelWidth(clampWidth(rect.right - event.clientX));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, clampWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, String(panelWidth));
  }, [panelWidth, storageKey]);

  const startResize = useCallback(() => {
    setIsResizing(true);
  }, []);

  const resetWidth = useCallback(() => {
    setPanelWidth(defaultWidth);
  }, [defaultWidth]);

  return {
    panelWidth,
    setPanelWidth,
    isResizing,
    startResize,
    resetWidth,
    containerRef,
  };
}
