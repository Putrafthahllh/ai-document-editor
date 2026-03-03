# AI Document Editor

A powerful, AI-powered document editor built with Next.js and Google Gemini. Features a dual-pane interface with a markdown-capable editor and an intelligent chat assistant.

## Features
- **Smart AI Chat**: Powered by Gemini 2.5 Flash.
- **Function Calling**: AI can directly edit the document (write, update, request content).
- **Multimodal Support**: Analyze images (JPG, PNG, WEBP), PDFs, and text files.
- **Live Preview**: Syntax highlighting and line numbers.
- **Local Persistence**: Auto-saves specific documents to browser LocalStorage.
- **Dark/Light Mode**: Fully themable UI.
- **Export Options**: Download as .txt, .md, .pdf (Print), or .doc.

## Setup Instructions

1.  **Prerequisites**:
    - Node.js 18+ installed.
    - A Google Gemini API Key (Get one at [aistudio.google.com](https://aistudio.google.com/)).

2.  **Environment Variables**:
    Ensure your `.env.local` file has the following:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

3.  **Running the Editor**:
    The editor is part of the main application.
    ```bash
    npm run dev
    ```
    Access it at `http://localhost:3000/ai-editor`.

## Testing Guide

### 1. Function Calling (AI Editing)
- **Goal**: Verify AI can modify the document.
- **Test**:
    1.  Type some text in the editor (e.g., "Hello world").
    2.  Ask the AI: "Change the text to 'Hello Universe' and make it bold."
    3.  **Expected**: The text in the editor updates automatically to "**Hello Universe**".

### 2. Multimodal Features (File Analysis)
- **Goal**: Verify AI can read uploaded files.
- **Test**:
    1.  Click the paperclip icon 📎.
    2.  Upload an image or a PDF.
    3.  Ask: "Describe this file" or "Extract text from this image."
    4.  **Expected**: AI provides a description or content based on the file.

### 3. Clear Chat
- **Goal**: Verify history clearing.
- **Test**:
    1.  Have a conversation.
    2.  Click the trash icon 🗑️.
    3.  Confirm the modal.
    4.  **Expected**: Chat history is wiped.

## Code Quality Standards

This project adheres to the following standards:

-   **TypeScript**: Strict typing for all components and API responses (interfaces for `Message`, `Document`, `AppUser`).
-   **Error Handling**: Graceful error management in API routes (`try/catch`) and UI (toast/alerts for failures).
-   **Client-Side Logic**: Proper use of `'use client'` for interactive components (`AIChat`, `DocumentEditor`).
-   **Clean Console**: Production logs are minimized; `console.error` is used only for critical failures.
-   **Modern React**: Uses React 19 hooks and Next.js 15 patterns.

## Known Limitations

-   **Mobile Layout**: The side-by-side view is optimized for desktop. Mobile users may have a cramped experience.
-   **LocalStorage**: Documents are stored in the browser. Clearing browser data will lose documents (no cloud database in this version).
-   **PDF Export**: Uses the browser's native Print to PDF engine. Layout depends on browser settings.
