// Interfaces
export interface Module {
  code: string;
  name: string;
  mcs: number;
  grade: string;
  gradePoint: number;
}

export interface Semester {
  id: string;
  name: string;
  modules: Module[];
}

export interface GradeOption {
  grade: string;
  point: number;
}

// Grade options constant
export const gradeOptions: GradeOption[] = [
  { grade: 'A+', point: 5.0 },
  { grade: 'A', point: 5.0 },
  { grade: 'A-', point: 4.5 },
  { grade: 'B+', point: 4.0 },
  { grade: 'B', point: 3.5 },
  { grade: 'B-', point: 3.0 },
  { grade: 'C+', point: 2.5 },
  { grade: 'C', point: 2.0 },
  { grade: 'D+', point: 1.5 },
  { grade: 'D', point: 1.0 },
  { grade: 'F', point: 0 },
  { grade: 'S', point: 0 },
  { grade: 'U', point: 0 },
  { grade: 'CS', point: 0 },
  { grade: 'CU', point: 0 }
];

// Calculate overall CAP from all semesters
export const calculateCAP = (semesters: Semester[]): string => {
  let totalGradePoints = 0;
  let totalGradedMCs = 0;

  semesters.forEach(sem => {
    sem.modules.forEach(mod => {
      if (mod.grade !== 'CS' && mod.grade !== 'CU' && mod.grade !== 'S' && mod.grade !== 'U') {
        totalGradePoints += mod.gradePoint * mod.mcs;
        totalGradedMCs += mod.mcs;
      }
    });
  });

  return totalGradedMCs > 0 ? (totalGradePoints / totalGradedMCs).toFixed(2) : '0.00';
};

// Calculate total MCs across all semesters
export const calculateTotalMCs = (semesters: Semester[]): number => {
  let total = 0;
  semesters.forEach(sem => {
    sem.modules.forEach(mod => {
      total += mod.mcs;
    });
  });
  return total;
};

// Calculate graded MCs (excluding S/U/CS/CU grades)
export const calculateGradedMCs = (semesters: Semester[]): number => {
  let total = 0;
  semesters.forEach(sem => {
    sem.modules.forEach(mod => {
      if (mod.grade !== 'CS' && mod.grade !== 'CU' && mod.grade !== 'S' && mod.grade !== 'U') {
        total += mod.mcs;
      }
    });
  });
  return total;
};

// Calculate CAP for a specific semester
export const calculateSemesterCAP = (modules: Module[]): string => {
  let totalGradePoints = 0;
  let totalGradedMCs = 0;

  modules.forEach(mod => {
    if (mod.grade !== 'CS' && mod.grade !== 'CU' && mod.grade !== 'S' && mod.grade !== 'U') {
      totalGradePoints += mod.gradePoint * mod.mcs;
      totalGradedMCs += mod.mcs;
    }
  });

  return totalGradedMCs > 0 ? (totalGradePoints / totalGradedMCs).toFixed(2) : '0.00';
};

// Calculate projected CAP including planning modules
export const calculateProjectedCAP = (
  semesters: Semester[], 
  planningModules: Partial<Module>[]
): string => {
  let currentGradePoints = 0;
  let currentGradedMCs = 0;

  // Add existing grades
  semesters.forEach(sem => {
    sem.modules.forEach(mod => {
      if (mod.grade !== 'CS' && mod.grade !== 'CU' && mod.grade !== 'S' && mod.grade !== 'U') {
        currentGradePoints += mod.gradePoint * mod.mcs;
        currentGradedMCs += mod.mcs;
      }
    });
  });

  // Add planning modules
  planningModules.forEach(mod => {
    if (mod.code && mod.grade !== 'CS' && mod.grade !== 'CU' && mod.grade !== 'S' && mod.grade !== 'U' && mod.gradePoint) {
      const mcs = mod.mcs || 4; // Default to 4 MCs if not specified
      currentGradePoints += mod.gradePoint * mcs;
      currentGradedMCs += mcs;
    }
  });

  return currentGradedMCs > 0 ? (currentGradePoints / currentGradedMCs).toFixed(2) : '0.00';
};

export const getGradeColor = (grade: string): string => {
  if (grade === 'A+' || grade === 'A') return 'grade-excellent';
  if (grade === 'A-' || grade === 'B+') return 'grade-good';
  if (grade === 'B' || grade === 'B-') return 'grade-average';
  if (grade === 'CS' || grade === 'CU' || grade === 'S' || grade === 'U') return 'grade-su';
  return 'grade-poor';
};

// Get grade point from grade
export const getGradePoint = (grade: string): number => {
  const gradeInfo = gradeOptions.find(g => g.grade === grade);
  return gradeInfo ? gradeInfo.point : 0;
};

// Sort semesters chronologically
export const sortSemesters = (semesters: Semester[]): Semester[] => {
  return [...semesters].sort((a, b) => {
    // Extract year and semester from ID (e.g., "Y1S2")
    const aYear = parseInt(a.id.match(/Y(\d)/)?.[1] || '0');
    const bYear = parseInt(b.id.match(/Y(\d)/)?.[1] || '0');
    
    if (aYear !== bYear) return aYear - bYear;
    
    // Order: Semester 1, Semester 2, Special Term 1, Special Term 2
    const semOrder: { [key: string]: number } = { '1': 1, '2': 2, 'ST1': 3, 'ST2': 4 };
    const aSem = a.id.match(/S(\w+)/)?.[1] || '1';
    const bSem = b.id.match(/S(\w+)/)?.[1] || '1';
    
    return (semOrder[aSem] || 0) - (semOrder[bSem] || 0);
  });
};