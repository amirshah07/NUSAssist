import { describe, it, expect } from 'vitest'
import { getNextSemester, getProgressPercentage } from './ProgressUtils'
import type { Semester } from '../../components/Gpa/GpaCalculations'

describe('ProgressUtils', () => {
  
  describe('getNextSemester', () => {
    it('should return Year 1 Semester 1 when no semesters', () => {
      // Arrange
      const semesters: Semester[] = []
      
      // Act
      const result = getNextSemester(semesters)
      
      // Assert
      expect(result).toBe('Year 1 Semester 1')
    })

    it('should return next semester after Y1S1', () => {
      // Arrange
      const semesters: Semester[] = [
        {
          id: 'Y1S1',
          name: 'Year 1 Semester 1',
          modules: []
        }
      ]
      
      // Act
      const result = getNextSemester(semesters)
      
      // Assert
      expect(result).toBe('Year 1 Semester 2')
    })

    it('should advance to next year after semester 2', () => {
      // Arrange
      const semesters: Semester[] = [
        {
          id: 'Y1S2',
          name: 'Year 1 Semester 2',
          modules: []
        }
      ]
      
      // Act
      const result = getNextSemester(semesters)
      
      // Assert
      expect(result).toBe('Year 2 Semester 1')
    })

    it('should show graduated when 160 MCs completed', () => {
      // Arrange
      const semesters: Semester[] = [
        {
          id: 'Y4S2',
          name: 'Year 4 Semester 2',
          modules: [
            // Mock modules totaling 160 MCs
            { code: 'CS1010', name: 'Test', mcs: 160, grade: 'A', gradePoint: 5.0 }
          ]
        }
      ]
      
      // Act
      const result = getNextSemester(semesters)
      
      // Assert
      expect(result).toBe('Graduated!')
    })

    it('should cap at Year 5 Semester 2', () => {
      // Arrange
      const semesters: Semester[] = [
        {
          id: 'Y5S2',
          name: 'Year 5 Semester 2',
          modules: []
        }
      ]
      
      // Act
      const result = getNextSemester(semesters)
      
      // Assert
      expect(result).toBe('Year 5 Semester 2')
    })
  })

  describe('getProgressPercentage', () => {
    it('should calculate percentage correctly', () => {
      // Arrange
      const totalMCs = 80
      
      // Act
      const result = getProgressPercentage(totalMCs)
      
      // Assert
      expect(result).toBe(50) // 80/160 * 100 = 50%
    })

    it('should cap at 100%', () => {
      // Arrange
      const totalMCs = 200 // More than 160
      
      // Act
      const result = getProgressPercentage(totalMCs)
      
      // Assert
      expect(result).toBe(100)
    })

    it('should handle zero MCs', () => {
      // Arrange
      const totalMCs = 0
      
      // Act
      const result = getProgressPercentage(totalMCs)
      
      // Assert
      expect(result).toBe(0)
    })
  })
})