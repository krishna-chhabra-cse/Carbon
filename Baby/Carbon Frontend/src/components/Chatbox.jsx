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
  Check
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  { icon: Zap, label: "Request Lifecycle", query: "How does a request flow from frontend to backend in this codebase?" },
  { icon: ShieldCheck, label: "Security & Guards", query: "What security, authentication, or rate-limiting guards are in place?" },
  { icon: GitFork, label: "Agent Orchestration", query: "How do the AI agents collaborate and pass state between nodes?" },
  { icon: Compass, label: "Key Entry Points", query: "What are the primary entry-point files and how do I run this project?" }
];

export default function Chatbox({ repoUrl }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I've fully parsed this codebase. Click one of the suggested prompts below or ask anything about its architecture, endpoints, or logic." }
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}/api/chat`, {
        repoUrl: repoUrl,
        query: userQuery
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ **Error:** ${error.response?.data?.detail || error.response?.data?.error || 'Could not reach the server.'}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendQuery(input);
  };

  const copyMessageText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
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
            <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
              AI Codebase Intelligence Co-Pilot
            </h3>
            <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="live-dot" /> Repository graph indexed & ready
            </span>
          </div>
        </div>

        <div className="chat-badge-tag">
          <Sparkles size={13} /> Gemini 2.5 Flash
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
                <button
                  type="button"
                  onClick={() => copyMessageText(msg.content, idx)}
                  className="chat-copy-btn"
                  title="Copy response"
                >
                  {copiedMsgIdx === idx ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
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
