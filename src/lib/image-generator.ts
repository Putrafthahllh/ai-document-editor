/**
 * Generate gambar menggunakan Pollinations AI
 * API gratis tanpa memerlukan API key
 * @param prompt - Deskripsi gambar yang ingin dibuat
 * @returns Base64 image (data URL)
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    console.log('Generating image with Pollinations AI, prompt:', prompt)

    const encodedPrompt = encodeURIComponent(prompt)

    // Endpoint yang stabil
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`

    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error(`Failed to generate image: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    const contentType =
      response.headers.get('content-type') || 'image/png'

    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error('Image generation error:', error)
    throw error
  }
}
