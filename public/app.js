const state = {
  tasks: [],
  members: [],
  labels: [],
  currentUser: null,
  currentView: 'board',
  selectedLabelIds: new Set(),
};

const STATUS_LABELS = { todo: 'Cần làm', doing: 'Đang làm', done: 'Hoàn thành' };
const PRIORITY_LABELS = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Co loi xay ra');
  return data;
}

// ================= AUTH =================

async function initAuth() {
  const status = await api('/api/auth/status');
  if (status.needsSetup) {
    $('setupForm').style.display = 'block';
    $('loginForm').style.display = 'none';
    $('authView').style.display = 'flex';
    $('appShell').style.display = 'none';
  } else if (!status.loggedIn) {
    $('setupForm').style.display = 'none';
    $('loginForm').style.display = 'block';
    $('authView').style.display = 'flex';
    $('appShell').style.display = 'none';
  } else {
    state.currentUser = status.user;
    $('authView').style.display = 'none';
    $('appShell').style.display = 'block';
    await bootApp();
  }
}

$('setupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('setupError').textContent = '';
  try {
    const result = await api('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({
        name: $('setupName').value,
        username: $('setupUsername').value,
        password: $('setupPassword').value,
      }),
    });
    state.currentUser = result.user;
    $('authView').style.display = 'none';
    $('appShell').style.display = 'block';
    await bootApp();
  } catch (err) {
    $('setupError').textContent = err.message;
  }
});

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginError').textContent = '';
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('loginUsername').value,
        password: $('loginPassword').value,
      }),
    });
    state.currentUser = result.user;
    $('authView').style.display = 'none';
    $('appShell').style.display = 'block';
    await bootApp();
  } catch (err) {
    $('loginError').textContent = err.message;
  }
});

$('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  location.reload();
});

// ================= BOOTSTRAP =================

async function bootApp() {
  $('currentUserBadge').textContent = `Xin chào, ${state.currentUser.name}`;
  await Promise.all([fetchMembers(), fetchLabels(), fetchTasks()]);
  switchView('board');
}

// ================= NAV =================

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  ['board', 'dashboard', 'members'].forEach(v => {
    $(`${v}View`).style.display = v === view ? 'block' : 'none';
  });
  if (view === 'dashboard') renderDashboard();
  if (view === 'members') renderMembers();
}

// ================= DATA FETCH =================

async function fetchTasks() {
  state.tasks = await api('/api/tasks');
  renderBoard();
}

async function fetchMembers() {
  state.members = await api('/api/members');
  const options = '<option value="">Tất cả người phụ trách</option>' +
    state.members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  $('filterAssignee').innerHTML = options;
  $('assigneeInput').innerHTML = '<option value="">-- Chưa gán --</option>' +
    state.members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

async function fetchLabels() {
  state.labels = await api('/api/labels');
  $('filterLabel').innerHTML = '<option value="">Tất cả nhãn</option>' +
    state.labels.map(l => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('');
  renderLabelPicker();
}

// ================= BOARD =================

function getFilteredTasks() {
  const q = $('searchInput').value.trim().toLowerCase();
  const assignee = $('filterAssignee').value;
  const priority = $('filterPriority').value;
  const labelId = $('filterLabel').value;
  return state.tasks.filter(t => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (assignee && String(t.assignee?.id || '') !== assignee) return false;
    if (priority && t.priority !== priority) return false;
    if (labelId && !t.labels.some(l => String(l.id) === labelId)) return false;
    return true;
  });
}

function dueBadge(task) {
  if (!task.due_date || task.status === 'done') return '';
  const today = new Date().toISOString().slice(0, 10);
  const diffDays = (new Date(task.due_date) - new Date(today)) / 86400000;
  if (diffDays < 0) return `<span class="badge overdue">Quá hạn ${escapeHtml(task.due_date)}</span>`;
  if (diffDays <= 2) return `<span class="badge due-soon">Sắp hạn ${escapeHtml(task.due_date)}</span>`;
  return `<span class="badge">Hạn: ${escapeHtml(task.due_date)}</span>`;
}

function cardHtml(t) {
  const chips = t.labels.map(l =>
    `<span class="label-chip" style="background:${l.color}">${escapeHtml(l.name)}</span>`).join('');
  const assigneeMeta = t.assignee
    ? `<span><span class="avatar-dot" style="background:${t.assignee.color}"></span>${escapeHtml(t.assignee.name)}</span>`
    : '';
  const checklist = t.subtasks_summary.total > 0
    ? `<span>☑ ${t.subtasks_summary.done}/${t.subtasks_summary.total}</span>` : '';
  return `
    <div class="card" draggable="true" data-id="${t.id}">
      <div class="chips">${chips}</div>
      <div class="title">${escapeHtml(t.title)}</div>
      <div class="meta">
        <span class="badge priority-${t.priority}">${PRIORITY_LABELS[t.priority]}</span>
        ${assigneeMeta}
        ${checklist}
        ${dueBadge(t)}
      </div>
    </div>
  `;
}

function renderBoard() {
  const filtered = getFilteredTasks();
  ['todo', 'doing', 'done'].forEach(status => {
    const container = $(`cards-${status}`);
    const tasksForStatus = filtered.filter(t => t.status === status);
    $(`count-${status}`).textContent = tasksForStatus.length;
    container.innerHTML = tasksForStatus.map(cardHtml).join('');
  });

  document.querySelectorAll('.card').forEach(cardEl => {
    cardEl.addEventListener('click', () => openEditModal(Number(cardEl.dataset.id)));
    cardEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', cardEl.dataset.id);
      cardEl.classList.add('dragging');
    });
    cardEl.addEventListener('dragend', () => cardEl.classList.remove('dragging'));
  });
}

