import {
  type Path,
  type ReferenceSchemaType,
  type ReferenceTypeFilterContext,
  type SanityDocument,
} from '@sanity/types'
import {get} from '@sanity/util/paths'

export interface ResolveCreateTypeFilterOptions {
  schemaType: ReferenceSchemaType
  document: SanityDocument
  valuePath: Path
}

/**
 * Resolves the filterTypes function from schema options and returns filtered type names.
 *
 * Behavior:
 * - If no filterTypes defined: returns all available types (backward compatible)
 * - If filterTypes throws: logs error and returns all types (fail-open)
 * - If filterTypes returns empty array: returns all types (fail-open)
 * - Otherwise: returns intersection of filterTypes result and available types
 */
export function resolveCreateTypeFilter(options: ResolveCreateTypeFilterOptions): string[] {
  const {schemaType, document, valuePath} = options

  const availableTypes = schemaType.to.map((refType) => refType.name)

  const filterFn = schemaType.options?.filterTypes
  if (!filterFn) {
    return availableTypes
  }

  const parentPath = valuePath.slice(0, -1)
  const parent = get(document, parentPath)

  const context: ReferenceTypeFilterContext = {
    document,
    parent,
    parentPath,
    availableTypes,
  }

  try {
    const filteredTypes = filterFn(context)

    if (!Array.isArray(filteredTypes) || filteredTypes.length === 0) {
      return availableTypes
    }

    // Only return types that are both in the filter result AND available in schema
    const validTypes = filteredTypes.filter((typeName) => availableTypes.includes(typeName))

    // If filter returned types but none are valid, fall back to all types
    return validTypes.length > 0 ? validTypes : availableTypes
  } catch (error) {
    console.error(
      '[sanity] Error in reference filterTypes function, falling back to all types:',
      error,
    )
    return availableTypes
  }
}
