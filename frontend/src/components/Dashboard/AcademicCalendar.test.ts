import { describe, it, expect } from 'vitest'
import { getCurrentSemesterInfo, getWeeksUntil, getUpcomingEvents } from './AcademicCalendar'

describe('AcademicCalendar', () => {
  
  describe('getCurrentSemesterInfo', () => {
    it('should return semester 1 info during semester 1', () => {
      // Arrange
      const dateInSem1 = new Date('2025-08-20') // Week 2 of Sem 1
      
      // Act
      const result = getCurrentSemesterInfo(dateInSem1)
      
      // Assert
      expect(result.semester).toBe(1)
      expect(result.week).toBe('2')
      expect(result.displayWeek).toBe('Week 2')
    })

    it('should return semester 2 info during semester 2', () => {
      // Arrange
      const dateInSem2 = new Date('2026-01-20') // Week 2 of Sem 2
      
      // Act
      const result = getCurrentSemesterInfo(dateInSem2)
      
      // Assert
      expect(result.semester).toBe(2)
      expect(result.week).toBe('2')
      expect(result.displayWeek).toBe('Week 2')
    })

    it('should return null during vacation', () => {
      // Arrange
      const dateInVacation = new Date('2025-12-25') // Winter vacation
      
      // Act
      const result = getCurrentSemesterInfo(dateInVacation)
      
      // Assert
      expect(result.semester).toBe(null)
      expect(result.week).toBe(null)
      expect(result.displayWeek).toBe(null)
    })

    it('should identify special weeks correctly', () => {
      // Arrange
      const recessDate = new Date('2025-09-22') // Recess week
      const readingDate = new Date('2025-11-17') // Reading week
      const examDate = new Date('2025-11-25') // Exam period
      
      // Act & Assert
      expect(getCurrentSemesterInfo(recessDate).displayWeek).toBe('Recess Week')
      expect(getCurrentSemesterInfo(readingDate).displayWeek).toBe('Reading Week')
      expect(getCurrentSemesterInfo(examDate).displayWeek).toBe('Exam Period')
    })
  })

  describe('getWeeksUntil', () => {
    it('should calculate weeks until future date', () => {
      // Arrange
      const fromDate = new Date('2025-08-01')
      const targetDate = new Date('2025-08-15') // 2 weeks later
      
      // Act
      const result = getWeeksUntil(targetDate, fromDate)
      
      // Assert
      expect(result).toBe(2)
    })

    it('should return 0 for past dates', () => {
      // Arrange
      const fromDate = new Date('2025-08-15')
      const targetDate = new Date('2025-08-01') // Past date
      
      // Act
      const result = getWeeksUntil(targetDate, fromDate)
      
      // Assert
      expect(result).toBe(0)
    })
  })

  describe('getUpcomingEvents', () => {
    it('should return upcoming events during semester', () => {
      // Arrange
      const dateInSem1 = new Date('2025-08-20') // Early in Sem 1
      
      // Act
      const events = getUpcomingEvents(dateInSem1)
      
      // Assert
      expect(events.length).toBeGreaterThan(0)
      expect(events[0]).toHaveProperty('name')
      expect(events[0]).toHaveProperty('date')
      expect(events[0]).toHaveProperty('weeksUntil')
    })

    it('should show semester start during vacation', () => {
      // Arrange
      const dateInVacation = new Date('2025-12-25')
      
      // Act
      const events = getUpcomingEvents(dateInVacation)
      
      // Assert
      expect(events.length).toBeGreaterThan(0)
      expect(events[0].name).toContain('Semester')
    })
  })
})