import { describe, it, expect } from 'vitest'
import { extractPrerequisiteCodes, buildRoadmapFromModules } from './RoadmapUtils'

describe('RoadmapUtils', () => {
  
  describe('extractPrerequisiteCodes', () => {
    const availableModules = new Set(['CS1010', 'CS2040', 'MA1521'])

    it('should extract single prerequisite', () => {
      // Arrange
      const prereqs = 'CS1010'

      // Act
      const result = extractPrerequisiteCodes(prereqs, availableModules)

      // Assert
      expect(result).toEqual(['CS1010'])
    })

    it('should handle OR prerequisites (CS1010/CS1010S)', () => {
      // Arrange
      const prereqs = 'CS1010/CS1010S'

      // Act
      const result = extractPrerequisiteCodes(prereqs, availableModules)

      // Assert
      expect(result).toEqual(['CS1010']) // Takes first available
    })

    it('should skip unavailable modules', () => {
      // Arrange
      const prereqs = 'CS9999' // Not in available modules

      // Act
      const result = extractPrerequisiteCodes(prereqs, availableModules)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('buildRoadmapFromModules', () => {
    it('should create nodes for each module', () => {
      // Arrange
      const modules = [
        {
          moduleCode: 'CS1010',
          title: 'Programming',
          modulecredit: 4
        },
        {
          moduleCode: 'CS2040',
          title: 'Data Structures',
          modulecredit: 4
        }
      ]

      // Act
      const result = buildRoadmapFromModules(modules)

      // Assert
      expect(result.nodes).toHaveLength(2)
      expect(result.nodes[0].id).toBe('cs1010')
      expect(result.nodes[0].data.moduleCode).toBe('CS1010')
      expect(result.nodes[0].data.status).toBe('locked')
    })

    it('should create edges for prerequisites', () => {
      // Arrange
      const modules = [
        {
          moduleCode: 'CS1010',
          title: 'Programming',
          modulecredit: 4
        },
        {
          moduleCode: 'CS2040',
          title: 'Data Structures',
          modulecredit: 4,
          hard_prerequisites: 'CS1010'
        }
      ]

      // Act
      const result = buildRoadmapFromModules(modules)

      // Assert
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].source).toBe('cs1010')
      expect(result.edges[0].target).toBe('cs2040')
    })

    it('should handle modules without prerequisites', () => {
      // Arrange
      const modules = [
        {
          moduleCode: 'GER1000',
          title: 'General Education',
          modulecredit: 4
        }
      ]

      // Act
      const result = buildRoadmapFromModules(modules)

      // Assert
      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
    })
  })
})