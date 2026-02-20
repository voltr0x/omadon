'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';
import SkillGraph from './SkillGraph';
import { Message } from '@/lib/types';
import clsx from 'clsx';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [skillRefreshTrigger, setSkillRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = { role: 'assistant', content: '' };
      
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        assistantMessage.content += text;
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...assistantMessage };
          return newMessages;
        });
      }
      
      // Refresh skills after response (simulating implicit update analysis)
      setSkillRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualFeedback = async (type: 'correct' | 'confusion') => {
    console.log(`Manual feedback: ${type}`);
    setSkillRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Adaptive Mentor
          </h1>
          <p className="text-xs text-slate-400">Calibrated to your skill level</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for Skills (Desktop) */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 p-4 hidden lg:flex flex-col gap-6">
          <SkillGraph refreshTrigger={skillRefreshTrigger} />
          
          <div className="flex-1">
             <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Learning Path</h3>
             <div className="text-sm text-slate-500 italic">
               No active learning path yet. Start asking questions to build your profile.
             </div>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col relative">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                <div className="text-4xl mb-4">🧠</div>
                <p>Ask a question about DSA, System Design, or C++.</p>
                <p className="text-sm">I'll adapt to your level.</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={clsx(
                    "max-w-[80%] rounded-2xl p-4 shadow-sm",
                    msg.role === 'user' 
                      ? "bg-emerald-600/20 text-emerald-100 border border-emerald-500/30 rounded-br-none" 
                      : "bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-bl-none"
                  )}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  
                  {/* Feedback Controls for Assistant Messages */}
                  {msg.role === 'assistant' && idx === messages.length - 1 && !isLoading && (
                    <div className="mt-3 flex gap-2 pt-2 border-t border-white/5 justify-end">
                      <button 
                        onClick={() => handleManualFeedback('correct')}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Mark as understood"
                      >
                        <CheckCircle size={14} /> Understand
                      </button>
                      <button 
                        onClick={() => handleManualFeedback('confusion')}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors"
                        title="Still confused"
                      >
                        <HelpCircle size={14} /> Confused
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-900/50 border-t border-slate-800">
            <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about recursion, DP, or system design..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-5 pr-12 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-600"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-3 p-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
