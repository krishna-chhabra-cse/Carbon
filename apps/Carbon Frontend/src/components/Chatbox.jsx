// ============================================================
//  src/components/Chatbox.jsx
//
//  AI Carbon Interactive Codebase Intelligence Chat.
//  Features: Markdown rendering, code copy, contextual follow-ups,
//  suggested prompt pills, and classified error diagnostics.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  MessageSquare, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  GitFork, 
  Compass,
  Copy,
  Check,
  Code2,
  HelpCircle,
  Bug,
  BookOpen,
  RotateCcw
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  { icon: Zap, label: "Request Lifecycle", query: "How does a request flow from frontend to backend in this codebase?" },
  { icon: ShieldCheck, label: "Security & Guards", query: "What security, authentication, or rate-limiting guards are in place?" },
  { icon: GitFork, label: "Architecture Overview", query: "What are the core architectural layers and components in this project?" },
  { icon: Compass, label: "Key Entry Points", query: "What are the primary entry-point files and how do I run this project?" }
];

export default function Chatbox({ repoUrl }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm **AI Carbon**. I've indexed this codebase graph. Click one of the suggested prompts below or ask any question about architecture, endpoints, or logic."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const hasInteracted = useRef(false);

  const scrollToBottom = () => {
    if (chatContainerRef.current && hasInteracted.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendQuery = async (queryText) => {
    if (!queryText.trim() || !repoUrl) return;

    const userQuery = queryText.trim();
    setInput('');
    hasInteracted.current = true;
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const response = await axios.post(`${apiUrl}/api/chat`, {
        repoUrl: repoUrl,
        query: userQuery
      });

      if (response.data && response.data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
      } else {
        throw new Error('Received empty response from Carbon AI.');
      }
    } catch (error) {
      let friendlyError = 'Failed to get answer.';
      if (error.response) {
        if (error.response.status === 429) {
          friendlyError = 'Rate limit reached. Please wait a moment before sending another query.';
        } else if (error.response.status === 503) {
          friendlyError = 'AI model is experiencing high demand. Automatic failover was triggered, please retry in a second.';
        } else {
          friendlyError = error.response.data?.error || error.response.data?.message || `Server error (${error.response.status}).`;
        }
      } else if (error.request) {
        friendlyError = 'Could not reach Carbon AI backend. Please verify your connection or that the server is active.';
      } else {
        friendlyError = error.message;
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ **Error**: ${friendlyError}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendQuery(input);
  };

  const copyMessageText = async (content, idx) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="glass-panel chatbox-studio-panel animate-fade-in">
      
      {/* Header */}
      <div className="chatbox-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="chat-avatar-pulse">
            <Bot size={18} color="#38bdf8" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 600 }}>
              AI Carbon Chat
            </h3>
            <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="live-dot" /> Repository graph indexed & ready
            </span>
          </div>
        </div>

        <div className="chat-badge-tag">
          <Sparkles size={13} /> Gemini 3.5 AI
        </div>
      </div>
      
      {/* Messages Scroll Area */}
      <div ref={chatContainerRef} className="chat-messages-container">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`chat-bubble-row ${msg.role === 'user' ? 'user-align' : 'assistant-align'}`}
          >
            {msg.role === 'assistant' && (
              <div className="chat-bot-icon">
                <Bot size={16} color="#38bdf8" />
              </div>
            )}

            <div className={`chat-message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
              {msg.role === 'user' ? (
                <span>{msg.content}</span>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}

              {msg.role === 'assistant' && idx > 0 && (
                <div className="chat-bubble-actions">
                  <button
                    type="button"
                    onClick={() => copyMessageText(msg.content, idx)}
                    className="chat-action-btn"
                    title="Copy response"
                  >
                    {copiedMsgIdx === idx ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedMsgIdx === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuery(`Simplify this explanation for a beginner: "${msg.content.slice(0, 100)}..."`)}
                    className="chat-action-btn"
                    title="Simplify explanation"
                  >
                    <Zap size={12} color="#38bdf8" />
                    <span>Simplify</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuery(`Show practical code examples for: "${msg.content.slice(0, 100)}..."`)}
                    className="chat-action-btn"
                    title="Show code examples"
                  >
                    <Code2 size={12} color="#10b981" />
                    <span>Examples</span>
                  </button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="chat-user-icon">
                <User size={16} color="#fff" />
              </div>
            )}
          </div>
        ))}

        {/* Suggested Prompt Chips (Shown when only greeting message exists) */}
        {messages.length === 1 && (
          <div className="suggested-prompts-section">
            <span className="suggested-label">
              <Sparkles size={12} color="#38bdf8" /> Suggested Questions:
            </span>
            <div className="suggested-chips-grid">
              {SUGGESTED_PROMPTS.map((sp, sIdx) => {
                const Icon = sp.icon;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    className="suggested-chip-btn"
                    onClick={() => sendQuery(sp.query)}
                    disabled={loading}
                  >
                    <Icon size={14} color="#38bdf8" />
                    <span>{sp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="chat-bubble-row assistant-align">
            <div className="chat-bot-icon">
              <Bot size={16} color="#38bdf8" />
            </div>
            <div className="chat-loading-bubble">
              <Loader2 className="animate-spin" size={16} color="#38bdf8" />
              <span>Analyzing codebase graph...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="chat-input-form">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about functions, APIs, architecture, or data flow..."
          disabled={loading}
          className="chat-text-input"
          aria-label="Ask Carbon AI a question"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()} 
          className="chat-send-btn"
          aria-label="Send message"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
