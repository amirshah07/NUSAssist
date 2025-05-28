import React, { useMemo } from 'react';
import './Timetable.css';
import type { TimetableBlock } from '../types';

interface Props {
  blocks: TimetableBlock[];
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–8pm

const Timetable: React.FC<Props> = ({ blocks }) => {
  // Memoize block positions to avoid recalculating on every render
  const blockPositions = useMemo(() => {
    const positions: { [key: string]: number } = {};

    const getBlockPosition = (day: string, hour: number, startTime: string, endTime: string) => {
      const start = parseInt(startTime.split(':')[0]);
      const end = parseInt(endTime.split(':')[0]);

      if (start === hour) {
        const key = `${day}-${hour}`;
        const currentPosition = positions[key] || 0;
        positions[key] = currentPosition + 1; // Increment position for overlapping blocks
        return currentPosition;
      }

      return 0;
    };

    // Iterate over the blocks to calculate positions
    blocks.forEach((block) => {
      const start = parseInt(block.startTime.split(':')[0]);
      const end = parseInt(block.endTime.split(':')[0]);

      for (let hour = start; hour < end; hour++) {
        getBlockPosition(block.day, hour, block.startTime, block.endTime);
      }
    });

    return positions;
  }, [blocks]); // Recompute only if blocks change

  return (
    <div className="timetable-container">
      <div className="timetable-grid">
        {/* Day Headers */}
        <div className="timetable-cell header blank" />
        {days.map((day) => (
          <div key={day} className="timetable-cell header day">
            {day}
          </div>
        ))}

        {/* Time Rows */}
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="timetable-cell header time">{hour}:00</div>
            {days.map((day) => (
              <div key={`${day}-${hour}`} className="timetable-cell slot">
                {blocks.map((block, index) => {
                  const start = parseInt(block.startTime.split(':')[0]);
                  const end = parseInt(block.endTime.split(':')[0]);
                  if (block.day === day && start === hour) {
                    const position = blockPositions[`${day}-${hour}`] || 0;
                    const duration = end - start;

                    return (
                      <div
                        key={index}
                        className={`timetable-block ${position > 0 ? 'overlay' : ''}`}
                        style={{
                          backgroundColor: block.color || '#999',
                          height: `${duration * 60}px`,
                          left: `${position * 100}%`, // Offset to avoid overlap
                        }}
                      >
                        <strong>{block.moduleCode}</strong> <br />
                        {block.lessonType} ({block.classNo})<br />
                        {block.venue}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Timetable;
