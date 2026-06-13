// ButtonGroup.tsx
import React from 'react';

interface ActionButtonProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  active = false, 
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '40px',
        fontSize: '13px',
        fontWeight: '500',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: active ? '#3b82f6' : '#f3f4f6',
        color: active ? 'white' : '#374151',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.backgroundColor = '#e5e7eb';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }
      }}
    >
      {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

interface ButtonGroupProps {
  onNotesClick: () => void;
  onHelpersClick: () => void;
  onTtsClick: () => void;
  activeButton?: 'notes' | 'helpers' | 'tts' | null;
  isTtsPlaying?: boolean;
}

// Changed name to ButtonGroup for clarity
const ButtonGroup: React.FC<ButtonGroupProps> = ({
  onNotesClick,
  onHelpersClick,
  onTtsClick,
  activeButton = null,
  isTtsPlaying = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '0px',
        backgroundColor: 'transparent',
        flexWrap: 'nowrap',
      }}
    >
      <ActionButton
        icon="📝"
        label="Notes"
        onClick={onNotesClick}
        active={activeButton === 'notes'}
      />
      
      <ActionButton
        icon="🛟"
        label="Helpers"
        onClick={onHelpersClick}
        active={activeButton === 'helpers'}
      />
      
      <ActionButton
        icon={isTtsPlaying ? "🔊" : "🎧"}
        label={isTtsPlaying ? "Playing..." : "TTS"}
        onClick={onTtsClick}
        active={activeButton === 'tts'}
      />
    </div>
  );
};

export default ButtonGroup;  // ← Export as ButtonGroup