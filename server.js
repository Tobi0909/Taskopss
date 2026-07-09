const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const { getSessionSecret, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3456;

const VALID_STATUS = ['todo', 'doing', 'done'];
const VALID_PRIORITY = ['low', 'medium', 'high'];

app.use(express.json());
app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

// ---------- helpers ----------

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, name: u.name, color: u.color };
}

function getTaskSummaries() {
  const rows = db.prepare(`
    SELECT t.*, u.name AS assignee_name, u.color AS assignee_color
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    ORDER BY t.created_at DESC
  `).all();

  const labelRows = db.prepare(`
    SELECT tl.task_id, l.id, l.name, l.color
    FROM task_labels tl JOIN labels l ON l.id = tl.label_id
  `).all();
  const labelsByTask = {};
  for (const lr of labelRows) {
    (labelsByTask[lr.task_id] = labelsByTask[lr.task_id] || []).push({ id: lr.id, name: lr.name, color: lr.color });
  }

  const subtaskCounts = db.prepare(`
    SELECT task_id, COUNT(*) AS total, SUM(done) AS done
    FROM subtasks GROUP BY task_id
  `).all();
  const subtasksByTask = {};
  for (const s of subtaskCounts) subtasksByTask[s.task_id] = { total: s.total, done: s.done || 0 };

  return rows.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    created_at: t.created_at,
    assignee: t.assignee_id ? { id: t.assignee_id, name: t.assignee_name, color: t.assignee_color } : null,
    labels: labelsByTask[t.id] || [],
    subtasks_summary: subtasksByTask[t.id] || { total: 0, done: 0 },
  }));
}

function getTaskDetail(id) {
  const t = db.prepare(`
    SELECT t.*, u.name AS assignee_name, u.color AS assignee_color
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.id = ?
  `).get(id);
  if (!t) return null;

  const labels = db.prepare(`
    SELECT l.id, l.name, l.color FROM task_labels tl
    JOIN labels l ON l.id = tl.label_id WHERE tl.task_id = ?
  `).all(id);

  const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY id').all(id);

  const comments = db.prepare(`
    SELECT c.*, u.name AS user_name, u.color AS user_color FROM comments c
    LEFT JOIN users u ON u.id = c.user_id WHERE c.task_id = ? ORDER BY c.created_at
  `).all(id);

  const links = db.prepare('SELECT * FROM links WHERE task_id = ? ORDER BY id').all(id);

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    created_at: t.created_at,
    assignee: t.assignee_id ? { id: t.assignee_id, name: t.assignee_name, color: t.assignee_color } : null,
    labels,
    subtasks,
    comments,
    links,
  };
}

// ---------- auth ----------

app.get('/api/auth/status', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const user = req.session.userId
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
    : null;
  res.json({ needsSetup: userCount === 0, loggedIn: !!user, user: publicUser(user) });
});

app.post('/api/auth/setup', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) {
    return res.status(400).json({ error: 'He thong da co tai khoan, khong the setup lai' });
  }
  const { username, name, password } = req.body;
  if (!username || !name || !password || password.length < 4) {
    return res.status(400).json({ error: 'Thieu thong tin hoac mat khau qua ngan (toi thieu 4 ky tu)' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (username, name, password_hash, color) VALUES (?, ?, ?, ?)
  `).run(username.trim(), name.trim(), hash, randomColor());
  req.session.userId = info.lastInsertRowid;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get((username || '').trim());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Sai ten dang nhap hoac mat khau' });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

const COLOR_PALETTE = ['#0052cc', '#00875a', '#de350b', '#6554c0', '#ff8b00', '#00a3bf', '#bf2600', '#5243aa'];
function randomColor() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

// ---------- members (users) ----------

app.get('/api/members', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, username, name, color FROM users ORDER BY name').all();
  res.json(rows);
});

app.post('/api/members', requireAuth, (req, res) => {
  const { username, name, password, color } = req.body;
  if (!username || !name || !password || password.length < 4) {
    return res.status(400).json({ error: 'Thieu thong tin hoac mat khau qua ngan (toi thieu 4 ky tu)' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) {
    return res.status(400).json({ error: 'Ten dang nhap da ton tai' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (username, name, password_hash, color) VALUES (?, ?, ?, ?)
  `).run(username.trim(), name.trim(), hash, color || randomColor());
  const created = db.prepare('SELECT id, username, name, color FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/members/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Khong tim thay thanh vien' });
  const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
  const color = req.body.color || existing.color;
  if (!name) return res.status(400).json({ error: 'Ten khong duoc de trong' });
  db.prepare('UPDATE users SET name = ?, color = ? WHERE id = ?').run(name, color, req.params.id);
  if (req.body.password && req.body.password.length >= 4) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(bcrypt.hashSync(req.body.password, 10), req.params.id);
  }
  const updated = db.prepare('SELECT id, username, name, color FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/members/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Khong tim thay thanh vien' });
  res.status(204).end();
});

