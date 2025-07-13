import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CustomTimeBlock } from './types';
import './AddCustomBlockModal.css';

interface AddCustomBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBlock: (block: CustomTimeBlock) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#eab308'
];

const AddCustomBlockModal = ({ isOpen, onClose, onAddBlock }: AddCustomBlockModalProps) => {
  const [eventName, setEventName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[4]);

  function toggleDay(day: string) {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function resetForm() {
    setEventName('');
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
    setSelectedColor(COLORS[4]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const trimmedName = eventName.trim();
    
    if (!trimmedName) {
      alert('Please enter an event name');
      return;
    }
    
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }
    
    if (!startTime || !endTime || startTime >= endTime) {
      alert('Please select valid start and end times');
      return;
    }

    onAddBlock({
      eventName: trimmedName,
      days: selectedDays,
      startTime,
      endTime,
      color: selectedColor
    });

    resetForm();
    onClose();
  }

  function handleCancel() {
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container custom-block-modal-size" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Custom Time Block</h3>
          <button className="modal-close" onClick={handleCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="eventName">Event Name</label>
            <input
              type="text"
              id="eventName"
              className="form-input"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., Gym, Lunch, Club Meeting"
              required
            />
          </div>

          <div className="form-group">
            <label>Days</label>
            <div className="days-selector">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`day-button ${selectedDays.includes(day) ? 'selected' : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="time-group">
            <div className="form-group">
              <label htmlFor="startTime">Start Time</label>
              <input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time</label>
              <input
                type="time"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-selector">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomBlockModal;