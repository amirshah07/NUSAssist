import { X, ExternalLink, BookOpen, Award, FileText } from 'lucide-react';
import './NodeInfoModal.css';

interface NodeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleCode: string;
  title: string;
  description: string;
  moduleCredit: number;
  prerequisite: string;
  status?: 'completed' | 'available' | 'locked';
}

const NodeInfoModal = ({
  isOpen,
  onClose,
  moduleCode,
  title,
  description,
  moduleCredit,
  prerequisite,
  status = 'available'
}: NodeInfoModalProps) => {
  if (!isOpen) return null;

  const handleNUSModsClick = () => {
    window.open(`https://nusmods.com/courses/${moduleCode}`, '_blank');
  };

  const getStatusBadge = () => {
    const statusConfig = {
      completed: { text: 'Completed', className: 'node-info-status-badge--completed' },
      available: { text: 'Available', className: 'node-info-status-badge--available' },
      locked: { text: 'Locked', className: 'node-info-status-badge--locked' }
    };

    const config = statusConfig[status];
    return (
      <span className={`node-info-status-badge ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const formatPrerequisites = (prereq: string) => {
    if (!prereq || prereq.toLowerCase() === 'none' || prereq === '-') {
      return 'None';
    }
    return prereq;
  };

  return (
    <div className="node-info-modal-overlay" onClick={onClose}>
      <div className="node-info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="node-info-modal-header">
          <div className="node-info-modal-header-left">
            <h2 className="node-info-modal-module-code">{moduleCode}</h2>
            {getStatusBadge()}
          </div>
          <button className="node-info-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="node-info-modal-body">
          <h3 className="node-info-modal-title">{title}</h3>

          <div className="node-info-modal-info-row">
            <div className="node-info-info-item">
              <Award className="node-info-info-icon" size={16} />
              <span className="node-info-info-label">Modular Credits:</span>
              <span className="node-info-info-value">{moduleCredit} MCs</span>
            </div>
          </div>

          <div className="node-info-modal-section">
            <h4 className="node-info-section-title">
              <BookOpen className="node-info-section-icon" size={16} />
              Description
            </h4>
            <p className="node-info-modal-description">{description}</p>
          </div>

          <div className="node-info-modal-section">
            <h4 className="node-info-section-title">
              <FileText className="node-info-section-icon" size={16} />
              Prerequisites
            </h4>
            <p className="node-info-modal-description">{formatPrerequisites(prerequisite)}</p>
          </div>
        </div>

        <div className="node-info-modal-footer">
          <button className="node-info-nusmods-button" onClick={handleNUSModsClick}>
            <span>View on NUSMods</span>
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeInfoModal;