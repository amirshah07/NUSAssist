import { Handle, Position } from '@xyflow/react';
import { Lock, CheckCircle, Circle } from 'lucide-react';
import './CustomNode.css'; 

export type ModuleStatus = 'completed' | 'available' | 'locked';

export interface ModuleNodeData extends Record<string, unknown> {
  label: string;
  status: ModuleStatus;
  moduleCode?: string;
  description?: string;
  moduleCredit?: number;  
  prerequisite?: string;  
}

interface CustomNodeProps {
  data: ModuleNodeData;
  isConnectable: boolean;
  sourcePosition?: Position;
  targetPosition?: Position;
  id: string;
}

const CustomNode = ({ 
  data, 
  isConnectable,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
}: CustomNodeProps) => {
  const { label, status, moduleCode } = data;

  const extractModuleInfo = (fullLabel: string) => {
    const match = fullLabel.match(/^([A-Z0-9]+[A-Z]?)\s+(.+)$/);
    if (match) {
      return {
        code: match[1],
        title: match[2]
      };
    }
    return {
      code: moduleCode || '',
      title: fullLabel
    };
  };

  const { code, title } = extractModuleInfo(label);

  const getNodeClasses = () => {
    const baseClass = 'custom-module-node';
    return `${baseClass} ${baseClass}--${status}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return (
          <CheckCircle 
            className="status-icon status-icon--clickable" 
            size={16}
          />
        );
      case 'available':
        return (
          <Circle 
            className="status-icon status-icon--clickable" 
            size={16}
          />
        );
      case 'locked':
        return <Lock className="status-icon" size={14} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className={getNodeClasses()}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible handles - needed for edge rendering but hidden from view */}
      <Handle
        type="target"
        position={targetPosition}
        isConnectable={isConnectable}
        className="module-handle module-handle--invisible"
      />
      
      <div className="module-content">
        <div className="module-header">
          <span className="module-code">{code}</span>
          {getStatusIcon()}
        </div>
        <div className="module-title">{title}</div>
      </div>
      
      <Handle
        type="source"
        position={sourcePosition}
        isConnectable={isConnectable}
        className="module-handle module-handle--invisible"
      />
    </div>
  );
};

export default CustomNode;