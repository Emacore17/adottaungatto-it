'use client';

import { Button } from '@adottaungatto/ui';
import {
  Children,
  type ReactNode,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface FeaturedListingsCarouselProps {
  children: ReactNode;
  autoPlayMs?: number | null;
  visibleCount?: number;
}

export function FeaturedListingsCarousel({
  children,
  autoPlayMs = 4800,
  visibleCount = 1,
}: FeaturedListingsCarouselProps) {
  const items = useMemo(
    () =>
      Children.toArray(children).map((item) => ({
        content: item,
        key: isValidElement(item) && item.key !== null ? String(item.key) : String(item),
      })),
    [children],
  );

  const totalItems = items.length;
  const itemsPerView = Math.max(1, visibleCount);
  const hasLoop = totalItems > itemsPerView;
  const autoPlayDelayMs = autoPlayMs ?? 0;
  const autoPlayEnabled = hasLoop && autoPlayDelayMs > 0;
  const cloneCount = hasLoop ? itemsPerView : 0;
  const trackItems = useMemo(() => {
    if (!hasLoop) {
      return items;
    }

    return [...items.slice(-cloneCount), ...items, ...items.slice(0, cloneCount)];
  }, [cloneCount, hasLoop, items]);

  const [trackIndex, setTrackIndex] = useState(cloneCount);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const autoPlayTimeoutRef = useRef<number | null>(null);
  const autoPlayTokenRef = useRef(0);

  const clearAutoPlayTimeout = useCallback(() => {
    if (autoPlayTimeoutRef.current !== null) {
      window.clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, []);

  const scheduleAutoPlay = useCallback(
    (delayMs: number) => {
      if (!autoPlayEnabled) {
        return;
      }

      autoPlayTokenRef.current += 1;
      const token = autoPlayTokenRef.current;

      clearAutoPlayTimeout();
      autoPlayTimeoutRef.current = window.setTimeout(() => {
        if (token !== autoPlayTokenRef.current) {
          return;
        }

        setTransitionEnabled(true);
        setTrackIndex((currentValue) => currentValue + 1);
        scheduleAutoPlay(autoPlayDelayMs);
      }, delayMs);
    },
    [autoPlayDelayMs, autoPlayEnabled, clearAutoPlayTimeout],
  );

  useEffect(() => {
    setTrackIndex(cloneCount);
    setTransitionEnabled(true);
  }, [cloneCount]);

  useEffect(() => {
    autoPlayTokenRef.current += 1;
    clearAutoPlayTimeout();

    if (!autoPlayEnabled) {
      return;
    }

    scheduleAutoPlay(autoPlayDelayMs);

    return () => {
      autoPlayTokenRef.current += 1;
      clearAutoPlayTimeout();
    };
  }, [autoPlayDelayMs, autoPlayEnabled, clearAutoPlayTimeout, scheduleAutoPlay]);

  useEffect(() => {
    if (transitionEnabled) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [transitionEnabled]);

  if (totalItems === 0) {
    return null;
  }

  const activeStartIndex = hasLoop
    ? (((trackIndex - cloneCount) % totalItems) + totalItems) % totalItems
    : 0;

  const normalizeTrackIndex = (value: number) => {
    return ((((value - cloneCount) % totalItems) + totalItems) % totalItems) + cloneCount;
  };

  const handleTrackTransitionEnd = () => {
    if (!hasLoop) {
      return;
    }

    if (trackIndex < cloneCount || trackIndex >= cloneCount + totalItems) {
      setTransitionEnabled(false);
      setTrackIndex(normalizeTrackIndex(trackIndex));
    }
  };

  const movePrevious = () => {
    if (!hasLoop) {
      return;
    }

    if (autoPlayEnabled) {
      scheduleAutoPlay(autoPlayDelayMs);
    }
    setTransitionEnabled(true);
    setTrackIndex((currentValue) => currentValue - 1);
  };

  const moveNext = () => {
    if (!hasLoop) {
      return;
    }

    if (autoPlayEnabled) {
      scheduleAutoPlay(autoPlayDelayMs);
    }
    setTransitionEnabled(true);
    setTrackIndex((currentValue) => currentValue + 1);
  };

  const moveToIndex = (logicalIndex: number) => {
    if (!hasLoop) {
      return;
    }

    if (autoPlayEnabled) {
      scheduleAutoPlay(autoPlayDelayMs);
    }
    const normalizedIndex = ((logicalIndex % totalItems) + totalItems) % totalItems;
    setTransitionEnabled(true);
    setTrackIndex(cloneCount + normalizedIndex);
  };

  return (
    <div className="space-y-4">
      <div className="-mx-2 overflow-hidden">
        <div
          aria-live="polite"
          className={`flex ease-out ${
            transitionEnabled ? 'transition-transform duration-500' : 'transition-none'
          }`}
          onTransitionEnd={handleTrackTransitionEnd}
          style={{
            transform: `translate3d(-${(trackIndex * 100) / itemsPerView}%, 0, 0)`,
          }}
        >
          {trackItems.map((item, index) => {
            const realIndex = hasLoop ? (index - cloneCount + totalItems) % totalItems : index;
            const isVisible = hasLoop
              ? (realIndex - activeStartIndex + totalItems) % totalItems < itemsPerView
              : index < itemsPerView;

            return (
              <div
                aria-hidden={!isVisible}
                className="shrink-0 px-2"
                key={`${item.key}-${index}`}
                style={{ flexBasis: `${100 / itemsPerView}%` }}
              >
                {item.content}
              </div>
            );
          })}
        </div>
      </div>

      {totalItems > itemsPerView ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {items.map((item, index) => (
              <button
                aria-label={`Vai allo slide ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeStartIndex
                    ? 'w-7 bg-[var(--color-primary)]'
                    : 'w-2.5 bg-[var(--color-border)]'
                }`}
                key={`dot-${item.key}`}
                onClick={() => moveToIndex(index)}
                type="button"
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={movePrevious} size="sm" variant="outline">
              Precedente
            </Button>
            <Button onClick={moveNext} size="sm" variant="outline">
              Successivo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
