'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../lib/api';

type Chat = { chat: { id: string; title?: string | null; type: string } };
type Message = { id: string; text: string | null; sender: { username: string } };

export default function HomePage() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('ChangeMeNow_12345');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!token || !activeChat) return;
    api<Message[]>(`/chats/${activeChat}/messages`, { headers: { Authorization: `Bearer ${token}` } }).then(setMessages);
    const socket = io('/', { path: '/ws' });
    socket.emit('chat:join', activeChat);
    socket.on('message:new', (msg: Message) => setMessages((prev) => [...prev, msg]));
    return () => { socket.close(); };
  }, [token, activeChat]);

  const login = async () => {
    const r = await api<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    setToken(r.accessToken);
    const list = await api<Chat[]>('/chats', { headers: { Authorization: `Bearer ${r.accessToken}` } });
    setChats(list);
    if (list[0]) setActiveChat(list[0].chat.id);
  };

  const send = async () => {
    if (!activeChat) return;
    const m = await api<Message>(`/chats/${activeChat}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: draft }),
    });
    setMessages((prev) => [...prev, m]);
    setDraft('');
  };

  return (
    <main className="layout">
      <aside className="sidebar">
        <h2>Dasheu Chat</h2>
        {!token ? (
          <div>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
            <button onClick={login}>Войти</button>
          </div>
        ) : (
          <ul>
            {chats.map((c) => (
              <li key={c.chat.id}>
                <button onClick={() => setActiveChat(c.chat.id)}>{c.chat.title || c.chat.type}</button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="main">
        <div className="messages">
          {messages.map((m) => (
            <p key={m.id}>
              <b>{m.sender?.username ?? 'user'}:</b> {m.text}
            </p>
          ))}
        </div>
        <div className="composer">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Сообщение" />
          <button onClick={send}>Отправить</button>
        </div>
      </section>
    </main>
  );
}
