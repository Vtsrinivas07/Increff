import React, { useState } from 'react';
import axios from 'axios';
import faqs from './data/faqs';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about your order, products, or our policies.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');

    const systemPrompt = `
You are a helpful AI assistant for an electronics e-commerce site. Use the FAQ info below:

${faqs.map(f=>`Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}
`;

    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model:'gpt-3.5-turbo', messages:[{role:'system',content:systemPrompt},...updated], temperature:0.7, max_tokens:500 },
        { headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${process.env.REACT_APP_OPENAI_API_KEY}` } }
      );
      setMessages([...updated, res.data.choices[0].message]);
    } catch (e) {
      setMessages([...updated, { role:'assistant', content:"Sorry, I couldn't process that. Please try again." }]);
    }
  };

  return (
    <div className="chat-container">
      <h2>🛍️ AI Support Chatbot</h2>
      <div className="chat-box">
        {messages.map((m,i)=>(
          <div key={i} className={`message ${m.role}`}>
            <strong>{m.role==='user'?'You':'Bot'}:</strong> {m.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text" value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleSend()}
          placeholder="Ask a question…"
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default App;
