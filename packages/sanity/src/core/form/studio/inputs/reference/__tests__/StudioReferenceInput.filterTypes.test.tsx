import {describe, expect, test, vi} from 'vitest'

import {resolveCreateTypeFilter} from '../resolveCreateTypeFilter'

/**
 * Integration tests for filterTypes in StudioReferenceInput.
 *
 * Note: Full component rendering tests are complex due to the many providers
 * required by StudioReferenceInput. These tests verify the integration at
 * the resolveCreateTypeFilter level which is called by the component.
 *
 * The filter resolution is tested thoroughly in resolveCreateTypeFilter.test.ts.
 * These tests verify specific integration scenarios.
 */
describe('StudioReferenceInput filterTypes integration', () => {
  describe('filter updates when document changes (TEST-02)', () => {
    test('filter result changes when document field values change', () => {
      const filterTypes = ({document}: any) => {
        switch (document.bookFormat) {
          case 'written':
            return ['writer']
          case 'audiobook':
            return ['narrator']
          case 'graphic':
            return ['illustrator']
          default:
            return ['writer', 'narrator', 'illustrator']
        }
      }

      const schemaType = {
        to: [{name: 'writer'}, {name: 'narrator'}, {name: 'illustrator'}],
        options: {filterTypes},
      } as any

      const baseOptions = {
        schemaType,
        valuePath: ['creator'],
      }

      // Initial state - no format selected
      const result1 = resolveCreateTypeFilter({
        ...baseOptions,
        document: {_id: 'book1', _type: 'book'},
      })
      expect(result1).toEqual(['writer', 'narrator', 'illustrator'])

      // User selects "written" format
      const result2 = resolveCreateTypeFilter({
        ...baseOptions,
        document: {_id: 'book1', _type: 'book', bookFormat: 'written'},
      })
      expect(result2).toEqual(['writer'])

      // User changes to "audiobook" format
      const result3 = resolveCreateTypeFilter({
        ...baseOptions,
        document: {_id: 'book1', _type: 'book', bookFormat: 'audiobook'},
      })
      expect(result3).toEqual(['narrator'])

      // User changes to "graphic" format
      const result4 = resolveCreateTypeFilter({
        ...baseOptions,
        document: {_id: 'book1', _type: 'book', bookFormat: 'graphic'},
      })
      expect(result4).toEqual(['illustrator'])
    })
  })

  describe('filter with parent context in nested fields', () => {
    test('filter can use parent object values in array items', () => {
      const filterTypes = ({parent}: any) => {
        if (parent?.itemType === 'featured') {
          return ['premiumAuthor']
        }
        return ['author', 'premiumAuthor']
      }

      const schemaType = {
        to: [{name: 'author'}, {name: 'premiumAuthor'}],
        options: {filterTypes},
      } as any

      const document = {
        _id: 'doc1',
        _type: 'collection',
        items: [
          {_key: 'a', itemType: 'regular', authorRef: null},
          {_key: 'b', itemType: 'featured', authorRef: null},
        ],
      }

      // Regular item - both types available
      const result1 = resolveCreateTypeFilter({
        schemaType,
        document,
        valuePath: ['items', {_key: 'a'}, 'authorRef'],
      })
      expect(result1).toEqual(['author', 'premiumAuthor'])

      // Featured item - only premium available
      const result2 = resolveCreateTypeFilter({
        schemaType,
        document,
        valuePath: ['items', {_key: 'b'}, 'authorRef'],
      })
      expect(result2).toEqual(['premiumAuthor'])
    })
  })

  describe('filter isolation (FILTER-03)', () => {
    test('filterTypes does not affect search behavior', () => {
      // This is a design verification test
      // filterTypes only affects createOptions, not onSearch
      // The resolveCreateTypeFilter utility is only called for createOptions
      // and is completely separate from resolveUserDefinedFilter used for search

      const filterTypes = vi.fn().mockReturnValue(['book'])
      const filter = vi.fn() // search filter

      const schemaType = {
        to: [{name: 'book'}, {name: 'author'}],
        options: {
          filterTypes,
          filter, // This is the search filter - separate concern
        },
      } as any

      // Only filterTypes is called by resolveCreateTypeFilter
      resolveCreateTypeFilter({
        schemaType,
        document: {_id: 'doc1', _type: 'test'},
        valuePath: ['ref'],
      })

      expect(filterTypes).toHaveBeenCalled()
      expect(filter).not.toHaveBeenCalled() // search filter not touched
    })
  })
})