// ---------- labels ----------

app.get('/api/labels', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM labels ORDER BY name').all());
});

app.post('/api/labels', requireAuth, (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Ten nhan khong duoc de trong' });
  try {
    const info = db.prepare('INSERT INTO labels (name, color) VALUES (?, ?)')
      .run(name.trim(), color || '#5e6c84');
    res.status(201).json(db.prepare('SELECT * FROM labels WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: 'Nhan da ton tai' });
  }
});

app.delete('/api/labels/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM labels WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Khong tim thay nhan' });
  res.status(204).end();
});

// ---------- tasks ----------

app.get('/api/tasks', requireAuth, (req, res) => {
  res.json(getTaskSummaries());
});

app.get('/api/tasks/:id', requireAuth, (req, res) => {
  const task = getTaskDetail(req.params.id);
  if (!task) return res.status(404).json({ error: 'Khong tim thay task' });
  res.json(task);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, assignee_id, status, priority, due_date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Tieu de khong duoc de trong' });
  const finalStatus = VALID_STATUS.includes(status) ? status : 'todo';
  const finalPriority = VALID_PRIORITY.includes(priority) ? priority : 'medium';

  const info = db.prepare(`
    INSERT INTO tasks (title, description, assignee_id, status, priority, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title.trim(), description || '', assignee_id || null, finalStatus, finalPriority, due_date || '', req.session.userId);

  res.status(201).json(getTaskDetail(info.lastInsertRowid));
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Khong tim thay task' });

  const title = req.body.title !== undefined ? req.body.title : existing.title;
  const description = req.body.description !== undefined ? req.body.description : existing.description;
  const assignee_id = req.body.assignee_id !== undefined ? req.body.assignee_id : existing.assignee_id;
  const status = VALID_STATUS.includes(req.body.status) ? req.body.status : existing.status;
  const priority = VALID_PRIORITY.includes(req.body.priority) ? req.body.priority : existing.priority;
  const due_date = req.body.due_date !== undefined ? req.body.due_date : existing.due_date;

  if (!title || !title.trim()) return res.status(400).json({ error: 'Tieu de khong duoc de trong' });

  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, assignee_id = ?, status = ?, priority = ?, due_date = ?
    WHERE id = ?
  `).run(title.trim(), description, assignee_id || null, status, priority, due_date, req.params.id);

  res.json(getTaskDetail(req.params.id));
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Khong tim thay task' });
  res.status(204).end();
});

app.put('/api/tasks/:id/labels', requireAuth, (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Khong tim thay task' });
  const labelIds = Array.isArray(req.body.label_ids) ? req.body.label_ids : [];

  const applyLabels = db.transaction((ids) => {
    db.prepare('DELETE FROM task_labels WHERE task_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)');
    for (const labelId of ids) insert.run(req.params.id, labelId);
  });
  applyLabels(labelIds);

  res.json(getTaskDetail(req.params.id));
});

