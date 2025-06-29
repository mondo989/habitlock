import { useState, useEffect, useRef } from 'react';
import styles from './Tooltip.module.scss';

const InteractiveTooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    
    if (!isVisible) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      setTooltipPosition({
        x: rect.left + scrollLeft + rect.width / 2,
        y: rect.top + scrollTop
      });
    }
    
    setIsVisible(!isVisible);
  };

  const handleClickOutside = (e) => {
    if (tooltipRef.current && !tooltipRef.current.contains(e.target) && 
        triggerRef.current && !triggerRef.current.contains(e.target)) {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isVisible]);

  return (
    <>
      <div ref={triggerRef} onClick={handleClick} className={styles.tooltipTrigger}>
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`${styles.tooltip} ${styles[position]}`}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <div className={styles.tooltipContent}>
            {content}
          </div>
          <div className={styles.tooltipArrow}></div>
        </div>
      )}
    </>
  );
};

export default InteractiveTooltip; 