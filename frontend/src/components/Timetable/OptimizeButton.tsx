import { useState } from 'react';
import './OptimizeButton.css';

interface OptimizeButtonProps {
  onOptimize: () => Promise<void>;
  disabled?: boolean;
  hasModules?: boolean;
}

const OptimizeButton = ({ onOptimize, disabled = false, hasModules = false }: OptimizeButtonProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (disabled || !hasModules || isOptimizing) return;
    
    setIsOptimizing(true);
    try {
      await onOptimize();
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getButtonText = () => {
    if (isOptimizing) return 'Optimizing...';
    if (!hasModules) return 'Add modules to optimize';
    return 'Optimize Timetable';
  };

  const isButtonDisabled = disabled || !hasModules || isOptimizing;

  return (
    <div className="optimize-button-container">
      <button
        className={`optimize-button ${isButtonDisabled ? 'disabled' : ''} ${isOptimizing ? 'optimizing' : ''}`}
        onClick={handleOptimize}
        disabled={isButtonDisabled}
      >
        {isOptimizing && (
          <div className="spinner"></div>
        )}
        <span>{getButtonText()}</span>
      </button>
      
      {!hasModules && (
        <p className="helper-text">
          Select at least one module to optimize your timetable
        </p>
      )}
      
      {hasModules && !disabled && (
        <p className="helper-text">
          Generate an optimized timetable based on your preferences
        </p>
      )}
    </div>
  );
};

export default OptimizeButton;