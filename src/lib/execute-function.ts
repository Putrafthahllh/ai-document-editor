export function executeFunctionCall(
    functionName: string,
    args: Record<string, unknown>,
    currentContent: string
): { success: boolean; newContent?: string; error?: string } {
    try {
        const lines = currentContent.split('\n')

        switch (functionName) {
            case 'update_doc_by_line': {
                const startLine = Number(args.start_line)
                const endLine = Number(args.end_line)
                const newContent = String(args.new_content)

                if (startLine < 1 || endLine > lines.length || startLine > endLine) {
                    return {
                        success: false,
                        error: `Invalid line range: ${startLine}-${endLine}. Document has ${lines.length} lines.`
                    }
                }

                const newLines = [
                    ...lines.slice(0, startLine - 1),
                    newContent,
                    ...lines.slice(endLine)
                ]

                return { success: true, newContent: newLines.join('\n') }
            }

            case 'update_doc_by_replace': {
                const oldString = String(args.old_string)
                const newString = String(args.new_string)
                const occurrence = String(args.occurrence || 'first')

                if (!currentContent.includes(oldString)) {
                    return { success: false, error: `Text "${oldString}" not found in document.` }
                }

                let result = currentContent
                if (occurrence === 'first') {
                    result = currentContent.replace(oldString, newString)
                } else if (occurrence === 'last') {
                    const lastIndex = currentContent.lastIndexOf(oldString)
                    result =
                        currentContent.substring(0, lastIndex) +
                        newString +
                        currentContent.substring(lastIndex + oldString.length)
                } else {
                    result = currentContent.replaceAll(oldString, newString)
                }

                return { success: true, newContent: result }
            }

            case 'insert_at_line': {
                const lineNumber = Number(args.line_number)
                const content = String(args.content)
                const position = String(args.position || 'after')

                if (lineNumber < 1 || lineNumber > lines.length) {
                    return {
                        success: false,
                        error: `Invalid line number: ${lineNumber}. Document has ${lines.length} lines.`
                    }
                }

                const insertIndex = position === 'before' ? lineNumber - 1 : lineNumber
                const newLines = [
                    ...lines.slice(0, insertIndex),
                    content,
                    ...lines.slice(insertIndex)
                ]

                return { success: true, newContent: newLines.join('\n') }
            }

            case 'delete_lines': {
                const startLine = Number(args.start_line)
                const endLine = Number(args.end_line)

                if (startLine < 1 || endLine > lines.length || startLine > endLine) {
                    return {
                        success: false,
                        error: `Invalid line range: ${startLine}-${endLine}. Document has ${lines.length} lines.`
                    }
                }

                const newLines = [
                    ...lines.slice(0, startLine - 1),
                    ...lines.slice(endLine)
                ]

                return { success: true, newContent: newLines.join('\n') }
            }

            case 'append_to_document': {
                const content = String(args.content)
                return { success: true, newContent: currentContent + '\n' + content }
            }

            default:
                return { success: false, error: `Unknown function: ${functionName}` }
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
    }
}
