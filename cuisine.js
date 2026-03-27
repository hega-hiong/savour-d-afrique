// URL de ton backend Render
const API_URL = "https://savour-backend-uhk1.onrender.com";

// Connexion Socket.io vers Render
const socket = io(API_URL);

let orders = [];

// -----------------------------
// Récupérer les commandes
// -----------------------------
async function fetchOrders() {
  try {
    const resp = await fetch(`${API_URL}/api/orders`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    orders = await resp.json();
    renderOrders();
  } catch (err) {
    console.error('fetchOrders', err);
  }
}

// -----------------------------
// Affichage des commandes
// -----------------------------
function renderOrders() {
  const container = document.getElementById('orders-container');
  if (!container) return;
  container.innerHTML = '';

  orders
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach(order => {
      const now = Date.now();
      const diffMinutes = Math.floor((now - order.timestamp) / 60000);
      const isUrgent = diffMinutes >= 10 ? 'urgent' : '';

      const card = document.createElement('div');
      card.className = `order-card ${isUrgent}`;
      card.innerHTML = `
        <div class="order-header">
          <h2>Table ${order.table}</h2>
          <span class="status">${order.status || 'Nouveau'}</span>
          <span class="timer">${diffMinutes} min</span>
        </div>
        <ul class="order-items">
          ${(order.items || []).map(i => `<li>${i}</li>`).join('')}
        </ul>
        <div class="order-meta">Total: ${order.subtotal ? order.subtotal.toFixed(2) + ' €' : '-'}</div>
        <div class="order-actions">
          <button class="btn-action" onclick="updateOrderStatus('${order.id}','En préparation')">En préparation</button>
          <button class="btn-action" onclick="updateOrderStatus('${order.id}','Terminé')">Terminé</button>
        </div>
      `;
      container.appendChild(card);
    });
}

// -----------------------------
// Mise à jour du statut
// -----------------------------
async function updateOrderStatus(orderId, status) {
  try {
    const resp = await fetch(`${API_URL}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const updated = await resp.json();

    const idx = orders.findIndex(o => o.id === updated.id);
    if (idx >= 0) orders[idx] = updated;
    else orders.unshift(updated);

    renderOrders();
  } catch (err) {
    console.error('updateOrderStatus', err);
  }
}

// -----------------------------
// Socket.io events
// -----------------------------
socket.on('connect', () => {
  console.log('Cuisine connectée au backend Render');
});

socket.on('order-updated', (order) => {
  const existing = orders.find(o => o.id === order.id);
  if (existing) {
    Object.assign(existing, order);
  } else {
    orders.unshift(order);
    const audio = document.getElementById('notif-sound');
    if (audio) audio.play().catch(() => {});
  }
  renderOrders();
});

socket.on('order-removed', (id) => {
  orders = orders.filter(o => o.id !== id);
  renderOrders();
});

// -----------------------------
// Initialisation
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
  fetchOrders();
  setInterval(fetchOrders, 60000);
});





/*const socket = io();
let orders = [];

async function fetchOrders() {
  try {
    const resp = await fetch('/api/orders');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    orders = await resp.json();
    renderOrders();
  } catch (err) {
    console.error('fetchOrders', err);
  }
}

function renderOrders() {
  const container = document.getElementById('orders-container');
  if (!container) return;
  container.innerHTML = '';

  orders
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach(order => {
      const now = Date.now();
      const diffMinutes = Math.floor((now - order.timestamp) / 60000);
      const isUrgent = diffMinutes >= 10 ? 'urgent' : '';

      const card = document.createElement('div');
      card.className = `order-card ${isUrgent}`;
      card.innerHTML = `
        <div class="order-header">
          <h2>Table ${order.table}</h2>
          <span class="status">${order.status || 'Nouveau'}</span>
          <span class="timer">${diffMinutes} min</span>
        </div>
        <ul class="order-items">
          ${(order.items || []).map(i => `<li>${i}</li>`).join('')}
        </ul>
        <div class="order-meta">Total: ${order.subtotal ? order.subtotal.toFixed(2) + ' €' : '-'} </div>
        <div class="order-actions">
          <button class="btn-action" onclick="updateOrderStatus('${order.id}','En préparation')">En préparation</button>
          <button class="btn-action" onclick="updateOrderStatus('${order.id}','Terminé')">Terminé</button>
        </div>
      `;
      container.appendChild(card);
    });
}

async function updateOrderStatus(orderId, status) {
  try {
    const resp = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const updated = await resp.json();

    const idx = orders.findIndex(o => o.id === updated.id);
    if (idx >= 0) orders[idx] = updated;
    else orders.unshift(updated);

    renderOrders();
  } catch (err) {
    console.error('updateOrderStatus', err);
  }
}

socket.on('connect', () => {
  console.log('Cuisine connecté à socket');
});

socket.on('order-updated', (order) => {
  const existing = orders.find(o => o.id === order.id);
  if (existing) {
    Object.assign(existing, order);
  } else {
    orders.unshift(order);
    const audio = document.getElementById('notif-sound');
    if (audio) audio.play().catch(() => {});
  }
  renderOrders();
});

socket.on('order-removed', (id) => {
  orders = orders.filter(o => o.id !== id);
  renderOrders();
});

document.addEventListener('DOMContentLoaded', () => {
  fetchOrders();
  setInterval(fetchOrders, 60000);
});*/



