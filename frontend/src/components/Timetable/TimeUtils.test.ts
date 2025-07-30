import { describe, it, expect } from 'vitest'
import { TimeUtils } from './TimeUtils'

describe('TimeUtils', () => {

  describe('normalize', () => {
    it('should convert 4-digit time to HH:MM format', () => {
      // Arrange
      const input = '1430'
      
      // Act
      const result = TimeUtils.normalize(input)
      
      // Assert
      expect(result).toBe('14:30')
    })

    it('should keep already formatted time unchanged', () => {
      // Arrange
      const input = '14:30'
      
      // Act
      const result = TimeUtils.normalize(input)
      
      // Assert
      expect(result).toBe('14:30')
    })
  })

  describe('toMinutes', () => {
    it('should convert time to minutes', () => {
      // Arrange
      const input = '14:30'
      
      // Act
      const result = TimeUtils.toMinutes(input)
      
      // Assert
      expect(result).toBe(870) // 14*60 + 30
    })

    it('should work with 4-digit format', () => {
      // Arrange
      const input = '1000'
      
      // Act
      const result = TimeUtils.toMinutes(input)
      
      // Assert
      expect(result).toBe(600) // 10*60
    })
  })

  describe('formatDisplay', () => {
    it('should format morning time with AM', () => {
      // Arrange
      const input = '0800'
      
      // Act
      const result = TimeUtils.formatDisplay(input)
      
      // Assert
      expect(result).toBe('8:00 AM')
    })

    it('should format afternoon time with PM', () => {
      // Arrange
      const input = '1400'
      
      // Act
      const result = TimeUtils.formatDisplay(input)
      
      // Assert
      expect(result).toBe('2:00 PM')
    })

    it('should handle noon correctly', () => {
      // Arrange
      const input = '1200'
      
      // Act
      const result = TimeUtils.formatDisplay(input)
      
      // Assert
      expect(result).toBe('12:00 PM')
    })
  })

  describe('blocksOverlap', () => {
    it('should detect overlapping blocks', () => {
      // Arrange
      const block1 = {
        startTime: '14:00',
        endTime: '16:00'
      }
      const block2 = {
        startTime: '15:00',
        endTime: '17:00'
      }
      
      // Act
      const result = TimeUtils.blocksOverlap(block1, block2)
      
      // Assert
      expect(result).toBe(true)
    })

    it('should detect non-overlapping blocks', () => {
      // Arrange
      const block1 = {
        startTime: '14:00',
        endTime: '15:00'
      }
      const block2 = {
        startTime: '16:00',
        endTime: '17:00'
      }
      
      // Act
      const result = TimeUtils.blocksOverlap(block1, block2)
      
      // Assert
      expect(result).toBe(false)
    })
  })
})