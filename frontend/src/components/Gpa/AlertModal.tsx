import type { MouseEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import './AlertModal.css';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const AlertModal = ({ isOpen, onClose, message }: AlertModalProps) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="alert-modal-overlay" onClick={handleOverlayClick}>
      <div className="alert-modal-content">
        <div className="alert-modal-icon">
          <AlertCircle size={40} />
        </div>
        
        
        <p className="alert-modal-message">{message}</p>
        
        <button 
          className="alert-modal-button"
          onClick={onClose}
          autoFocus
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default AlertModal;