'use client';

import { useEffect, useMemo, useState } from 'react';

type Tab = 'dashboard' | 'users' | 'chats' | 'reports' | 'audit' | 'settings' | 'moderation';
const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

async function apiRequest(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) {
    return res.text();
  }

  return res.json();
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('ChangeMeNow_12345');
  const [error, setError] = useState('');

  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);

  const [usersFilter, setUsersFilter] = useState({ q: '', role: '', isActive: '' });
  const [chatQuery, setChatQuery] = useState('');
  const [auditFilter, setAuditFilter] = useState({ limit: '200', action: '' });

  const [newUser, setNewUser] = useState({ username: 'user1', password: 'ChangeMeNow_12345', role: 'user', displayName: 'User One' });
  const [resetPasswordPayload, setResetPasswordPayload] = useState({ userId: '', newPassword: 'ResetMe_12345' });
  const [settingPayload, setSettingPayload] = useState({ key: 'maintenance_mode', value: 'false' });
  const [modPayload, setModPayload] = useState({ messageId: '', reason: 'violation' });

  const tabs: Tab[] = ['dashboard', 'users', 'chats', 'reports', 'audit', 'settings', 'moderation'];

  const roleStats = useMemo(() => dashboard?.usersByRole ?? [], [dashboard]);
  const trend = useMemo(() => dashboard?.messageTrend7d ?? [], [dashboard]);

  async function login() {
    setError('');
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.message || 'Login failed');
      return;
    }
    setToken(data.accessToken);
  }

  async function loadDashboard() {
    setDashboard(await apiRequest('/admin/dashboard', token));
  }

  async function loadUsers() {
    const qp = new URLSearchParams();
    if (usersFilter.q) qp.set('q', usersFilter.q);
    if (usersFilter.role) qp.set('role', usersFilter.role);
    if (usersFilter.isActive) qp.set('isActive', usersFilter.isActive);
    setUsers(await apiRequest(`/admin/users?${qp.toString()}`, token));
  }

  async function loadUserDetail(userId: string) {
    setSelectedUser(await apiRequest(`/admin/users/${userId}`, token));
  }

  async function loadChats() {
    const qp = new URLSearchParams();
    if (chatQuery) qp.set('q', chatQuery);
    setChats(await apiRequest(`/admin/chats?${qp.toString()}`, token));
  }

  async function loadReports(status = '') {
    const q = status ? `?status=${status}` : '';
    setReports(await apiRequest(`/admin/reports${q}`, token));
  }

  async function loadAudit() {
    const qp = new URLSearchParams();
    if (auditFilter.limit) qp.set('limit', auditFilter.limit);
    if (auditFilter.action) qp.set('action', auditFilter.action);
    setAuditLogs(await apiRequest(`/admin/audit-logs?${qp.toString()}`, token));
  }

  async function loadSettings() {
    setSettings(await apiRequest('/admin/settings', token));
  }

  useEffect(() => {
    if (!token) return;
    loadDashboard();
    loadUsers();
    loadChats();
    loadReports();
    loadAudit();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function createUser() {
    await apiRequest('/admin/users', token, { method: 'POST', body: JSON.stringify(newUser) });
    await loadUsers();
  }

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    await apiRequest(`/admin/users/${userId}`, token, { method: 'PATCH', body: JSON.stringify(patch) });
    await loadUsers();
    if (selectedUser?.id === userId) {
      await loadUserDetail(userId);
    }
  }

  async function revokeSessions(userId: string) {
    await apiRequest(`/admin/users/${userId}/revoke-sessions`, token, { method: 'POST', body: '{}' });
    if (selectedUser?.id === userId) {
      await loadUserDetail(userId);
    }
  }

  async function resetPassword() {
    if (!resetPasswordPayload.userId) return;
    await apiRequest(`/admin/users/${resetPasswordPayload.userId}/reset-password`, token, {
      method: 'POST',
      body: JSON.stringify({ password: resetPasswordPayload.newPassword }),
    });
  }

  async function changeChatStatus(chatId: string, isDisabled: boolean) {
    await apiRequest(`/admin/chats/${chatId}/status`, token, { method: 'PATCH', body: JSON.stringify({ isDisabled }) });
    await loadChats();
  }

  async function resolveReport(reportId: string) {
    await apiRequest(`/admin/reports/${reportId}/resolve`, token, { method: 'POST', body: '{}' });
    await loadReports();
  }

  async function exportAuditCsv() {
    const csv = (await apiRequest(`/admin/audit-logs.csv?limit=${auditFilter.limit || '200'}`, token)) as string;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveSetting() {
    const parsedValue = tryJsonParse(settingPayload.value);
    await apiRequest('/admin/settings', token, {
      method: 'POST',
      body: JSON.stringify({ key: settingPayload.key, value: parsedValue }),
    });
    await loadSettings();
  }

  async function moderateDeleteMessage() {
    if (!modPayload.messageId) return;
    await apiRequest(`/admin/messages/${modPayload.messageId}/delete`, token, {
      method: 'POST',
      body: JSON.stringify({ reason: modPayload.reason }),
    });
  }

  return (
    <div className="container">
      <h1>Dasheu Chat Admin Control Center</h1>
      {!token ? (
        <div className="card">
          <h2>Вход администратора</h2>
          <div className="row">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
            <button className="primary" onClick={login}>Войти</button>
          </div>
          {error && <p className="small">Ошибка: {error}</p>}
        </div>
      ) : (
        <>
          <div className="tabs">
            {tabs.map((name) => (
              <button key={name} className={tab === name ? 'tab-active' : ''} onClick={() => setTab(name)}>
                {name}
              </button>
            ))}
            <button onClick={() => setToken('')}>Выйти</button>
          </div>

          {tab === 'dashboard' && (
            <div className="grid">
              <div className="card">
                <div className="row">
                  <h2>Общая статистика</h2>
                  <button onClick={loadDashboard}>Обновить</button>
                </div>
                <div className="grid kpi">
                  <Kpi title="Users" value={dashboard?.counters?.users} />
                  <Kpi title="Active Sessions" value={dashboard?.counters?.sessions} />
                  <Kpi title="Chats" value={dashboard?.counters?.chats} />
                  <Kpi title="Messages" value={dashboard?.counters?.messages} />
                  <Kpi title="Files" value={dashboard?.counters?.files} />
                  <Kpi title="Open Reports" value={dashboard?.counters?.reportsOpen} />
                </div>
              </div>

              <div className="card">
                <h3>Тренд сообщений (7 дней)</h3>
                <table className="table">
                  <thead><tr><th>Дата</th><th>Сообщений</th></tr></thead>
                  <tbody>
                    {trend.map((t: any) => (
                      <tr key={t.date}><td>{t.date}</td><td>{t.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h3>Пользователи по ролям</h3>
                <table className="table">
                  <thead><tr><th>Role</th><th>Count</th></tr></thead>
                  <tbody>
                    {roleStats.map((r: any) => (
                      <tr key={r.role}><td>{r.role}</td><td>{r.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h3>Последние события аудита</h3>
                <pre>{JSON.stringify(dashboard?.recent ?? [], null, 2)}</pre>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="grid">
              <div className="card">
                <h2>Создать пользователя</h2>
                <div className="row">
                  <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="username" />
                  <input value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} placeholder="display name" />
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="password" />
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="user">user</option>
                    <option value="support">support</option>
                    <option value="moderator">moderator</option>
                    <option value="superadmin">superadmin</option>
                    <option value="owner">owner</option>
                  </select>
                  <button className="primary" onClick={createUser}>Создать</button>
                </div>
              </div>

              <div className="card">
                <h2>Поиск и фильтры пользователей</h2>
                <div className="row">
                  <input value={usersFilter.q} onChange={(e) => setUsersFilter({ ...usersFilter, q: e.target.value })} placeholder="поиск username" />
                  <select value={usersFilter.role} onChange={(e) => setUsersFilter({ ...usersFilter, role: e.target.value })}>
                    <option value="">all roles</option>
                    <option value="owner">owner</option>
                    <option value="superadmin">superadmin</option>
                    <option value="moderator">moderator</option>
                    <option value="support">support</option>
                    <option value="user">user</option>
                  </select>
                  <select value={usersFilter.isActive} onChange={(e) => setUsersFilter({ ...usersFilter, isActive: e.target.value })}>
                    <option value="">all status</option>
                    <option value="true">active</option>
                    <option value="false">disabled</option>
                  </select>
                  <button onClick={loadUsers}>Применить</button>
                </div>

                <table className="table">
                  <thead>
                    <tr>
                      <th>username</th><th>role</th><th>active</th><th>must change pass</th><th>messages</th><th>sessions</th><th>actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <button onClick={() => loadUserDetail(u.id)}>{u.username}</button>
                        </td>
                        <td>{u.role}</td>
                        <td>{String(u.isActive)}</td>
                        <td>{String(u.mustChangePassword)}</td>
                        <td>{u._count?.messages ?? 0}</td>
                        <td>{u._count?.sessions ?? 0}</td>
                        <td>
                          <div className="row">
                            <button onClick={() => updateUser(u.id, { isActive: !u.isActive })}>{u.isActive ? 'Disable' : 'Enable'}</button>
                            <button onClick={() => updateUser(u.id, { mustChangePassword: true })}>Force password change</button>
                            <button onClick={() => revokeSessions(u.id)}>Revoke sessions</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>Сброс пароля пользователя</h2>
                <div className="row">
                  <input value={resetPasswordPayload.userId} onChange={(e) => setResetPasswordPayload({ ...resetPasswordPayload, userId: e.target.value })} placeholder="userId" />
                  <input type="password" value={resetPasswordPayload.newPassword} onChange={(e) => setResetPasswordPayload({ ...resetPasswordPayload, newPassword: e.target.value })} placeholder="new password" />
                  <button className="warn" onClick={resetPassword}>Сбросить пароль</button>
                </div>
              </div>

              {selectedUser && (
                <div className="card">
                  <h2>User detail: {selectedUser.username}</h2>
                  <pre>{JSON.stringify(selectedUser, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {tab === 'chats' && (
            <div className="card">
              <h2>Управление чатами</h2>
              <div className="row">
                <input value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} placeholder="поиск по title/description" />
                <button onClick={loadChats}>Искать</button>
              </div>
              <table className="table">
                <thead><tr><th>chatId</th><th>type</th><th>title</th><th>members</th><th>messages</th><th>disabled</th><th>actions</th></tr></thead>
                <tbody>
                  {chats.map((c) => (
                    <tr key={c.id}>
                      <td className="small">{c.id}</td>
                      <td>{c.type}</td>
                      <td>{c.title || '-'}</td>
                      <td>{c._count?.members ?? 0}</td>
                      <td>{c._count?.messages ?? 0}</td>
                      <td>{String(c.isDisabled)}</td>
                      <td>
                        <button className={c.isDisabled ? 'primary' : 'warn'} onClick={() => changeChatStatus(c.id, !c.isDisabled)}>
                          {c.isDisabled ? 'Enable chat' : 'Disable chat'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'reports' && (
            <div className="card">
              <h2>Модерация репортов</h2>
              <div className="row">
                <button onClick={() => loadReports('open')}>Открытые</button>
                <button onClick={() => loadReports('resolved')}>Решённые</button>
                <button onClick={() => loadReports()}>Все</button>
              </div>
              <table className="table">
                <thead><tr><th>id</th><th>reason</th><th>targetUser</th><th>targetChat</th><th>createdAt</th><th>resolvedAt</th><th>action</th></tr></thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="small">{r.id}</td>
                      <td>{r.reason}</td>
                      <td className="small">{r.targetUserId || '-'}</td>
                      <td className="small">{r.targetChatId || '-'}</td>
                      <td>{String(r.createdAt)}</td>
                      <td>{r.resolvedAt ? String(r.resolvedAt) : 'open'}</td>
                      <td>{!r.resolvedAt && <button onClick={() => resolveReport(r.id)}>Resolve</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'audit' && (
            <div className="card">
              <h2>Аудит-логи</h2>
              <div className="row">
                <input value={auditFilter.action} onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value })} placeholder="filter by action" />
                <input value={auditFilter.limit} onChange={(e) => setAuditFilter({ ...auditFilter, limit: e.target.value })} placeholder="limit" />
                <button onClick={loadAudit}>Применить</button>
                <button className="primary" onClick={exportAuditCsv}>Экспорт CSV</button>
              </div>
              <pre>{JSON.stringify(auditLogs, null, 2)}</pre>
            </div>
          )}

          {tab === 'settings' && (
            <div className="grid">
              <div className="card">
                <h2>Системные настройки</h2>
                <div className="row">
                  <input value={settingPayload.key} onChange={(e) => setSettingPayload({ ...settingPayload, key: e.target.value })} placeholder="setting key" />
                  <textarea value={settingPayload.value} onChange={(e) => setSettingPayload({ ...settingPayload, value: e.target.value })} placeholder="JSON value" />
                  <button className="primary" onClick={saveSetting}>Сохранить</button>
                </div>
              </div>
              <div className="card">
                <h3>Текущие значения</h3>
                <pre>{JSON.stringify(settings, null, 2)}</pre>
              </div>
            </div>
          )}

          {tab === 'moderation' && (
            <div className="card">
              <h2>Быстрые модерационные действия</h2>
              <div className="row">
                <input value={modPayload.messageId} onChange={(e) => setModPayload({ ...modPayload, messageId: e.target.value })} placeholder="messageId" />
                <input value={modPayload.reason} onChange={(e) => setModPayload({ ...modPayload, reason: e.target.value })} placeholder="reason" />
                <button className="danger" onClick={moderateDeleteMessage}>Удалить сообщение (for everyone)</button>
              </div>
              <p className="small">Все действия пишутся в audit log и доступны в разделе Audit.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number | string | undefined }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value ?? '-'}</div>
    </div>
  );
}

function tryJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
