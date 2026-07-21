import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

/**
 * Floating chatbot button — bottom-right corner of the Agent Hub.
 * Phase 1: opens a simple contact/help panel with a mailto CTA.
 * Phase 2 (future): wire to a real chat backend or AI agent.
 */
export const FloatingChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent('Agent Hub — Help Request');
    const body = encodeURIComponent(message.trim());
    window.open(`mailto:Contracting@teamfym.com?subject=${subject}&body=${body}`, '_self');
    setMessage('');
    setOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-navy-800 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Need Help?</p>
              <p className="text-xs text-navy-300">We'll get back to you ASAP</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-navy-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">
              Have a question about contracting, training, or your account? Send us a message.
            </p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your question…"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-400 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Send Message
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-4 z-50 w-12 h-12 rounded-full bg-navy-700 text-white shadow-lg hover:bg-navy-800 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label="Chat with us"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </>
  );
};
