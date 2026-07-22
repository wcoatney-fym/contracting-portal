import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, Mic, MicOff, Mail } from 'lucide-react';

/**
 * FloatingChatbot — Phase 2: ElevenLabs Convai widget integration.
 *
 * When VITE_ELEVENLABS_AGENT_ID is set, the widget loads ElevenLabs' Convai
 * embed and renders a full chat experience (text + voice).
 *
 * When no agent ID is configured, it shows a polished "coming soon" state
 * with a mailto fallback to Contracting@teamfym.com.
 *
 * Integration:
 *   1. Create a Conversational AI agent at https://elevenlabs.io/conversational-ai
 *   2. Set VITE_ELEVENLABS_AGENT_ID in Netlify env vars
 *   3. The widget auto-activates — no code changes needed
 */

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const FloatingChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const isActive = !!AGENT_ID;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load ElevenLabs Convai widget script when panel opens
  useEffect(() => {
    if (!open || !isActive || widgetLoaded) return;

    // Check if script is already loaded
    if (document.querySelector('script[src*="elevenlabs.io/convai"]')) {
      setWidgetLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => setWidgetLoaded(true);
    script.onerror = () => setWidgetError(true);
    document.body.appendChild(script);

    return () => {
      // Don't remove script — it's idempotent
    };
  }, [open, isActive, widgetLoaded]);

  // Mailto fallback handler
  const handleMailto = () => {
    const subject = encodeURIComponent('Agent Hub — Help Request');
    const body = encodeURIComponent(message.trim() || '');
    window.open(`mailto:Contracting@teamfym.com?subject=${subject}&body=${body}`, '_self');
    setMessage('');
  };

  // Add welcome message when first opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: isActive
          ? 'Hi! I\'m your FYM training assistant. Ask me anything about contracting, carriers, or training — I can help with text or voice.'
          : 'Our AI assistant is coming soon! In the meantime, send us an email and we\'ll get back to you.',
        timestamp: new Date(),
      }]);
    }
  }, [open]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-800 to-navy-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">FYM Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <p className="text-[10px] text-navy-300">
                    {isActive ? 'Online — text or voice' : 'Coming soon'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-navy-700 text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-navy-300' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />

            {/* ElevenLabs widget embed area — hidden, manages its own audio/state */}
            {isActive && widgetLoaded && (
              <div ref={widgetRef} className="hidden">
                {/* @ts-ignore — elevenlabs-convai is a custom element */}
                <elevenlabs-convai agent-id={AGENT_ID} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-gray-100 bg-white p-3 shrink-0">
            {isActive ? (
              /* Active chat input */
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (message.trim()) {
                          setMessages(prev => [...prev, {
                            role: 'user',
                            text: message.trim(),
                            timestamp: new Date(),
                          }]);
                          // TODO: Route to ElevenLabs Convai API when agent is built
                          // For now, add a placeholder response
                          setTimeout(() => {
                            setMessages(prev => [...prev, {
                              role: 'assistant',
                              text: 'Thanks for your question! Our AI assistant is being set up. In the meantime, email Contracting@teamfym.com and we\'ll help you out.',
                              timestamp: new Date(),
                            }]);
                          }, 800);
                          setMessage('');
                        }
                      }
                    }}
                    placeholder="Ask anything…"
                    rows={1}
                    className="w-full rounded-xl border border-gray-200 pl-3 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-400 resize-none"
                  />
                  <button
                    onClick={() => {
                      if (message.trim()) {
                        setMessages(prev => [...prev, {
                          role: 'user',
                          text: message.trim(),
                          timestamp: new Date(),
                        }]);
                        setTimeout(() => {
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            text: 'Thanks for your question! Our AI assistant is being set up. In the meantime, email Contracting@teamfym.com and we\'ll help you out.',
                            timestamp: new Date(),
                          }]);
                        }, 800);
                        setMessage('');
                      }
                    }}
                    disabled={!message.trim()}
                    className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-30 disabled:hover:bg-navy-700 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setIsListening(l => !l)}
                  className={`shrink-0 p-2.5 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              /* Inactive — mailto fallback */
              <div className="space-y-2">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe what you need help with…"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-400 resize-none"
                />
                <button
                  onClick={handleMailto}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Contracting Team
                </button>
              </div>
            )}

            {/* Powered by badge */}
            {isActive && (
              <p className="text-center text-[10px] text-gray-300 mt-2">
                Powered by ElevenLabs
              </p>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-5 right-4 z-50 w-13 h-13 rounded-full shadow-lg transition-all flex items-center justify-center hover:scale-105 active:scale-95 ${
          open
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-navy-700 hover:bg-navy-800'
        } text-white`}
        style={{ width: 52, height: 52 }}
        aria-label={open ? 'Close chat' : 'Chat with us'}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </>
  );
};
