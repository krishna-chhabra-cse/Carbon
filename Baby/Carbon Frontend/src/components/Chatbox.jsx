import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Bot, User, MessageSquare } from 'lucide-react';

export default function Chatbox({ repoUrl }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I've read the codebase. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !repoUrl) return;

    const userQuery = input.trim();
    setInput('');
    hasInteracted.current = true;
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response =  await axios.post(`${apiUrl}/api/chat`, {
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

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, marginBottom: '16px' }}>
        <MessageSquare className="text-gradient" /> Ask about the Codebase
      </h2>
      
      {/* Messages Area */}
      <div ref={chatContainerRef} style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        paddingRight: '8px',
        marginBottom: '16px'
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex',
            gap: '12px',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Bot size={18} color="white" />
              </div>
            )}

            <div style={{
              background: msg.role === 'user' ? '#6366f1' : 'rgba(0,0,0,0.3)',
              color: msg.role === 'user' ? '#fff' : '#e2e8f0',
              padding: '12px 16px',
              borderRadius: '12px',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <User size={18} color="white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
              <Loader2 className="animate-spin" size={20} color="#94a3b8" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How does user authentication work?"
          disabled={loading}
          style={{ flex: 1, padding: '12px 16px', borderRadius: '8px' }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ padding: '0 20px', borderRadius: '8px' }}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
}
