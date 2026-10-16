import React, { useState } from 'react';
import './Tooltip.css';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const handleMouseEnter = (): void => {
    setShowTooltip(true);
  };

  const handleMouseLeave = (): void => {
    setShowTooltip(false);
  };

  return (
    <div className="cursor-pointer tooltip-container" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {showTooltip && <div className="tooltip">{text}</div>}
    </div>
  );
};



export default Tooltip;
