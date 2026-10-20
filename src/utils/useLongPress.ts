import React, { useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

/**
 * Attaches handlers that trigger `onTrigger(position)` when the user either
 * long-presses (touch, ~450ms) or right-clicks (desktop) the element.
 * Short taps/clicks are left alone so normal play-on-click behavior keeps working.
 */
export function useLongPress(onTrigger: (pos: Position) => void, delay = 450) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      movedRef.current = false;
      const touch = e.touches[0];
      const pos = { x: touch.clientX, y: touch.clientY };
      timerRef.current = setTimeout(() => {
        if (!movedRef.current) {
          if (navigator.vibrate) navigator.vibrate(15);
          onTrigger(pos);
        }
      }, delay);
    },
    [onTrigger, delay]
  );

  const onTouchMove = useCallback(() => {
    movedRef.current = true;
    clear();
  }, [clear]);

  const onTouchEnd = useCallback(() => {
    clear();
  }, [clear]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onTrigger({ x: e.clientX, y: e.clientY });
    },
    [onTrigger]
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onContextMenu,
  };
}
