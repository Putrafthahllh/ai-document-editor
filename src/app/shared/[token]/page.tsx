import './shared.css'
import { SharedDocumentClient } from './SharedDocumentClient'

interface PageProps {
    params: Promise<{ token: string }>
}

export default async function SharedDocumentPage({ params }: PageProps) {
    const { token } = await params

    return <SharedDocumentClient token={token} />
}
