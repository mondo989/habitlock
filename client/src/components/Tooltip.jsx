import { useState } from 'react';
import styles from './Tooltip.module.scss';

const Tooltip = ({ children, content, position = 'top', delay = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const showTooltip = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  return (
    <div 
      className={styles.tooltipContainer}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div className={`${styles.tooltip} ${styles[position]}`}>
          {typeof content === 'string' ? (
            <span>{content}</span>
          ) : (
            content
          )}
        </div>
      )}
    </div>
  );
};

export default Tooltip; 