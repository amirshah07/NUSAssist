import Navbar from "../components/Navbar";
import Timetable_comp from "../components/Timetable_comp";
import type { TimetableBlock } from "../types";

const sampleBlocks: TimetableBlock[] = [
    {
      moduleCode: 'CS2040S',
      lessonType: 'Lecture',
      classNo: '1',
      day: 'Monday',
      startTime: '14:00',
      endTime: '16:00',
      venue: 'LT27',
      color: '#4285F4',
    },
    {
      moduleCode: 'CS2030S',
      lessonType: 'Tutorial',
      classNo: '3',
      day: 'Wednesday',
      startTime: '10:00',
      endTime: '12:00',
      venue: 'COM1-0209',
      color: '#34A853',
    }
  ];

export default function Timetable() {
    return (
        <> 
        <Navbar />
        <Timetable_comp blocks={sampleBlocks} />
        </>
    )
}