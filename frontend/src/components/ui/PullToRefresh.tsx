/**
 * Pull to Refresh Component
 * Mobile-optimized pull-to-refresh functionality with smooth animations
 */

'use client';

import React, {
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { useMobile } from '@/services/mobile.service';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface PullToRefreshProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number;
  maxPullDistance?: number;
  refreshText?: string;
  pullText?: string;
  refreshingText?: string;
  onRefresh?: () => Promise<void> | void;
}

// Mark component as client-only to avoid serialization issues
const PullToRefreshComponent = React.memo(function PullToRefresh({
  children,
  className = '',
  disabled = false,
  threshold = 80,
  maxPullDistance = 120,
  refreshText = 'Release to refresh',
  pullText = 'Pull down to refresh',
  refreshingText = 'Refreshing...',
  onRefresh,
}: PullToRefreshProps) {
  const { isMobile, hapticFeedback } = useMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Only enable on mobile devices
  const enabled = isMobile && !disabled;

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    hapticFeedback('heavy');

    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, hapticFeedback]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if we're at the top of the page
      if (window.scrollY !== 0) return;

      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY !== 0 || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0) {
        e.preventDefault(); // Prevent scrolling when pulling down

        const distance = Math.min(diff * 0.5, maxPullDistance);
        setPullDistance(distance);
        setShowIndicator(distance > 10);

        const shouldRefresh = distance >= threshold;
        if (shouldRefresh !== canRefresh) {
          setCanRefresh(shouldRefresh);
          if (shouldRefresh) {
            hapticFeedback('medium');
          }
        }
      }
    };

    const handleTouchEnd = async () => {
      if (window.scrollY !== 0 || isRefreshing) return;

      if (canRefresh && pullDistance >= threshold) {
        await handleRefresh();
      }

      // Reset state
      setPullDistance(0);
      setCanRefresh(false);
      setShowIndicator(false);
      startY.current = 0;
      currentY.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    enabled,
    isRefreshing,
    canRefresh,
    pullDistance,
    threshold,
    maxPullDistance,
    handleRefresh,
    hapticFeedback,
  ]);

  const getIndicatorText = () => {
    if (isRefreshing) return refreshingText;
    if (canRefresh) return refreshText;
    return pullText;
  };

  const getIndicatorOpacity = () => {
    if (isRefreshing) return 1;
    return Math.min(pullDistance / threshold, 1);
  };

  const getIconRotation = () => {
    if (isRefreshing) return 'animate-spin';
    if (canRefresh) return 'rotate-180';
    return 'rotate-0';
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        transform: enabled
          ? `translateY(${Math.min(pullDistance * 0.3, 40)}px)`
          : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Pull Indicator */}
      {enabled && showIndicator && (
        <div
          ref={indicatorRef}
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center"
          style={{
            transform: `translateY(-${Math.max(60 - pullDistance, 0)}px)`,
            transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
          }}
        >
          <div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm
              transition-all duration-200
              ${canRefresh ? 'bg-blue-50 border-blue-200' : ''}
            `}
            style={{
              opacity: getIndicatorOpacity(),
              transform: `scale(${Math.min(
                0.8 + (pullDistance / threshold) * 0.2,
                1
              )})`,
            }}
          >
            <ArrowPathIcon
              className={`
                w-4 h-4 transition-transform duration-200
                ${canRefresh ? 'text-blue-600' : 'text-gray-500'}
                ${getIconRotation()}
              `}
            />
            <span
              className={`
                text-sm font-medium transition-colors duration-200
                ${canRefresh ? 'text-blue-600' : 'text-gray-600'}
              `}
            >
              {getIndicatorText()}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={isRefreshing ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
});

export { PullToRefreshComponent as PullToRefresh };
export default PullToRefreshComponent;
