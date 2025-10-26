/***********************
 * SmartTask - Frontend
 * Demo ligero sin servidor 
 ***********************/
const demoUsers = [
  { id: 'u1', name: 'Valeria (Supervisora)' },
  { id: 'u2', name: 'Yahir (Operativo)' },
  { id: 'u3', name: 'Odalys (Operativa)' },
  { id: 'u4', name: 'Carlos (Limpieza)' }
];

const assigneeSelect = document.getElementById('assignee');
const usersList = document.getElementById('usersList');
const createBtn = document.getElementById('createBtn');
const autoAssignBtn = document.getElementById('autoAssignBtn');
const tasksList = document.getElementById('tasksList');
const filterStatus = document.getElementById('filterStatus');
const searchInput = document.getElementById('search');
const statTotal = document.getElementById('statTotal');
const statInProg = document.getElementById('statInProg');
const statLate = document.getElementById('statLate');
const clearBtn = document.getElementById('clear');

let tasks = [];

function init() {
  demoUsers.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    assigneeSelect.appendChild(opt);
    const li = document.createElement('li');
    li.textContent = u.name;
    usersList.appendChild(li);
  });

  const saved = localStorage.getItem('smarttask_tasks_v1');
  if (saved) {
    try { tasks = JSON.parse(saved); } catch(e){ tasks = []; }
  } else {
    tasks = [
      { id: genId(), title: 'Revisar área B', desc: 'Control rápido de equipaje en zona B', assigneeId: 'u2', status: 'pending', createdAt: Date.now()-3600*1000*6, deadline: null },
      { id: genId(), title: 'Reabastecer carrito 3', desc: 'Traer insumos a carrito 3', assigneeId: 'u3', status: 'inprogress', createdAt: Date.now()-3600*1000*2, deadline: null }
    ];
    save();
  }
  render();
  setInterval(checkLateTasks, 30_000);
}

function genId() { return 't' + Math.random().toString(36).slice(2,9); }
function save() { localStorage.setItem('smarttask_tasks_v1', JSON.stringify(tasks)); }

createBtn.addEventListener('click', () => {
  const title = document.getElementById('title').value.trim();
  const desc = document.getElementById('desc').value.trim();
  const assigneeId = assigneeSelect.value;
  const deadline = document.getElementById('deadline').value || null;
  if (!title) { alert('Agrega un título a la tarea.'); return; }

  const newTask = {
    id: genId(), title, desc, assigneeId, status: 'pending',
    createdAt: Date.now(), deadline: deadline ? new Date(deadline).getTime() : null
  };
  tasks.unshift(newTask);
  save();
  render();
  document.getElementById('title').value = '';
  document.getElementById('desc').value = '';
  document.getElementById('deadline').value = '';
});

autoAssignBtn.addEventListener('click', () => {
  const counts = {}; demoUsers.forEach(u => counts[u.id] = 0);
  tasks.forEach(t => { if (t.status === 'inprogress') counts[t.assigneeId] = (counts[t.assigneeId]||0)+1; });
  let min = Infinity, chosen = demoUsers[0].id;
  demoUsers.forEach(u => { if (counts[u.id] < min) { min = counts[u.id]; chosen = u.id; } });
  assigneeSelect.value = chosen;
  alert('Auto-asignado a: ' + demoUsers.find(d => d.id===chosen).name);
});

filterStatus.addEventListener('change', render);
searchInput.addEventListener('input', render);
clearBtn.addEventListener('click', () => {
  if (confirm('Eliminar todas las tareas guardadas?')) {
    tasks = [];
    save();
    render();
  }
});

function changeStatus(id, newStatus) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.status = newStatus;
  if (newStatus === 'inprogress') t.startedAt = Date.now();
  if (newStatus === 'done') t.completedAt = Date.now();
  save();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  save();
  render();
}

function checkLateTasks() {
  const now = Date.now();
  let changed = false;
  tasks.forEach(t => {
    if (t.deadline && t.status !== 'done' && now > t.deadline) {
      if (!t.isLate) { t.isLate = true; changed = true; }
    } else if (t.isLate) { t.isLate = false; changed = true; }
  });
  if (changed) { save(); render(); }
}

function render() {
  const total = tasks.length;
  const inprog = tasks.filter(t => t.status === 'inprogress').length;
  const late = tasks.filter(t => t.isLate).length;
  statTotal.textContent = total;
  statInProg.textContent = inprog;
  statLate.textContent = late;

  const f = filterStatus.value;
  const q = searchInput.value.trim().toLowerCase();
  tasksList.innerHTML = '';
  const filtered = tasks.filter(t => {
    if (f !== 'all' && t.status !== f) return false;
    if (q && !(t.title.toLowerCase().includes(q) || (t.desc||'').toLowerCase().includes(q) || (getUserName(t.assigneeId)||'').toLowerCase().includes(q))) return false;
    return true;
  });
  if (filtered.length === 0) {
    tasksList.innerHTML = '<div class="muted">No hay tareas que mostrar.</div>';
    return;
  }

  filtered.forEach(t => {
    const div = document.createElement('div');
    div.className = 'task';
    const left = document.createElement('div');
    left.style.flex = '1';
    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = t.title + (t.isLate ? ' ⚠️' : '');
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.innerHTML = `<strong>${getUserName(t.assigneeId)}</strong> · ${relativeTime(t.createdAt)} ${t.deadline ? ' · Vence: ' + formatDate(t.deadline) : ''}`;
    left.appendChild(title);
    left.appendChild(meta);
    if (t.desc) {
      const desc = document.createElement('div');
      desc.style.marginTop = '8px';
      desc.style.color = '#bfbfbf';
      desc.textContent = t.desc;
      left.appendChild(desc);
    }
    const badge = document.createElement('div');
    badge.className = 'badge status ' + (t.status);
    badge.style.marginTop = '6px';
    badge.textContent = (t.status === 'pending' ? 'Pendiente' : (t.status === 'inprogress' ? 'En progreso' : 'Completada'));
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    if (t.status === 'pending') {
      const startBtn = document.createElement('button');
      startBtn.className = 'btn';
      startBtn.textContent = 'Iniciar';
      startBtn.onclick = () => changeStatus(t.id, 'inprogress');
      actions.appendChild(startBtn);
    } else if (t.status === 'inprogress') {
      const doneBtn = document.createElement('button');
      doneBtn.className = 'btn';
      doneBtn.textContent = 'Completar';
      doneBtn.onclick = () => changeStatus(t.id, 'done');
      actions.appendChild(doneBtn);
    } else {
      const reopen = document.createElement('button');
      reopen.className = 'btn ghost';
      reopen.textContent = 'Reabrir';
      reopen.onclick = () => changeStatus(t.id, 'pending');
      actions.appendChild(reopen);
    }

    const del = document.createElement('button');
    del.className = 'btn ghost';
    del.textContent = 'Eliminar';
    del.onclick = () => { if (confirm('Eliminar tarea?')) deleteTask(t.id); };
    actions.appendChild(del);

    div.appendChild(left);
    div.appendChild(badge);
    div.appendChild(actions);
    tasksList.appendChild(div);
  });
}

function getUserName(id) {
  const u = demoUsers.find(x => x.id === id);
  return u ? u.name : 'Sin asignar';
}
function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'hace segundos';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

// 🔹 Inicializar la app
init();

// (opcional) Exponer algunas funciones para debug en consola
window.smarttask = { tasks, save, render };
