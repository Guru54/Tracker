import React from 'react';

const ProgressBar = ({ current, total, size = 'md', showText = true }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className="w-full">
      {showText && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-dark-400 font-medium">
            {current} / {total} solved
          </span>
          <span className="text-xs text-primary-400 font-semibold">
            {percentage}%
          </span>
        </div>
      )}
      <div className={`progress-bar ${sizeClasses[size]}`}>
        <div 
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;