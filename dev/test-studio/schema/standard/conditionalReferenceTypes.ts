import {BookIcon, ImageIcon, MicrophoneIcon, UsersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Example demonstrating conditional reference type filtering.
 *
 * Use case: A book document has a "format" field. When adding a creator reference,
 * only relevant creator types should be available based on the book format:
 * - "written" -> only show "writer"
 * - "audiobook" -> only show "narrator"
 * - "graphic" -> only show "illustrator"
 * - (none selected) -> show all creator types
 */

// Creator types
export const writer = defineType({
  name: 'writer',
  type: 'document',
  title: 'Writer',
  icon: BookIcon,
  fields: [
    defineField({name: 'name', type: 'string', title: 'Name'}),
    defineField({name: 'bio', type: 'text', title: 'Biography'}),
  ],
})

export const narrator = defineType({
  name: 'narrator',
  type: 'document',
  title: 'Narrator',
  icon: MicrophoneIcon,
  fields: [
    defineField({name: 'name', type: 'string', title: 'Name'}),
    defineField({name: 'voiceStyle', type: 'string', title: 'Voice Style'}),
  ],
})

export const illustrator = defineType({
  name: 'illustrator',
  type: 'document',
  title: 'Illustrator',
  icon: ImageIcon,
  fields: [
    defineField({name: 'name', type: 'string', title: 'Name'}),
    defineField({name: 'artStyle', type: 'string', title: 'Art Style'}),
  ],
})

// Main document with conditional reference filtering
export const conditionalRefBook = defineType({
  name: 'conditionalRefBook',
  type: 'document',
  title: 'Book (Conditional Refs)',
  icon: BookIcon,
  description: 'Demonstrates filterTypes for conditional reference type filtering',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
    }),
    defineField({
      name: 'format',
      type: 'string',
      title: 'Format',
      description: 'Select a format to filter available creator types',
      options: {
        list: [
          {title: 'Written Book', value: 'written'},
          {title: 'Audiobook', value: 'audiobook'},
          {title: 'Graphic Novel', value: 'graphic'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'creator',
      type: 'reference',
      title: 'Creator',
      description: 'Available types depend on the selected format above',
      to: [{type: 'writer'}, {type: 'narrator'}, {type: 'illustrator'}],
      options: {
        filterTypes: ({document}) => {
          const format = document?.format as string | undefined

          switch (format) {
            case 'written':
              return ['writer']
            case 'audiobook':
              return ['narrator']
            case 'graphic':
              return ['illustrator']
            default:
              // No format selected - show all types
              return ['writer', 'narrator', 'illustrator']
          }
        },
      },
    }),
    defineField({
      name: 'contributors',
      type: 'array',
      title: 'Contributors',
      description: 'Array of references - each item can filter based on its own role field',
      of: [
        {
          type: 'object',
          name: 'contributor',
          title: 'Contributor',
          icon: UsersIcon,
          fields: [
            defineField({
              name: 'role',
              type: 'string',
              title: 'Role',
              options: {
                list: [
                  {title: 'Writer', value: 'writer'},
                  {title: 'Narrator', value: 'narrator'},
                  {title: 'Illustrator', value: 'illustrator'},
                ],
              },
            }),
            defineField({
              name: 'person',
              type: 'reference',
              title: 'Person',
              description: 'Type filtered based on role selection',
              to: [{type: 'writer'}, {type: 'narrator'}, {type: 'illustrator'}],
              options: {
                filterTypes: ({parent}) => {
                  const role = (parent as {role?: string})?.role

                  switch (role) {
                    case 'writer':
                      return ['writer']
                    case 'narrator':
                      return ['narrator']
                    case 'illustrator':
                      return ['illustrator']
                    default:
                      return ['writer', 'narrator', 'illustrator']
                  }
                },
              },
            }),
          ],
          preview: {
            select: {
              role: 'role',
              personName: 'person.name',
            },
            prepare({role, personName}) {
              return {
                title: personName || '(No person selected)',
                subtitle: role || '(No role)',
              }
            },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      format: 'format',
    },
    prepare({title, format}) {
      return {
        title: title || 'Untitled',
        subtitle: format ? `Format: ${format}` : 'No format selected',
      }
    },
  },
})

export const conditionalReferenceTypes = [writer, narrator, illustrator, conditionalRefBook]