document.querySelectorAll('.droppable').forEach(zone => {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = zone.dataset.status;
    await api(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    await fetchTasks();
  });
});

['searchInput', 'filterAssignee', 'filterPriority', 'filterLabel'].forEach(id => {
  $(id).addEventListener('input', renderBoard);
  $(id).addEventListener('change', renderBoard);
});

// ================= TASK MODAL =================

function renderLabelPicker() {
  $('labelPicker').innerHTML = state.labels.map(l => `
    <button type="button" class="label-toggle ${state.selectedLabelIds.has(l.id) ? 'selected' : ''}"
      style="background:${l.color}" data-id="${l.id}">${escapeHtml(l.name)}</button>
  `).join('') || '<span style="font-size:13px;color:#97a0af">Chưa có nhãn nào</span>';

  document.querySelectorAll('.label-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      if (state.selectedLabelIds.has(id)) state.selectedLabelIds.delete(id);
      else state.selectedLabelIds.add(id);
      renderLabelPicker();
    });
  });
}

$('addLabelBtn').addEventListener('click', async () => {
  const name = $('newLabelName').value.trim();
  if (!name) return;
  const label = await api('/api/labels', {
    method: 'POST',
    body: JSON.stringify({ name, color: $('newLabelColor').value }),
  }).catch(err => { alert(err.message); return null; });
  if (!label) return;
  $('newLabelName').value = '';
  await fetchLabels();
  state.selectedLabelIds.add(label.id);
  renderLabelPicker();
});

function openNewModal() {
  $('modalTitle').textContent = 'Task mới';
  $('taskId').value = '';
  $('titleInput').value = '';
  $('descInput').value = '';
  $('assigneeInput').value = '';
  $('statusInput').value = 'todo';
  $('priorityInput').value = 'medium';
  $('dueDateInput').value = '';
  $('deleteBtn').style.display = 'none';
  $('detailSectionsWrap').style.display = 'none';
  state.selectedLabelIds = new Set();
  renderLabelPicker();
  $('modalOverlay').classList.add('open');
  $('titleInput').focus();
}

async function openEditModal(id) {
  const task = await api(`/api/tasks/${id}`);
  $('modalTitle').textContent = 'Sửa task';
  $('taskId').value = task.id;
  $('titleInput').value = task.title;
  $('descInput').value = task.description || '';
  $('assigneeInput').value = task.assignee ? task.assignee.id : '';
  $('statusInput').value = task.status;
  $('priorityInput').value = task.priority;
  $('dueDateInput').value = task.due_date || '';
  $('deleteBtn').style.display = 'inline-block';
  $('detailSectionsWrap').style.display = 'block';
  state.selectedLabelIds = new Set(task.labels.map(l => l.id));
  renderLabelPicker();
  renderSubtasks(task.subtasks);
  renderLinks(task.links);
  renderComments(task.comments);
  $('modalOverlay').classList.add('open');
}

