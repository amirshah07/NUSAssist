export interface Module {
  code: string;
  name: string;
  mcs: number;
  grade: string;
  gradePoint: number;
  suUsed?: boolean;
  showActualGrade?: boolean;
}

export interface Semester {
  id: string;
  name: string;
  modules: Module[];
}

export const gradeOptions = [
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
  { grade: 'F', point: 0.0 },
  { grade: 'CS', point: 0 },
  { grade: 'CU', point: 0 }
];

// Get grade point from grade letter
export function getGradePoint(grade: string): number {
  const gradeOption = gradeOptions.find(opt => opt.grade === grade);
  return gradeOption ? gradeOption.point : 0;
}

// Calculate CAP for all semesters
export function calculateCAP(semesters: Semester[]): string {
  let totalGradePoints = 0;
  let totalGradedMCs = 0;

  semesters.forEach(semester => {
    semester.modules.forEach(module => {
      // Only count graded modules (not CS/CU or S/U used)
      if (!['CS', 'CU'].includes(module.grade) && !module.suUsed) {
        totalGradePoints += module.gradePoint * module.mcs;
        totalGradedMCs += module.mcs;
      }
    });
  });

  if (totalGradedMCs === 0) return '0.00';
  return (totalGradePoints / totalGradedMCs).toFixed(2);
}

// Calculate CAP for a single semester
export function calculateSemesterCAP(modules: Module[]): string {
  let totalGradePoints = 0;
  let totalGradedMCs = 0;

  modules.forEach(module => {
    if (!['CS', 'CU'].includes(module.grade) && !module.suUsed) {
      totalGradePoints += module.gradePoint * module.mcs;
      totalGradedMCs += module.mcs;
    }
  });

  if (totalGradedMCs === 0) return '0.00';
  return (totalGradePoints / totalGradedMCs).toFixed(2);
}

// Calculate total MCs (all modules including CS/CU/S/U)
export function calculateTotalMCs(semesters: Semester[]): number {
  return semesters.reduce((total, semester) => 
    total + semester.modules.reduce((semTotal, module) => semTotal + module.mcs, 0), 
    0
  );
}

// Calculate graded MCs (excluding CS/CU and S/U used modules)
export function calculateGradedMCs(semesters: Semester[]): number {
  return semesters.reduce((total, semester) => 
    total + semester.modules.reduce((semTotal, module) => 
      !['CS', 'CU'].includes(module.grade) && !module.suUsed ? semTotal + module.mcs : semTotal, 
      0
    ), 
    0
  );
}

// Calculate projected CAP with planning modules
export function calculateProjectedCAP(semesters: Semester[], planningModules: Partial<Module>[]): string {
  let totalGradePoints = 0;
  let totalGradedMCs = 0;

  // Add existing graded modules
  semesters.forEach(semester => {
    semester.modules.forEach(module => {
      if (!['CS', 'CU'].includes(module.grade) && !module.suUsed) {
        totalGradePoints += module.gradePoint * module.mcs;
        totalGradedMCs += module.mcs;
      }
    });
  });

  // Add planning modules
  planningModules.forEach(module => {
    if (module.code && module.grade && module.gradePoint !== undefined && module.mcs) {
      if (!['CS', 'CU'].includes(module.grade) && !module.suUsed) {
        totalGradePoints += module.gradePoint * module.mcs;
        totalGradedMCs += module.mcs;
      }
    }
  });

  if (totalGradedMCs === 0) return '0.00';
  return (totalGradePoints / totalGradedMCs).toFixed(3);
}

// Get display grade (handles S/U toggle)
export function getDisplayGrade(module: Module): string {
  if (module.suUsed && !module.showActualGrade) {
    // Show S for passing grades, U for F
    return module.grade === 'F' ? 'U' : 'S';
  }
  return module.grade;
}

// Get colour class based on grade
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
    case 'A-':
      return 'grade-excellent';
    case 'B+':
    case 'B':
      return 'grade-good';
    case 'B-':
    case 'C+':
    case 'C':
      return 'grade-average';
    case 'D+':
    case 'D':
      return 'grade-poor';
    case 'F':
      return 'grade-poor';
    case 'CS':
    case 'CU':
    case 'S':
    case 'U':
      return 'grade-su';
    default:
      return '';
  }
}

export const sortSemesters = (semesters: Semester[]): Semester[] => {
  return [...semesters].sort((a, b) => {
    // Extract year and semester from IDs like "Y1S1", "Y2ST1"
    const aMatch = a.id.match(/Y(\d)S(\w+)/);
    const bMatch = b.id.match(/Y(\d)S(\w+)/);
    
    if (!aMatch || !bMatch) return 0;
    
    const aYear = parseInt(aMatch[1]);
    const bYear = parseInt(bMatch[1]);
    
    // First sort by year
    if (aYear !== bYear) {
      return aYear - bYear;
    }
    
    // Then sort by semester within the same year
    const aSem = aMatch[2];
    const bSem = bMatch[2];
    
    // Define semester order: 1, 2, ST1, ST2
    const semOrder: { [key: string]: number } = {
      '1': 1,
      '2': 2,
      'ST1': 3,
      'ST2': 4
    };
    
    return (semOrder[aSem] || 0) - (semOrder[bSem] || 0);
  });
};

