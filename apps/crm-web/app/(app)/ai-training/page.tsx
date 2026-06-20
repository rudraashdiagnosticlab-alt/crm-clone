'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, Send, User } from 'lucide-react';
import { aiApi } from '@/lib/crm';

interface Msg {
  role: 'user' | 'ai';
  text: string;
  topic?: string | null;
}

const SUGGESTIONS = [
  'What is Form 1099?',
  'How should I talk to a Florida client?',
  'Tell me about QuickBooks',
  'Handle a price objection',
];

export default function AiTrainingPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', text: 'Hi! Ask me about tax, bookkeeping, sales scripts, or company operations.' },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (q: string) => aiApi.chat(q),
    onSuccess: (res) => setMessages((m) => [...m, { role: 'ai', text: res.answer, topic: res.topic }]),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(q: string) {
    const question = q.trim();
    if (!question || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    ask.mutate(question);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-card p-4 shadow-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                m.role === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'
              }`}
            >
              {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {m.text}
              {m.topic && (
                <span className="mt-1 block text-[10px] uppercase tracking-wide opacity-60">{m.topic}</span>
              )}
            </div>
          </div>
        ))}
        {ask.isPending && <p className="text-sm text-muted-foreground">Thinking…</p>}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-md border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={ask.isPending}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> Send
        </button>
      </form>
    </div>
  );
}
