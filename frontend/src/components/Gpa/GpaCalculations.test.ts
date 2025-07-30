import { describe, it, expect } from 'vitest'
import {
  calculateCAP,
  calculateSemesterCAP,
  getGradePoint,
  getDisplayGrade
} from './GpaCalculations'
import type { Semester, Module } from './GpaCalculations'

describe('GpaCalculations', () => {
  
  describe('getGradePoint', () => {
    it('should return correct points for common grades', () => {
      // Arrange & Act & Assert
      expect(getGradePoint('A')).toBe(5.0)
      expect(getGradePoint('B+')).toBe(4.0)
      expect(getGradePoint('C')).toBe(2.0)
      expect(getGradePoint('F')).toBe(0.0)
    })
  })

  describe('calculateSemesterCAP', () => {
    it('should calculate CAP for normal modules', () => {
      // Arrange
      const modules: Module[] = [
        { code: 'CS1010', name: 'Programming', mcs: 4, grade: 'A', gradePoint: 5.0 },
        { code: 'MA1521', name: 'Math', mcs: 4, grade: 'B+', gradePoint: 4.0 }
      ]

      // Act
      const cap = calculateSemesterCAP(modules)

      // Assert
      expect(cap).toBe('4.50')
    })

    it('should exclude S/U modules', () => {
      // Arrange
      const modules: Module[] = [
        { code: 'CS1010', name: 'Programming', mcs: 4, grade: 'A', gradePoint: 5.0 },
        { code: 'GER1000', name: 'GE', mcs: 4, grade: 'B', gradePoint: 3.5, suUsed: true }
      ]

      // Act
      const cap = calculateSemesterCAP(modules)

      // Assert
      expect(cap).toBe('5.00') // Only CS1010 counts
    })
  })

  describe('calculateCAP', () => {
    it('should calculate overall CAP across multiple semesters', () => {
      // Arrange
      const semesters: Semester[] = [
        {
          id: 'Y1S1',
          name: 'Year 1 Sem 1',
          modules: [{ code: 'CS1010', name: 'Prog', mcs: 4, grade: 'A', gradePoint: 5.0 }]
        },
        {
          id: 'Y1S2', 
          name: 'Year 1 Sem 2',
          modules: [{ code: 'CS2040', name: 'DS', mcs: 4, grade: 'B+', gradePoint: 4.0 }]
        }
      ]

      // Act
      const cap = calculateCAP(semesters)

      // Assert
      expect(cap).toBe('4.50')
    })
  })

  describe('getDisplayGrade', () => {
    it('should show S for passing S/U modules', () => {
      // Arrange
      const module: Module = {
        code: 'GER1000',
        name: 'GE',
        mcs: 4,
        grade: 'B+',
        gradePoint: 4.0,
        suUsed: true
      }

      // Act
      const displayGrade = getDisplayGrade(module)

      // Assert
      expect(displayGrade).toBe('S')
    })

    it('should show U for failing S/U modules', () => {
      // Arrange
      const module: Module = {
        code: 'GER1000',
        name: 'GE',
        mcs: 4,
        grade: 'F',
        gradePoint: 0.0,
        suUsed: true
      }

      // Act
      const displayGrade = getDisplayGrade(module)

      // Assert
      expect(displayGrade).toBe('U')
    })
  })
})