function closeModal() {
  $('modalOverlay').classList.remove('open');
}

function renderSubtasks(subtasks) {
  $('subtaskList').innerHTML = subtasks.map(s => `
    <div class="subtask-row" data-id="${s.id}">
      <input type="checkbox" class="subtask-check" ${s.done ? 'checked' : ''}>
      <span class="${s.done ? 'done' : ''}">${escapeHtml(s.text)}</span>
      <span class="spacer"></span>
      <button type="button" class="btn-icon subtask-delete">✕</button>
    </div>
  `).join('') || '<span style="font-size:13px;color:#97a0af">Chưa có việc nào</span>';

  $('subtaskList').querySelectorAll('.subtask-check').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = cb.closest('.subtask-row').dataset.id;
      const task = await api(`/api/subtasks/${id}`, { method: 'PUT', body: JSON.stringify({ done: cb.checked }) });
      renderSubtasks(task.subtasks);
      await fetchTasks();
    });
  });
  $('subtaskList').querySelectorAll('.subtask-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.subtask-row').dataset.id;
      const task = await api(`/api/subtasks/${id}`, { method: 'DELETE' });
      renderSubtasks(task.subtasks);
      await fetchTasks();
    });
  });
}

$('addSubtaskBtn').addEventListener('click', async () => {
  const text = $('newSubtaskText').value.trim();
  const taskId = $('taskId').value;
  if (!text || !taskId) return;
  const task = await api(`/api/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ text }) });
  $('newSubtaskText').value = '';
  renderSubtasks(task.subtasks);
  await fetchTasks();
});

function renderLinks(links) {
  $('linkList').innerHTML = links.map(l => `
    <div class="link-row" data-id="${l.id}">
      <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.title || l.url)}</a>
      <button type="button" class="btn-icon link-delete">✕</button>
    </div>
  `).join('') || '<span style="font-size:13px;color:#97a0af">Chưa có link nào</span>';

  $('linkList').querySelectorAll('.link-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.link-row').dataset.id;
      const task = await api(`/api/links/${id}`, { method: 'DELETE' });
      renderLinks(task.links);
    });
  });
}

$('addLinkBtn').addEventListener('click', async () => {
  const url = $('newLinkUrl').value.trim();
  const title = $('newLinkTitle').value.trim();
  const taskId = $('taskId').value;
  if (!url || !taskId) return;
  const task = await api(`/api/tasks/${taskId}/links`, { method: 'POST', body: JSON.stringify({ url, title }) })
    .catch(err => { alert(err.message); return null; });
  if (!task) return;
  $('newLinkUrl').value = '';
  $('newLinkTitle').value = '';
  renderLinks(task.links);
});

function renderComments(comments) {
  $('commentList').innerHTML = comments.map(c => `
    <div class="comment-row" data-id="${c.id}">
      <div class="meta">
        <span>${escapeHtml(c.user_name || 'Ẩn danh')}</span>
        <span>${escapeHtml(c.created_at)}</span>
      </div>
      <div>${escapeHtml(c.text)}</div>
    </div>
  `).join('') || '<span style="font-size:13px;color:#97a0af">Chưa có bình luận nào</span>';
  $('commentList').scrollTop = $('commentList').scrollHeight;
}

$('addCommentBtn').addEventListener('click', async () => {
  const text = $('newCommentText').value.trim();
  const taskId = $('taskId').value;
  if (!text || !taskId) return;
  const task = await api(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
  $('newCommentText').value = '';
  renderComments(task.comments);
});

async function handleSubmit(e) {
  e.preventDefault();
  const payload = {
    title: $('titleInput').value,
    description: $('descInput').value,
    assignee_id: $('assigneeInput').value ? Number($('assigneeInput').value) : null,
    status: $('statusInput').value,
    priority: $('priorityInput').value,
    due_date: $('dueDateInput').value,
  };
  const id = $('taskId').value;
  let taskId = id;
  try {
    if (id) {
      await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      const created = await api('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
      taskId = created.id;
    }
    await api(`/api/tasks/${taskId}/labels`, {
      method: 'PUT',
      body: JSON.stringify({ label_ids: Array.from(state.selectedLabelIds) }),
    });
  } catch (err) {
    alert(err.message);
    return;
  }
  closeModal();
  await fetchTasks();
}

async function handleDelete() {
  const id = $('taskId').value;
  if (!id) return;
  if (!confirm('Xóa task này?')) return;
  await api(`/api/tasks/${id}`, { method: 'DELETE' });
  closeModal();
  await fetchTasks();
}

$('newTaskBtn').addEventListener('click', openNewModal);
$('cancelBtn').addEventListener('click', closeModal);
$('deleteBtn').addEventListener('click', handleDelete);
$('taskForm').addEventListener('submit', handleSubmit);
$('modalOverlay').addEventListener('click', (e) => { if (e.target === $('modalOverlay')) closeModal(); });

// ================= DASHBOARD =================

async function renderDashboard() {
  const stats = await api('/api/dashboard/stats');
  $('statCards').innerHTML = `
    <div class="stat-card"><div class="value">${stats.total}</div><div class="label">Tổng số task</div></div>
    <div class="stat-card"><div class="value">${stats.byStatus.todo}</div><div class="label">Cần làm</div></div>
    <div class="stat-card"><div class="value">${stats.byStatus.doing}</div><div class="label">Đang làm</div></div>
    <div class="stat-card"><div class="value">${stats.byStatus.done}</div><div class="label">Hoàn thành (${stats.percentDone}%)</div></div>
    <div class="stat-card"><div class="value">${stats.overdue}</div><div class="label">Quá hạn</div></div>
  `;

  const maxTotal = Math.max(1, ...stats.byAssignee.map(a => a.total));
  $('assigneeChart').innerHTML = stats.byAssignee.map(a => `
    <div class="bar-row">
      <span class="name"><span class="avatar-dot" style="background:${a.color}"></span>${escapeHtml(a.name)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(a.total / maxTotal) * 100}%;background:${a.color}"></div></div>
      <span class="num">${a.done}/${a.total}</span>
    </div>
  `).join('') || '<span style="font-size:13px;color:#97a0af">Chưa có thành viên nào</span>';
}

// ================= MEMBERS =================

function renderMembers() {
  $('membersTableBody').innerHTML = state.members.map(m => `
    <tr data-id="${m.id}">
      <td><span class="avatar-dot" style="background:${m.color}"></span></td>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.username)}</td>
      <td><button type="button" class="btn-icon member-delete">Xóa</button></td>
    </tr>
  `).join('');

  $('membersTableBody').querySelectorAll('.member-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      if (!confirm('Xóa thành viên này? Các task đang gán sẽ về trạng thái chưa gán.')) return;
      await api(`/api/members/${id}`, { method: 'DELETE' });
      await fetchMembers();
      await fetchTasks();
      renderMembers();
    });
  });
}

$('addMemberBtn').addEventListener('click', () => {
  $('memberForm').reset();
  $('memberModalOverlay').classList.add('open');
});
$('memberCancelBtn').addEventListener('click', () => $('memberModalOverlay').classList.remove('open'));
$('memberModalOverlay').addEventListener('click', (e) => {
  if (e.target === $('memberModalOverlay')) $('memberModalOverlay').classList.remove('open');
});

$('memberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/members', {
      method: 'POST',
      body: JSON.stringify({
        name: $('memberName').value,
        username: $('memberUsername').value,
        password: $('memberPassword').value,
      }),
    });
  } catch (err) {
    alert(err.message);
    return;
  }
  $('memberModalOverlay').classList.remove('open');
  await fetchMembers();
  renderMembers();
});

// ================= EXPORT =================

$('exportCsvBtn').addEventListener('click', () => {
  window.open('/api/export/csv', '_blank');
});

// ================= INIT =================

initAuth();
