import {describe, expect, test, vi} from 'vitest'

import {resolveCreateTypeFilter} from '../resolveCreateTypeFilter'

// Helper to create a minimal schema type for testing
function createSchemaType(toTypes: string[], filterTypes?: (ctx: any) => string[]) {
  return {
    to: toTypes.map((name) => ({name})),
    options: filterTypes ? {filterTypes} : undefined,
  } as any
}

describe('resolveCreateTypeFilter', () => {
  describe('backward compatibility', () => {
    test('returns all types when no filterTypes option provided', () => {
      const result = resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author', 'editor']),
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['someRef'],
      })

      expect(result).toEqual(['book', 'author', 'editor'])
    })

    test('returns all types when options is undefined', () => {
      const schemaType = {to: [{name: 'book'}]} as any
      const result = resolveCreateTypeFilter({
        schemaType,
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['someRef'],
      })

      expect(result).toEqual(['book'])
    })
  })

  describe('filter function execution', () => {
    test('passes correct context to filter function', () => {
      const filterTypes = vi.fn().mockReturnValue(['book'])

      const document = {_id: 'doc1', _type: 'test', category: 'fiction'}

      resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author'], filterTypes),
        document,
        valuePath: ['creator'],
      })

      expect(filterTypes).toHaveBeenCalledWith({
        document,
        parent: document,
        parentPath: [],
        availableTypes: ['book', 'author'],
      })
    })

    test('resolves parent correctly for nested paths', () => {
      const filterTypes = vi.fn().mockReturnValue(['book'])

      const document = {
        _id: 'doc1',
        _type: 'test',
        nested: {field: 'value', ref: null},
      }

      resolveCreateTypeFilter({
        schemaType: createSchemaType(['book'], filterTypes),
        document,
        valuePath: ['nested', 'ref'],
      })

      expect(filterTypes).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: {field: 'value', ref: null},
          parentPath: ['nested'],
        }),
      )
    })

    test('returns filtered types when filter returns valid subset', () => {
      const result = resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author', 'editor'], () => ['book', 'author']),
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['ref'],
      })

      expect(result).toEqual(['book', 'author'])
    })

    test('filters based on document values', () => {
      const filterTypes = ({document}: any) => {
        return document.category === 'fiction' ? ['novel', 'story'] : ['manual', 'guide']
      }

      const resultFiction = resolveCreateTypeFilter({
        schemaType: createSchemaType(['novel', 'story', 'manual', 'guide'], filterTypes),
        document: {_id: 'doc1', _type: 'test', category: 'fiction'},
        valuePath: ['ref'],
      })

      const resultNonFiction = resolveCreateTypeFilter({
        schemaType: createSchemaType(['novel', 'story', 'manual', 'guide'], filterTypes),
        document: {_id: 'doc2', _type: 'test', category: 'nonfiction'},
        valuePath: ['ref'],
      })

      expect(resultFiction).toEqual(['novel', 'story'])
      expect(resultNonFiction).toEqual(['manual', 'guide'])
    })
  })

  describe('error handling and fallbacks', () => {
    test('returns all types when filter throws error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author'], () => {
          throw new Error('Filter failed')
        }),
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['ref'],
      })

      expect(result).toEqual(['book', 'author'])
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in reference filterTypes function'),
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })

    test('returns all types when filter returns empty array', () => {
      const result = resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author'], () => []),
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['ref'],
      })

      expect(result).toEqual(['book', 'author'])
    })

    test('returns all types when filter returns non-array', () => {
      const result = resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author'], () => 'book' as any),
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['ref'],
      })

      expect(result).toEqual(['book', 'author'])
    })

    test('filters out invalid type names not in schema', () => {
      const result = resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author'], () => ['book', 'invalid', 'notreal']),
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['ref'],
      })

      expect(result).toEqual(['book'])
    })

    test('returns all types when all filtered types are invalid', () => {
      const result = resolveCreateTypeFilter({
        schemaType: createSchemaType(['book', 'author'], () => ['invalid', 'notreal']),
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['ref'],
      })

      expect(result).toEqual(['book', 'author'])
    })
  })
})
