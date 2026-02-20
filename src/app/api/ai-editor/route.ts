import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { functionTools } from '@/lib/function-tools'
import { executeFunctionCall } from '@/lib/execute-function'

function formatDocumentForAI(content: string): string {
    const lines = content.split('\n')
    return lines.map((line, i) => `${i + 1}. ${line}`).join('\n')
}

export async function POST(request: NextRequest) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const body = await request.json()
        const { messages, documentContent, file } = body

        const documentWithLines = formatDocumentForAI(documentContent)
        const lineCount = documentContent.split('\n').length

        const systemPrompt = `You are a helpful AI assistant for a document editor, similar to Cursor IDE.

**CURRENT DOCUMENT (${lineCount} lines):**
\`\`\`
${documentWithLines}
\`\`\`

You have tools to manipulate the document:
- update_doc_by_line: Replace specific lines (use start_line and end_line, 1-indexed)
- update_doc_by_replace: Find and replace text strings
- insert_at_line: Insert new content before or after a specific line
- delete_lines: Remove specific lines
- append_to_document: Add content at the end

Rules:
1. Always check the current document state above before making changes
2. Be precise with line numbers (1-indexed)
3. When the user asks to edit, use the appropriate tool
4. Confirm your changes after editing
5. If the document is empty, use append_to_document to add content`

        // Build history for the chat model
        // Convert 'user'/'assistant' roles to 'user'/'model'
        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }))

        // Use the model requested by user (likely 2.5-flash) which was found to exist
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemPrompt,
            tools: functionTools
        })

        const chat = model.startChat({
            history: history,
        })

        // Build the current user message parts
        const userMessage = messages[messages.length - 1]
        const contentParts: any[] = []

        // Add file if present (multimodal)
        if (file) {
            // Remove data:image/...;base64, prefix if present
            const base64Data = file.data.includes('base64,')
                ? file.data.split('base64,')[1]
                : file.data

            contentParts.push({
                inlineData: {
                    mimeType: file.type,
                    data: base64Data,
                },
            })
        }

        contentParts.push({ text: userMessage.content })

        // Send message
        let result = await chat.sendMessage(contentParts)
        let response = await result.response
        let text = response.text()

        // Handle function calls
        // @google/generative-ai v0.24+ handles function calls differently than v1 SDK
        // We check for functionCalls in the response candidates
        const functionCalls = response.functionCalls()

        if (functionCalls && functionCalls.length > 0) {
            const fc = functionCalls[0]
            const fcName = fc.name
            const fcArgs = fc.args

            console.log('Function call:', fcName, fcArgs)

            // Execute the function
            const executionResult = executeFunctionCall(fcName, fcArgs as any, documentContent)

            if (!executionResult.success) {
                return NextResponse.json({
                    message: {
                        role: 'assistant',
                        content: `❌ Error: ${executionResult.error}`,
                        functionCall: { name: fcName, args: fcArgs },
                    },
                })
            }

            // Send result back to AI
            // In @google/generative-ai, we simply send the function response
            const newDocumentWithLines = formatDocumentForAI(executionResult.newContent!)
            const newLineCount = executionResult.newContent!.split('\n').length

            // Send function response
            // The format for sending function response in chat
            result = await chat.sendMessage([
                {
                    functionResponse: {
                        name: fcName,
                        response: {
                            success: true,
                            updatedDocument: newDocumentWithLines,
                            totalLines: newLineCount,
                        },
                    },
                },
            ])

            response = await result.response
            text = response.text()

            return NextResponse.json({
                message: {
                    role: 'assistant',
                    content: text || '✅ Document updated!',
                    functionCall: { name: fcName, args: fcArgs },
                },
                newDocumentContent: executionResult.newContent,
            })
        }

        // Normal response
        return NextResponse.json({
            message: {
                role: 'assistant',
                content: text,
            },
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('AI Editor API error (FULL):', error)

        if (message.includes('429') || message.includes('Quota')) {
            return NextResponse.json(
                {
                    error: 'Quota Exceeded',
                    details: 'You have reached the free tier limit for Gemini API. Please wait a minute or try again later.'
                },
                { status: 429 }
            )
        }

        return NextResponse.json(
            {
                error: 'Failed to process request',
                details: message,
            },
            { status: 500 }
        )
    }
}
