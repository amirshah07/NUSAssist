import type { Semester } from '../../components/Gpa/GpaCalculations';
import { calculateTotalMCs } from '../../components/Gpa/GpaCalculations';

interface SemesterInfo {
  year: number;
  semesterType: string; // '1', '2', 'ST1', 'ST2'
}

/**
 * Parse semester ID to extract year and semester info
 */
function parseSemesterId(semesterId: string): SemesterInfo | null {
  const match = semesterId.match(/Y(\d)S(\w+)/);
  if (!match) return null;
  
  return {
    year: parseInt(match[1]),
    semesterType: match[2]
  };
}

/**
 * Find the latest semester from the semesters array
 */
function findLatestSemester(semesters: Semester[]): SemesterInfo | null {
  if (semesters.length === 0) return null;
  
  let latest: SemesterInfo | null = null;
  
  semesters.forEach(semester => {
    const info = parseSemesterId(semester.id);
    if (!info) return;
    
    if (!latest) {
      latest = info;
      return;
    }
    
    // Compare years first
    if (info.year > latest.year) {
      latest = info;
      return;
    }
    
    // If same year, compare semester types
    if (info.year === latest.year) {
      const semOrder: { [key: string]: number } = {
        '1': 1,
        '2': 2,
        'ST1': 3,
        'ST2': 4
      };
      
      const currentOrder = semOrder[info.semesterType] || 0;
      const latestOrder = semOrder[latest.semesterType] || 0;
      
      if (currentOrder > latestOrder) {
        latest = info;
      }
    }
  });
  
  return latest;
}

/**
 * Calculate the next semester based on progression rules
 */
export function getNextSemester(semesters: Semester[]): string {
  const totalMCs = calculateTotalMCs(semesters);
  
  // Check if graduated
  if (totalMCs >= 160) {
    return "Graduated!";
  }
  
  const latest = findLatestSemester(semesters);
  
  // If no semesters added yet
  if (!latest) {
    return "Year 1 Semester 1";
  }
  
  let nextYear = latest.year;
  let nextSemesterType = '1';
  
  // Determine next semester
  if (latest.semesterType === '1') {
    // Sem 1 -> Sem 2 (same year)
    nextSemesterType = '2';
  } else {
    // Sem 2/ST1/ST2 -> Sem 1 (next year)
    nextYear = latest.year + 1;
    nextSemesterType = '1';
  }
  
  // Cap at Year 5 Semester 2
  if (nextYear > 5 || (nextYear === 5 && nextSemesterType === '2' && 
      (latest.year === 5 && latest.semesterType === '2'))) {
    return "Year 5 Semester 2";
  }
  
  return `Year ${nextYear} Semester ${nextSemesterType}`;
}

/**
 * Calculate progress percentage (capped at 100%)
 */
export function getProgressPercentage(totalMCs: number): number {
  const percentage = (totalMCs / 160) * 100;
  return Math.min(percentage, 100);
}