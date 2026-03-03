'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isTyping?: boolean;
  image?: string;
  imagePrompt?: string;
}

// SVG Icons
const ChatBotIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

const BotAvatarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// New Icons
const ExpandIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const MinimizeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ZoomIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const GalleryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

// Quick Prompts - Fitur Unik
const QUICK_PROMPTS = [
  { icon: '👋', text: 'Halo!' },
  { icon: '❓', text: 'Siapa Andi Putra?' },
  { icon: '💼', text: 'Skill apa saja?' },
  { icon: '📧', text: 'Cara menghubungi?' },
];

// Constants
const MAX_HISTORY_MESSAGES = 10;

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio('/mixkit-message-pop-alert-2354.mp3');
  }, []);

  // Fungsi untuk mengirim pesan ke AI API
  const sendMessageToAI = async (userMessage: string): Promise<{ message: string; image?: string; imagePrompt?: string }> => {
    try {
      const history = messages.slice(-MAX_HISTORY_MESSAGES).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendapatkan response');
      }

      return {
        message: data.message,
        image: data.image || undefined,
        imagePrompt: data.imagePrompt || undefined,
      };
    } catch (error) {
      console.error('Error calling AI:', error);
      return { message: 'Maaf, terjadi kesalahan. Coba lagi ya! 😅' };
    }
  };

  // Image Helper Functions
  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleShare = async (imageUrl: string) => {
    try {
      // First try to copy the image blob to clipboard
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      alert('Gambar berhasil disalin ke clipboard! 📋');
    } catch (error) {
      // Fallback to copying URL
      navigator.clipboard.writeText(imageUrl);
      alert('Link gambar berhasil disalin! 🔗');
    }
  };

  const handleEdit = (text: string) => {
    setInput(`Edit gambar ini, ubah menjadi: ${text}`);
    // Focus input area logic if needed
  };

  // Gallery Logic
  const allImages = messages.filter(m => m.image).map(m => ({ url: m.image!, prompt: m.imagePrompt || m.text }));

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const savedMessages = localStorage.getItem('putra_bot_messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        const messagesWithDates = parsed.map((msg: Omit<Message, 'timestamp'> & { timestamp: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
        if (messagesWithDates.length > 1) {
          setShowQuickPrompts(false);
        }
      } catch (e) {
        initWelcomeMessage();
      }
    } else {
      initWelcomeMessage();
    }
  }, []);

  const initWelcomeMessage = () => {
    const welcomeMsg: Message = {
      id: '1',
      text: "Halo! Saya adalah Putra Bot, asisten virtual Andi Putra. Senang bertemu dengan kamu! Ada yang bisa saya bantu hari ini? 😊",
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
    setShowQuickPrompts(true);
  };

  useEffect(() => {
    if (isMounted && messages.length > 0) {
      localStorage.setItem('putra_bot_messages', JSON.stringify(messages));
    }
  }, [messages, isMounted]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend || isLoading) return;

    setShowQuickPrompts(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // // Removed typing message injection
    // /*
    // const typingMessage: Message = { 
    //   id: 'typing',
    //   text: 'Putra Bot sedang mengetik',
    //   sender: 'bot',
    //   timestamp: new Date(),
    //   isTyping: true,
    // };
    // setMessages(prev => [...prev, typingMessage]);

    try {
      const aiResponse = await sendMessageToAI(messageToSend);
      // setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.message,
        sender: 'bot',
        timestamp: new Date(),
        image: aiResponse.image || undefined,
        imagePrompt: aiResponse.imagePrompt || undefined,
      };

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      // setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Maaf, terjadi kesalahan. Coba lagi ya!',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    initWelcomeMessage();
    localStorage.removeItem('putra_bot_messages');
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    const dateStr = msg.timestamp.toDateString();
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  // Get message count
  const messageCount = messages.filter(m => !m.isTyping).length;

  if (!isMounted) return null;

  // Dynamic classes based on expanded state
  const chatWindowClasses = isExpanded
    ? "fixed inset-2 sm:inset-4 md:inset-8 lg:inset-12 bg-white dark:bg-black backdrop-blur-xl border border-neutral-300 dark:border-neutral-700 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl shadow-black/20 dark:shadow-white/10 flex flex-col z-50 animate-scale-in overflow-hidden font-sans antialiased"
    : "fixed bottom-[72px] sm:bottom-24 left-2 right-2 sm:left-auto sm:right-4 md:right-6 w-[calc(100%-16px)] sm:w-[360px] md:w-[400px] lg:w-[440px] h-[55vh] sm:h-[60vh] md:h-[70vh] lg:h-[580px] max-h-[75vh] sm:max-h-[80vh] md:max-h-[600px] bg-white dark:bg-black backdrop-blur-xl border border-neutral-300 dark:border-neutral-700 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl shadow-black/20 dark:shadow-white/10 flex flex-col z-50 animate-scale-in overflow-hidden font-sans antialiased";

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl shadow-black/20 dark:shadow-white/20 hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group animate-glow"
        aria-label={isOpen ? "Tutup chat" : "Buka chat"}
      >
        <span className={`group-hover:scale-110 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChatBotIcon />
        </span>
        {/* Notification badge for message count */}
        {messageCount > 1 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {messageCount > 9 ? '9+' : messageCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={chatWindowClasses}>
          {/* Header */}
          <div className="bg-black dark:bg-white px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 dark:bg-black/10 rounded-2xl flex items-center justify-center text-white dark:text-black">
                <ChatBotIcon />
              </div>
              <div>
                <h3 className="text-white dark:text-black font-bold text-base sm:text-lg">Putra Bot</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-neutral-400 dark:text-neutral-600 text-xs">Online • {messageCount} pesan</p>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center overflow-x-auto no-scrollbar">
              {/* Gallery Button */}
              <button
                onClick={() => setShowGallery(!showGallery)}
                className="text-neutral-400 dark:text-neutral-600 hover:text-blue-500 dark:hover:text-blue-400 w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                title="Galery Photo"
                aria-label="Buka galeri foto"
              >
                <GalleryIcon />
              </button>

              {/* Clear Chat Button */}
              <button
                onClick={clearChat}
                className="text-neutral-400 dark:text-neutral-600 hover:text-red-400 dark:hover:text-red-500 w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                title="Clear chat"
                aria-label="Hapus riwayat chat"
              >
                <TrashIcon />
              </button>

              {/* Expand/Minimize Button */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-neutral-400 dark:text-neutral-600 hover:text-white dark:hover:text-black w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                title={isExpanded ? "Zoom In" : "Zoom Out"}
                aria-label={isExpanded ? "Kecilkan chat" : "Perbesar chat"}
              >
                {isExpanded ? <MinimizeIcon /> : <ExpandIcon />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsExpanded(false);
                }}
                className="text-neutral-400 dark:text-neutral-600 hover:text-white dark:hover:text-black w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                title="Close"
                aria-label="Tutup chat"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50 dark:bg-neutral-950 scroll-smooth">
            {Object.entries(groupedMessages).map(([dateStr, msgs]) => (
              <div key={dateStr}>
                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  <span className="text-xs text-neutral-500 px-3 py-1 bg-white dark:bg-neutral-900 rounded-full border border-neutral-200 dark:border-neutral-700">
                    {formatDate(new Date(dateStr))}
                  </span>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                </div>

                {msgs.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} gap-2 mb-3`}>
                    {msg.sender === 'bot' && !msg.isTyping && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
                        <BotAvatarIcon />
                      </div>
                    )}

                    <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      {msg.isTyping ? (
                        <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                          <span className="text-neutral-600 dark:text-neutral-400 text-sm">{msg.text}</span>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`px-4 py-2.5 rounded-2xl break-words transition-all duration-200 ${msg.sender === 'user'
                              ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-md'
                              : 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-bl-md'
                              }`}
                          >
                            {msg.sender === 'bot' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                              </div>
                            ) : (
                              msg.text
                            )}

                            {/* Gambar (jika ada) */}
                            {msg.image && (
                              <div className="mt-3 relative group">
                                <Image
                                  src={msg.image}
                                  alt={msg.imagePrompt || "AI Generated artwork"}
                                  width={300}
                                  height={300}
                                  className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity border border-neutral-200 dark:border-neutral-700 object-cover"
                                  onClick={() => setLightboxImage(msg.image || null)}
                                  unoptimized
                                />
                                {/* Image Actions Overlay */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-md p-1 rounded-lg">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxImage(msg.image || null);
                                    }}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-md transition-colors"
                                    title="Zoom"
                                  >
                                    <ZoomIcon />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(msg.image!, `putrabot-image-${Date.now()}.png`);
                                    }}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-md transition-colors"
                                    title="Download"
                                  >
                                    <DownloadIcon />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShare(msg.image!);
                                    }}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-md transition-colors"
                                    title="Share"
                                  >
                                    <ShareIcon />
                                  </button>
                                </div>
                                {/* Edit Button */}
                                <div className="mt-2 flex justify-end">
                                  <button
                                    onClick={() => handleEdit(msg.text.replace(/.*membuatkan gambar (.*?) untuk.*/i, '$1') || msg.text)}
                                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors bg-white/50 dark:bg-black/50 px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700"
                                  >
                                    <EditIcon />
                                    Edit Picture
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 px-1">
                            <span className="text-xs text-neutral-500">
                              {formatTime(msg.timestamp)}
                            </span>
                            {msg.sender === 'bot' && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.text);
                                  setCopiedId(msg.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                title="Copy response"
                                aria-label="Salin pesan"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <CheckIcon />
                                    <span className="text-green-500">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <CopyIcon />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {msg.sender === 'user' && !msg.isTyping && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
                        <UserIcon />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4 px-4">
                <div className="bg-white dark:bg-neutral-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs text-gray-400">
                      Sedang memproses...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts - Fitur Unik */}
          {showQuickPrompts && !isLoading && (
            <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <SparkleIcon />
                <span className="text-xs text-neutral-500 font-medium">Quick prompts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt.text)}
                    className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200 hover:scale-105 min-h-[32px] min-w-[32px]"
                  >
                    <span className="mr-1">{prompt.icon}</span>
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 bg-white dark:bg-black">
            <div className="flex gap-2 sm:gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tulis pesan..."
                rows={1}
                className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-black dark:text-white placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition-all duration-200 resize-none text-sm"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
                aria-label="Kirim pesan"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for expanded mode */}
      {isOpen && isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <CloseIcon />
          </button>
          <Image
            src={lightboxImage}
            alt="Full size view of AI generated artwork"
            width={800}
            height={800}
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl animate-scale-in object-contain"
            onClick={(e) => e.stopPropagation()}
            unoptimized
          />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(lightboxImage, `putrabot-image-${Date.now()}.png`);
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md transition-all flex items-center gap-2"
            >
              <DownloadIcon /> Download
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare(lightboxImage);
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md transition-all flex items-center gap-2"
            >
              <ShareIcon /> Share
            </button>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[55] bg-white dark:bg-black flex flex-col animate-fade-in">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h2 className="text-lg font-bold">Galery Photo ({allImages.length})</h2>
            <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full">
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {allImages.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-neutral-500">
                <GalleryIcon />
                <p className="mt-2">Belum ada gambar yang dibuat</p>
              </div>
            ) : (
              allImages.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxImage(img.url)}>
                  <Image
                    src={img.url}
                    alt={img.prompt || `Gallery image ${idx + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setLightboxImage(img.url); }} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><ZoomIcon /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(img.url, `gallery-${idx}.png`); }} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><DownloadIcon /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
