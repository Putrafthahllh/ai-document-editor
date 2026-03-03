import { GoogleGenAI, Type, type Content } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/lib/image-generator'

// Inisialisasi Gemini AI dengan SDK baru
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// System prompt
const SYSTEM_PROMPT = `Kamu adalah Putra Bot, asisten virtual AI yang cerdas dan berpengetahuan luas untuk website portfolio Andi Putra Fathahillah.

TENTANG ANDI PUTRA FATHAHILLAH:
- Seorang siswa SMK berbakat yang sedang magang di Ashari Tech
- Lahir di Makassar pada tanggal 24 Agustus 2008
- Bersekolah di SMK Telkom Makassar jurusan RPL
- Sedang belajar web development dengan Next.js
- Senang belajar UI/UX Design
- Sekarang sedang berada di Bandung untuk magang di Ashari Tech
- Ini adalah website portofolio pribadi untuk menampilkan karya dan skill
- Hobi: Main Game, Nonton Film, Membaca Buku, Mendengarkan Musik
- Skill: CSS, Tailwind CSS, Next.js, React, UI/UX Design

KEMAMPUAN KAMU:
- Kamu bisa menjawab pertanyaan umum tentang programming, web development, dan ui/ux design
- Kamu bisa memberikan tips dan saran tentang belajar coding
- Kamu bisa menjelaskan konsep teknis dengan bahasa yang mudah dipahami
- Kamu sangat mengenal Andi Putra dan bisa menceritakan tentang dia

PENTING: Kamu memiliki kemampuan untuk MEMBUAT GAMBAR!
- Jika user meminta kamu membuat/generate/buat gambar, gunakan tool generate_image
- Jelaskan dulu apa yang akan kamu buat, lalu gunakan tool
- Contoh: "Baik, saya akan membuatkan gambar [deskripsi] untuk kamu!"

CARA KAMU MENJAWAB:
- Gunakan bahasa Indonesia yang santai, ramah, tapi tetap informatif
- Jawab dengan jelas dan terstruktur
- JANGAN pernah menggunakan tanda kutip di awal atau akhir jawaban
- JANGAN membungkus jawabanmu dengan tanda petik atau quote marks
- Langsung jawab tanpa awalan tanda baca aneh
- Berikan jawaban yang helpful dan detailed ketika diperlukan
- Gunakan emoji sederhana seperti 😊 👋 ✨ 💡 🚀 untuk percakapan friendly
- Kalau tidak tahu, bilang dengan jujur dan tawarkan bantuan lain

LARANGAN:
- Jangan gunakan tanda kutip untuk membungkus respons
- Jangan gunakan tanda bintang {*}
- Jangan menjawab pertanyaan tidak pantas atau berbahaya
- Jangan berpura-pura menjadi orang lain selain Putra Bot
- Jangan memberikan informasi pribadi yang sensitif`

// Definisi Tool untuk generate gambar
const imageGenerationTool = {
    functionDeclarations: [
        {
            name: 'generate_image',
            description: 'Generate gambar berdasarkan deskripsi dari user. Gunakan tool ini ketika user meminta untuk membuat, generate, atau menggambar sesuatu.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    prompt: {
                        type: Type.STRING,
                        description: 'Deskripsi detail gambar yang ingin dibuat dalam bahasa Inggris. Contoh: "a cute orange cat wearing a small blue hat, digital art style"',
                    },
                },
                required: ['prompt'],
            },
        },
    ],
}

// Helper function untuk delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Function untuk generate content dengan retry
async function generateWithRetry(contents: Content[], maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    tools: [imageGenerationTool],
                },
            })
            return result
        } catch (error: unknown) {
            const err = error as { status?: number; message?: string }
            const isRateLimited = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Too Many Requests')
            const isOverloaded = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('overloaded') || err?.message?.includes('UNAVAILABLE')

            // Retry untuk rate limit atau overloaded
            if ((isRateLimited || isOverloaded) && attempt < maxRetries) {
                // Wait dengan exponential backoff: 2s, 4s, 8s, 16s, 32s
                const waitTime = Math.pow(2, attempt) * 1000
                console.log(`${isRateLimited ? 'Rate limited' : 'Model overloaded'}. Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}...`)
                await delay(waitTime)
                continue
            }
            throw error
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        // Ambil message dari request body
        const { message, history } = await request.json()

        // Validasi input
        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            )
        }

        // Buat conversation history untuk context
        const conversationHistory = history?.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        })) || []

        const contents = [
            // System instruction
            {
                role: 'user',
                parts: [{ text: SYSTEM_PROMPT }],
            },
            {
                role: 'model',
                parts: [{ text: 'Baik, saya mengerti. Saya akan menjadi asisten yang ramah dan helpful sesuai instruksi.' }],
            },
            // Previous conversation history
            ...conversationHistory,
            // Current user message
            {
                role: 'user',
                parts: [{ text: message }],
            },
        ]

        // Generate dengan retry
        const response = await generateWithRetry(contents, 3)

        // Cek apakah AI mau pakai tool
        const functionCalls = response?.functionCalls

        if (functionCalls && functionCalls.length > 0) {
            const functionCall = functionCalls[0]

            if (functionCall.name === 'generate_image') {
                const imagePrompt = functionCall.args?.prompt as string

                try {
                    // Generate gambar
                    const imageData = await generateImage(imagePrompt)

                    if (imageData) {
                        return NextResponse.json({
                            success: true,
                            message: `Ini dia gambar yang kamu minta! 🎨`,
                            image: imageData,
                            imagePrompt: imagePrompt,
                        })
                    } else {
                        return NextResponse.json({
                            success: true,
                            message: 'Maaf, saya tidak bisa membuat gambar saat ini. Coba lagi ya!',
                        })
                    }
                } catch (error) {
                    console.error('Image generation failed:', error)
                    return NextResponse.json({
                        success: true,
                        message: 'Maaf, terjadi kesalahan saat membuat gambar. Coba lagi nanti ya!',
                    })
                }
            }
        }

        // Response text biasa (tanpa tool call)
        const textResponse = response?.text

        // Return response
        return NextResponse.json({
            success: true,
            message: textResponse,
        })

    } catch (error: unknown) {
        console.error('Gemini API Error:', error)

        // Handle rate limit error
        const err = error as { status?: number; message?: string }
        if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Too Many Requests')) {
            return NextResponse.json(
                { error: 'Terlalu banyak request. Tunggu beberapa detik dan coba lagi ya! ⏳' },
                { status: 429 }
            )
        }

        // Handle API key errors
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                return NextResponse.json(
                    { error: 'API key tidak valid. Pastikan GEMINI_API_KEY sudah benar.' },
                    { status: 401 }
                )
            }
        }

        return NextResponse.json(
            { error: 'Gagal mendapatkan response dari AI. Coba lagi nanti.' },
            { status: 500 }
        )
    }
}