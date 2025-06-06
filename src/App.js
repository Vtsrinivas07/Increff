import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import faqs from './data/faqs';
import './App.css';

const systemPrompt = `You are a helpful AI assistant for an electronics e-commerce site.
You have access to the following FAQ. Answer ONLY using the information in the FAQ. 
If the question is not covered, say: "I'm sorry, I don't have that information. Please contact customer support."

FAQs:
${faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

Guidelines:
- If the question matches or is similar to an FAQ, answer using the FAQ.
- If not, say you don't know and suggest contacting support.
- Be concise, clear, and friendly.`;

const App = () => {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: '👋 Hi! I\'m your AI shopping assistant. I can help you with:\n\n' +
               '📱 Product specifications\n' +
               '📦 Order tracking\n' +
               '🔄 Return policies\n' +
               '💳 Payment methods\n' +
               '🔧 Warranty information\n\n' +
               'How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKeyError, setApiKeyError] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!process.env.REACT_APP_GEMINI_API_KEY) {
      setApiKeyError(true);
      setError('API key not found. Please check your .env file configuration.');
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
  if (!input.trim() || apiKeyError) return;

  const userMessage = { role: 'user', content: input };
  const updated = [...messages, userMessage];
  setMessages(updated);
  setInput('');
  setIsLoading(true);
  setError(null);

  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
  const userQ = normalize(input);

  let bestMatch = null;
  let bestScore = 0;
  faqs.forEach(faq => {
    const faqQ = normalize(faq.question);
    if (faqQ === userQ) {
      bestMatch = faq;
      bestScore = 1;
    } else if (faqQ.includes(userQ) || userQ.includes(faqQ)) {
      if (bestScore < 0.9) {
        bestMatch = faq;
        bestScore = 0.9;
      }
    } else {
      const userTokens = userQ.split(' ');
      const faqTokens = faqQ.split(' ');
      const overlap = userTokens.filter(t => faqTokens.includes(t)).length;
      const score = overlap / Math.max(faqTokens.length, userTokens.length);
      if (score > bestScore && score > 0.6) { 
        bestMatch = faq;
        bestScore = score;
      }
    }
  });

  if (bestMatch) {
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: bestMatch.answer }]);
      setIsLoading(false);
    }, 500);
    return;
  }

  try {
    const contents = messages.length === 1
      ? [
          { role: 'system', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: input }] }
        ]
      : updated.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }));
    const geminiConfig = {
      temperature: 0.9,
      topP: 1,
      topK: 1,
      maxOutputTokens: 4096,
    };
    const ai = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || "YOUR_API_KEY_HERE");
    const model = ai.getGenerativeModel({model: "gemini-2.0-flash-lite",geminiConfig});
    const result = await model.generateContent({ contents });
    const botResponse = result.response.candidates[0].content.parts[0].text;
    setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
  } catch (e) {
    setError('Sorry, I encountered an error. Please try again or contact support.');
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: "I'm having trouble processing your request. Please try again or contact our support team for assistance." 
    }]);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>🛍️ AI Shopping Assistant</h2>
        <p className="subtitle">Your 24/7 shopping companion</p>
      </div>
      
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="message-content">
              <div className="message-avatar">
                {m.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-text-container">
                <strong>{m.role === 'user' ? 'You' : 'Assistant'}</strong>
                <div className="message-text">{m.content}</div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="message-avatar">🤖</div>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={apiKeyError ? "API key not configured" : "Type your question here..."}
          disabled={isLoading || apiKeyError}
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim() || apiKeyError}
          className={isLoading ? 'loading' : ''}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default App;
