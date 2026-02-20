'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle, HelpCircle, Loader2, PlusCircle } from 'lucide-react';
import SkillGraph from './SkillGraph';
import { Message } from '@/lib/types';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [skillRefreshTrigger, setSkillRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history from local storage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_history');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, []);

  // Save chat history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('chat_history');
  };

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

  const handleManualFeedback = async (type: 'correct' | 'confusion', msgContent: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, contextText: msgContent }),
      });
      setSkillRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <header className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            Adaptive Mentor
          </h1>
          <p className="text-xs text-slate-400">Calibrated to your skill level</p>
        </div>
        <button 
          onClick={handleNewChat}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md transition-colors"
        >
          <PlusCircle size={16} /> New Chat
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar for Skills (Desktop) */}
        <aside className="w-80 border-r border-slate-700 bg-slate-900 p-4 hidden lg:flex flex-col gap-6 overflow-y-auto shrink-0">
          <SkillGraph refreshTrigger={skillRefreshTrigger} />
          
          <div className="flex-1">
             <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Learning Path</h3>
             <div className="text-sm text-slate-500 italic">
               No active learning path yet. Start asking questions to build your profile.
             </div>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col relative w-full items-center bg-slate-800">
          <div className="flex-1 overflow-y-auto w-full">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-80">
                <div className="text-4xl mb-4">🤖</div>
                <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-sm">Ask a question about DSA, System Design, or C++.</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx(
                  "w-full flex justify-center py-6",
                  msg.role === 'assistant' ? "bg-slate-800" : "bg-slate-900/40"
                )}
              >
                <div className="w-full max-w-3xl px-4 flex gap-4">
                  {/* Avatar Placeholder */}
                  <div className="shrink-0 pt-1">
                    {msg.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded bg-emerald-700 flex items-center justify-center text-emerald-100 font-bold text-sm">
                        AI
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-600 flex items-center justify-center text-slate-100 font-bold text-sm">
                        U
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-invert prose-slate max-w-none text-slate-100">
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus as any}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-md my-4"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono text-emerald-300" {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                    
                    {/* Feedback Controls for Assistant Messages */}
                    {msg.role === 'assistant' && idx === messages.length - 1 && !isLoading && (
                      <div className="mt-4 flex gap-3 pt-2">
                        <button 
                          onClick={() => handleManualFeedback('correct', msg.content)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Mark as understood"
                        >
                          <CheckCircle size={15} /> Understand
                        </button>
                        <button 
                          onClick={() => handleManualFeedback('confusion', msg.content)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
                          title="Still confused"
                        >
                          <HelpCircle size={15} /> Confused
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="w-full flex justify-center py-6 bg-slate-800">
                 <div className="w-full max-w-3xl px-4 flex gap-4">
                   <div className="w-8 h-8 rounded bg-emerald-700 flex items-center justify-center text-emerald-100 font-bold text-sm shrink-0">AI</div>
                   <div className="flex items-center text-slate-400 text-sm animate-pulse space-x-2">
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animation-delay-200"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animation-delay-400"></div>
                   </div>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Input Area */}
          <div className="w-full max-w-3xl p-4 shrink-0">
            <form onSubmit={handleSubmit} className="relative w-full shadow-lg rounded-xl">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-slate-700 border border-slate-600 rounded-xl py-4 pl-4 pr-12 text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder-slate-400 shadow-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-slate-100 rounded-lg text-slate-900 hover:bg-slate-300 disabled:opacity-50 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
            <div className="mt-2 text-center text-xs text-slate-500">
              AI can make mistakes. Verify important information.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
