import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.scss';

const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 2;
const ARROW_PADDING = 12;
const HOVER_CLOSE_DELAY = 500;

const tooltipControllers = new Map();
let activeTooltipId = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getTooltipTopBoundary = () => {
  if (typeof document === 'undefined') return VIEWPORT_MARGIN;

  let topBoundary = VIEWPORT_MARGIN;
  const boundaries = document.querySelectorAll('[data-tooltip-top-boundary]');

  boundaries.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    topBoundary = Math.max(topBoundary, rect.bottom + VIEWPORT_MARGIN);
  });

  return topBoundary;
};

const registerTooltip = (id, closeFn) => {
  tooltipControllers.set(id, closeFn);
};

const unregisterTooltip = (id) => {
  tooltipControllers.delete(id);
  if (activeTooltipId === id) {
    activeTooltipId = null;
  }
};

const activateTooltip = (id) => {
  if (activeTooltipId && activeTooltipId !== id) {
    const closeActive = tooltipControllers.get(activeTooltipId);
    closeActive?.();
  }
  activeTooltipId = id;
};

const deactivateTooltip = (id) => {
  if (activeTooltipId === id) {
    activeTooltipId = null;
  }
};

const resolvePlacement = ({
  preferredPlacement,
  viewportWidth,
  viewportHeight,
  triggerRect,
  tooltipRect,
  topBoundary,
  forcePreferredPlacement,
}) => {
  if (forcePreferredPlacement) {
    return ['top', 'bottom', 'left', 'right'].includes(preferredPlacement) ? preferredPlacement : 'top';
  }

  const spaceAbove = triggerRect.top - topBoundary;
  const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;
  const spaceLeft = triggerRect.left - VIEWPORT_MARGIN;
  const spaceRight = viewportWidth - triggerRect.right - VIEWPORT_MARGIN;

  const canPlaceTop = spaceAbove >= tooltipRect.height + TOOLTIP_GAP;
  const canPlaceBottom = spaceBelow >= tooltipRect.height + TOOLTIP_GAP;
  const canPlaceLeft = spaceLeft >= tooltipRect.width + TOOLTIP_GAP;
  const canPlaceRight = spaceRight >= tooltipRect.width + TOOLTIP_GAP;

  let nextPlacement = preferredPlacement;
  if (preferredPlacement === 'top' && !canPlaceTop) {
    nextPlacement = canPlaceBottom ? 'bottom' : canPlaceRight ? 'right' : 'left';
  } else if (preferredPlacement === 'bottom' && !canPlaceBottom) {
    nextPlacement = canPlaceTop ? 'top' : canPlaceRight ? 'right' : 'left';
  } else if (preferredPlacement === 'left' && !canPlaceLeft) {
    nextPlacement = canPlaceRight ? 'right' : canPlaceTop ? 'top' : 'bottom';
  } else if (preferredPlacement === 'right' && !canPlaceRight) {
    nextPlacement = canPlaceLeft ? 'left' : canPlaceTop ? 'top' : 'bottom';
  }

  return ['top', 'bottom', 'left', 'right'].includes(nextPlacement) ? nextPlacement : 'top';
};

