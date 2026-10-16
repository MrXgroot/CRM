import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CustomToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export const CustomToast: React.FC<CustomToastProps> = ({
  message,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, duration + 500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  if (!isVisible) return null;

  return createPortal(
    <div
      className={`
        fixed top-5 left-1/2 transform -translate-x-1/2 z-[1000] 
        px-6 py-4 rounded-2xl shadow-2xl text-white font-semibold 
        transition-all duration-500 ease-out
        bg-gradient-to-r from-purple-600 via-pink-600 to-red-500
        backdrop-blur-sm border border-white border-opacity-20
        ${isFading ? 'opacity-0 scale-95 -translate-y-2' : 'opacity-100 scale-100 translate-y-0'}
      `}
      style={{
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(236, 72, 153, 0.4)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-sm tracking-wide">{message}</span>
      </div>
    </div>,
    document.body
  );
};