// ---------- subtasks ----------

app.post('/api/tasks/:id/subtasks', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Noi dung khong duoc de trong' });
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Khong tim thay task' });
  db.prepare('INSERT INTO subtasks (task_id, text) VALUES (?, ?)').run(req.params.id, text.trim());
  res.status(201).json(getTaskDetail(req.params.id));
});

app.put('/api/subtasks/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Khong tim thay subtask' });
  const text = req.body.text !== undefined ? req.body.text : existing.text;
  const done = req.body.done !== undefined ? (req.body.done ? 1 : 0) : existing.done;
  db.prepare('UPDATE subtasks SET text = ?, done = ? WHERE id = ?').run(text, done, req.params.id);
  res.json(getTaskDetail(existing.task_id));
});

app.delete('/api/subtasks/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Khong tim thay subtask' });
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.id);
  res.json(getTaskDetail(existing.task_id));
});

// ---------- comments ----------

app.post('/api/tasks/:id/comments', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Noi dung khong duoc de trong' });
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Khong tim thay task' });
  db.prepare('INSERT INTO comments (task_id, user_id, text) VALUES (?, ?, ?)')
    .run(req.params.id, req.session.userId, text.trim());
  res.status(201).json(getTaskDetail(req.params.id));
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Khong tim thay binh luan' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json(getTaskDetail(existing.task_id));
});

// ---------- links ----------

app.post('/api/tasks/:id/links', requireAuth, (req, res) => {
  const { title, url } = req.body;
  if (!url || !url.trim()) return res.status(400).json({ error: 'URL khong duoc de trong' });
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Khong tim thay task' });
  db.prepare('INSERT INTO links (task_id, title, url) VALUES (?, ?, ?)')
    .run(req.params.id, title || '', url.trim());
  res.status(201).json(getTaskDetail(req.params.id));
});

app.delete('/api/links/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Khong tim thay link' });
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  res.json(getTaskDetail(existing.task_id));
});

// ---------- dashboard ----------

app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS c FROM tasks').get().c;
  const byStatus = {};
  for (const s of VALID_STATUS) {
    byStatus[s] = db.prepare('SELECT COUNT(*) AS c FROM tasks WHERE status = ?').get(s).c;
  }
  const today = new Date().toISOString().slice(0, 10);
  const overdue = db.prepare(`
    SELECT COUNT(*) AS c FROM tasks WHERE due_date != '' AND due_date < ? AND status != 'done'
  `).get(today).c;

  const byAssignee = db.prepare(`
    SELECT u.id, u.name, u.color, COUNT(t.id) AS total,
           SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done
    FROM users u LEFT JOIN tasks t ON t.assignee_id = u.id
    GROUP BY u.id ORDER BY u.name
  `).all();

  res.json({
    total,
    byStatus,
    overdue,
    percentDone: total > 0 ? Math.round((byStatus.done / total) * 100) : 0,
    byAssignee,
  });
});

// ---------- export ----------

app.get('/api/export/csv', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, u.name AS assignee
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    ORDER BY t.created_at DESC
  `).all();

  const labelRows = db.prepare(`
    SELECT tl.task_id, l.name FROM task_labels tl JOIN labels l ON l.id = tl.label_id
  `).all();
  const labelsByTask = {};
  for (const lr of labelRows) {
    (labelsByTask[lr.task_id] = labelsByTask[lr.task_id] || []).push(lr.name);
  }

  const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['ID', 'Tieu de', 'Mo ta', 'Trang thai', 'Uu tien', 'Han chot', 'Nguoi phu trach', 'Nhan'];
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push([
      r.id, r.title, r.description, r.status, r.priority, r.due_date,
      r.assignee || '', (labelsByTask[r.id] || []).join('; '),
    ].map(csvEscape).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
  res.send('﻿' + lines.join('\r\n'));
});

// ---------- static ----------

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Team Task Manager dang chay tai http://localhost:${PORT}`);
});
