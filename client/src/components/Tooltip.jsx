import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.scss';

const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 14;
const ARROW_PADDING = 12;

const InteractiveTooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
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
  const tooltipIdRef = useRef(`tooltip-${Math.random().toString(36).slice(2, 10)}`);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const computeTooltipPosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceAbove = triggerRect.top - VIEWPORT_MARGIN;
    const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;
    const spaceLeft = triggerRect.left - VIEWPORT_MARGIN;
    const spaceRight = viewportWidth - triggerRect.right - VIEWPORT_MARGIN;

    const canPlaceTop = spaceAbove >= tooltipRect.height + TOOLTIP_GAP;
    const canPlaceBottom = spaceBelow >= tooltipRect.height + TOOLTIP_GAP;
    const canPlaceLeft = spaceLeft >= tooltipRect.width + TOOLTIP_GAP;
    const canPlaceRight = spaceRight >= tooltipRect.width + TOOLTIP_GAP;

    let nextPlacement = position;
    if (position === 'top' && !canPlaceTop) {
      nextPlacement = canPlaceBottom ? 'bottom' : canPlaceRight ? 'right' : 'left';
    } else if (position === 'bottom' && !canPlaceBottom) {
      nextPlacement = canPlaceTop ? 'top' : canPlaceRight ? 'right' : 'left';
    } else if (position === 'left' && !canPlaceLeft) {
      nextPlacement = canPlaceRight ? 'right' : canPlaceTop ? 'top' : 'bottom';
    } else if (position === 'right' && !canPlaceRight) {
      nextPlacement = canPlaceLeft ? 'left' : canPlaceTop ? 'top' : 'bottom';
    }

    if (!['top', 'bottom', 'left', 'right'].includes(nextPlacement)) {
      nextPlacement = 'top';
    }

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
        ? triggerRect.top - tooltipRect.height - TOOLTIP_GAP
        : triggerRect.bottom + TOOLTIP_GAP;
      arrowX = clamp(triggerCenterX - x, ARROW_PADDING, tooltipRect.width - ARROW_PADDING);
    } else {
      y = clamp(
        triggerCenterY - tooltipRect.height / 2,
        VIEWPORT_MARGIN,
        viewportHeight - tooltipRect.height - VIEWPORT_MARGIN
      );
      x = nextPlacement === 'left'
        ? triggerRect.left - tooltipRect.width - TOOLTIP_GAP
        : triggerRect.right + TOOLTIP_GAP;
      arrowY = clamp(triggerCenterY - y, ARROW_PADDING, tooltipRect.height - ARROW_PADDING);
    }

    setPlacement(nextPlacement);
    setTooltipPosition({ x, y, arrowX, arrowY });
  }, [position]);

  const openTooltip = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsPositionReady(false);
    setIsVisible(true);
  }, []);

  const closeTooltip = useCallback((delay = 0) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (delay > 0) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, delay);
      return;
    }
    setIsVisible(false);
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isHoverCapable) return;
    if (isVisible) {
      closeTooltip();
    } else {
      openTooltip();
    }
  };

  const handleClickOutside = useCallback((e) => {
    if (
      tooltipRef.current &&
      !tooltipRef.current.contains(e.target) &&
      triggerRef.current &&
      !triggerRef.current.contains(e.target)
    ) {
      closeTooltip();
    }
  }, [closeTooltip]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const applyCapability = () => setIsHoverCapable(mediaQuery.matches);
    applyCapability();
    mediaQuery.addEventListener('change', applyCapability);
    return () => mediaQuery.removeEventListener('change', applyCapability);
  }, []);

  useLayoutEffect(() => {
    if (isVisible) {
      computeTooltipPosition();
      setIsPositionReady(true);
    }
  }, [isVisible, content, computeTooltipPosition]);

  useEffect(() => {
    if (!isVisible) return undefined;

    const updatePosition = () => computeTooltipPosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isVisible, content, computeTooltipPosition]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isVisible, handleClickOutside]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleClick}
        onMouseEnter={isHoverCapable ? openTooltip : undefined}
        onMouseLeave={isHoverCapable ? () => closeTooltip(80) : undefined}
        onFocus={openTooltip}
        onBlur={() => closeTooltip()}
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
          onMouseEnter={isHoverCapable ? openTooltip : undefined}
          onMouseLeave={isHoverCapable ? () => closeTooltip() : undefined}
        >
          <div className={styles.tooltipContent}>
            {content}
          </div>
          <div className={styles.tooltipArrow}></div>
        </div>,
        document.body
      )}
    </>
  );
};

export default InteractiveTooltip; 