const InteractiveTooltip = ({
  children,
  content,
  position = 'top',
  respectTopBoundary = true,
  forcePreferredPlacement = false,
  openOnClick = true,
  hoverCloseDelay = HOVER_CLOSE_DELAY,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [openMode, setOpenMode] = useState(null); // null | hover | pinned | focus
  const [placement, setPlacement] = useState(position);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0,
    arrowX: null,
    arrowY: null,
  });

  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const positionFrameRef = useRef(null);
  const tooltipIdRef = useRef(`tooltip-${Math.random().toString(36).slice(2, 10)}`);
  const instanceIdRef = useRef(`tt-${Math.random().toString(36).slice(2, 10)}`);

  const isPinned = openMode === 'pinned';

  const clearCloseTimer = useCallback(() => {
    if (!closeTimeoutRef.current) return;
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);

  const closeImmediately = useCallback(() => {
    clearCloseTimer();
    setOpenMode(null);
    setIsPositionReady(false);
    setIsVisible(false);
    deactivateTooltip(instanceIdRef.current);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback((delay = hoverCloseDelay) => {
    clearCloseTimer();
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      closeImmediately();
    }, delay);
  }, [clearCloseTimer, closeImmediately, hoverCloseDelay]);

  const openTooltip = useCallback((mode = 'hover') => {
    clearCloseTimer();
    activateTooltip(instanceIdRef.current);
    setOpenMode(mode);
    setIsPositionReady(false);
    setIsVisible(true);
  }, [clearCloseTimer]);

  const closeTooltip = useCallback((delay = 0) => {
    if (delay > 0) {
      scheduleClose(delay);
      return;
    }
    closeImmediately();
  }, [scheduleClose, closeImmediately]);

  const isWithinTriggerOrTooltip = useCallback((target) => {
    if (!target) return false;
    return (
      (triggerRef.current && triggerRef.current.contains(target)) ||
      (tooltipRef.current && tooltipRef.current.contains(target))
    );
  }, []);

  const computeTooltipPosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const topBoundary = respectTopBoundary ? getTooltipTopBoundary() : VIEWPORT_MARGIN;

    const nextPlacement = resolvePlacement({
      preferredPlacement: position,
      viewportWidth,
      viewportHeight,
      triggerRect,
      tooltipRect,
      topBoundary,
      forcePreferredPlacement,
    });

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    let x = 0;
    let y = 0;
    let arrowX = null;
    let arrowY = null;

    if (nextPlacement === 'top' || nextPlacement === 'bottom') {
      x = clamp(
        triggerCenterX - tooltipRect.width / 2,
        VIEWPORT_MARGIN,
        viewportWidth - tooltipRect.width - VIEWPORT_MARGIN
      );
      y = nextPlacement === 'top'
        ? clamp(
            triggerRect.top - tooltipRect.height - TOOLTIP_GAP,
            topBoundary,
            viewportHeight - tooltipRect.height - VIEWPORT_MARGIN
          )
        : clamp(
            triggerRect.bottom + TOOLTIP_GAP,
            topBoundary,
            viewportHeight - tooltipRect.height - VIEWPORT_MARGIN
          );
      arrowX = clamp(triggerCenterX - x, ARROW_PADDING, tooltipRect.width - ARROW_PADDING);
    } else {
      y = clamp(
        triggerCenterY - tooltipRect.height / 2,
        topBoundary,
        viewportHeight - tooltipRect.height - VIEWPORT_MARGIN
      );
      x = nextPlacement === 'left'
        ? clamp(
            triggerRect.left - tooltipRect.width - TOOLTIP_GAP,
            VIEWPORT_MARGIN,
            viewportWidth - tooltipRect.width - VIEWPORT_MARGIN
          )
        : clamp(
            triggerRect.right + TOOLTIP_GAP,
            VIEWPORT_MARGIN,
            viewportWidth - tooltipRect.width - VIEWPORT_MARGIN
          );
      arrowY = clamp(triggerCenterY - y, ARROW_PADDING, tooltipRect.height - ARROW_PADDING);
    }

    setPlacement((prevPlacement) => (prevPlacement === nextPlacement ? prevPlacement : nextPlacement));
    setTooltipPosition((prevPosition) => {
      if (
        prevPosition.x === x &&
        prevPosition.y === y &&
        prevPosition.arrowX === arrowX &&
        prevPosition.arrowY === arrowY
      ) {
        return prevPosition;
      }
      return { x, y, arrowX, arrowY };
    });
  }, [position, respectTopBoundary, forcePreferredPlacement]);

  const schedulePositionUpdate = useCallback(() => {
    if (positionFrameRef.current) return;
    positionFrameRef.current = requestAnimationFrame(() => {
      positionFrameRef.current = null;
      computeTooltipPosition();
    });
  }, [computeTooltipPosition]);

  const renderContent = useCallback(() => {
    if (typeof content === 'function') {
      return content({ closeTooltip, isPinned });
    }
    return content;
  }, [content, closeTooltip, isPinned]);

  const handleClick = useCallback((event) => {
    event.stopPropagation();

    if (isHoverCapable) {
      openTooltip('pinned');
      return;
    }

    if (isVisible) {
      closeTooltip();
      return;
    }

    openTooltip('pinned');
  }, [isHoverCapable, isVisible, openTooltip, closeTooltip]);

  const handleTriggerMouseEnter = useCallback(() => {
    openTooltip(isPinned ? 'pinned' : 'hover');
  }, [openTooltip, isPinned]);

  const handleHoverLeave = useCallback((event) => {
    if (isPinned) return;
    if (isWithinTriggerOrTooltip(event.relatedTarget)) return;
    scheduleClose();
  }, [isPinned, isWithinTriggerOrTooltip, scheduleClose]);

  const handleTriggerBlur = useCallback((event) => {
    if (isPinned) return;
    if (isWithinTriggerOrTooltip(event.relatedTarget)) return;
    closeTooltip();
  }, [isPinned, isWithinTriggerOrTooltip, closeTooltip]);

  useEffect(() => {
    const instanceId = instanceIdRef.current;
    registerTooltip(instanceId, closeImmediately);
    return () => {
      clearCloseTimer();
      if (positionFrameRef.current) {
        cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
      unregisterTooltip(instanceId);
    };
  }, [closeImmediately, clearCloseTimer]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const applyCapability = () => setIsHoverCapable(mediaQuery.matches);
    applyCapability();
    mediaQuery.addEventListener('change', applyCapability);
    return () => mediaQuery.removeEventListener('change', applyCapability);
  }, []);

  useLayoutEffect(() => {
    if (!isVisible) return;
    computeTooltipPosition();
    setIsPositionReady(true);
  }, [isVisible, content, computeTooltipPosition]);

  useEffect(() => {
    if (!isVisible) return undefined;
    const scrollListenerOptions = { capture: true, passive: true };
    window.addEventListener('resize', schedulePositionUpdate);
    window.addEventListener('scroll', schedulePositionUpdate, scrollListenerOptions);
    return () => {
      window.removeEventListener('resize', schedulePositionUpdate);
      window.removeEventListener('scroll', schedulePositionUpdate, scrollListenerOptions);
      if (positionFrameRef.current) {
        cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [isVisible, content, schedulePositionUpdate]);

  useEffect(() => {
    if (!isVisible) return undefined;

    const handlePointerDownOutside = (event) => {
      if (isWithinTriggerOrTooltip(event.target)) return;
      closeImmediately();
    };

    const handleEscapeKey = (event) => {
      if (event.key !== 'Escape') return;
      closeImmediately();
    };

    document.addEventListener('pointerdown', handlePointerDownOutside, true);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible, isWithinTriggerOrTooltip, closeImmediately]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={openOnClick ? handleClick : undefined}
        onMouseEnter={isHoverCapable ? handleTriggerMouseEnter : undefined}
        onMouseLeave={isHoverCapable ? handleHoverLeave : undefined}
        onFocus={() => openTooltip('focus')}
        onBlur={handleTriggerBlur}
        className={styles.tooltipTrigger}
        aria-describedby={isVisible ? tooltipIdRef.current : undefined}
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          id={tooltipIdRef.current}
          className={`${styles.tooltip} ${styles[placement]}`}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            visibility: isPositionReady ? 'visible' : 'hidden',
            '--tooltip-arrow-x': tooltipPosition.arrowX ? `${tooltipPosition.arrowX}px` : undefined,
            '--tooltip-arrow-y': tooltipPosition.arrowY ? `${tooltipPosition.arrowY}px` : undefined,
          }}
          role="tooltip"
          onMouseEnter={isHoverCapable ? clearCloseTimer : undefined}
          onMouseLeave={isHoverCapable ? handleHoverLeave : undefined}
        >
          <div className={styles.tooltipContent}>
            {renderContent()}
          </div>
          <div className={styles.tooltipArrow}></div>
        </div>,
        document.body
      )}
    </>
  );
};

export default InteractiveTooltip;
