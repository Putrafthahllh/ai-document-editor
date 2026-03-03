import { SchemaType } from '@google/generative-ai'
import type { FunctionDeclarationsTool } from '@google/generative-ai'

const editorTools: FunctionDeclarationsTool = {
    functionDeclarations: [
        {
            name: 'update_doc_by_line',
            description:
                'Replace content of specific line(s) in the document. Use this when user asks to change specific lines.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    start_line: {
                        type: SchemaType.INTEGER,
                        description: 'Starting line number (1-indexed)',
                    },
                    end_line: {
                        type: SchemaType.INTEGER,
                        description: 'Ending line number (inclusive)',
                    },
                    new_content: {
                        type: SchemaType.STRING,
                        description: 'New content to replace the specified lines',
                    },
                },
                required: ['start_line', 'end_line', 'new_content'],
            },
        },
        {
            name: 'update_doc_by_replace',
            description:
                'Find and replace text in the document. Use when user wants to replace specific words/phrases.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    old_string: {
                        type: SchemaType.STRING,
                        description: 'Exact text to find (case-sensitive)',
                    },
                    new_string: {
                        type: SchemaType.STRING,
                        description: 'Text to replace with',
                    },
                    occurrence: {
                        type: SchemaType.STRING,
                        description: 'Which occurrence to replace: first, last, or all',
                    },
                },
                required: ['old_string', 'new_string', 'occurrence'],
            },
        },
        {
            name: 'insert_at_line',
            description:
                'Insert new content at a specific line without replacing existing content.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    line_number: {
                        type: SchemaType.INTEGER,
                        description: 'Line number where to insert (1-indexed)',
                    },
                    content: {
                        type: SchemaType.STRING,
                        description: 'Content to insert',
                    },
                    position: {
                        type: SchemaType.STRING,
                        description: 'Insert before or after the specified line',
                    },
                },
                required: ['line_number', 'content', 'position'],
            },
        },
        {
            name: 'delete_lines',
            description: 'Delete specific lines from the document.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    start_line: {
                        type: SchemaType.INTEGER,
                        description: 'First line to delete (1-indexed)',
                    },
                    end_line: {
                        type: SchemaType.INTEGER,
                        description: 'Last line to delete (inclusive)',
                    },
                },
                required: ['start_line', 'end_line'],
            },
        },
        {
            name: 'append_to_document',
            description: 'Add content to the end of the document.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    content: {
                        type: SchemaType.STRING,
                        description: 'Content to append',
                    },
                },
                required: ['content'],
            },
        },
    ],
}

export const functionTools: FunctionDeclarationsTool[] = [editorTools]
