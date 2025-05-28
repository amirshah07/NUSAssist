import React from 'react';
import './Timetable.css';
import type { TimetableBlock } from '../types';

interface Props {
  blocks: TimetableBlock[];
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–8pm



const Timetable: React.FC<Props> = ({ blocks }) => {
  return (
    <div className="timetable-container">
      <div className="timetable-grid">
        {/* Day Headers */}
        <div className="timetable-cell header blank" />
        {days.map(day => (
          <div key={day} className="timetable-cell header day">{day}</div>
        ))}

        {/* Time Rows */}
        {hours.map(hour => (
          <React.Fragment key={hour}>
            <div className="timetable-cell header time">{hour}:00</div>
            {days.map(day => (
              <div key={`${day}-${hour}`} className="timetable-cell slot">
                {blocks.map((block, index) => {
                  const start = parseInt(block.startTime.split(':')[0]);
                  const end = parseInt(block.endTime.split(':')[0]);
                  if (block.day === day && start === hour) {
                    const duration = end - start;
                    return (
                      <div
                        key={index}
                        className="timetable-block"
                        style={{
                          backgroundColor: block.color || '#999',
                          height: `${duration * 60}px`,
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
