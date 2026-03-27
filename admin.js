// URL backend Render
const API_URL = "https://savour-backend-uhk1.onrender.com";

// Connexion Socket.io vers Render
const socket = io(API_URL);

let menuData = [];
let ordersData = [];
let currentEditingId = null;

// États de l'interface
let currentSection = 'stocks';
let isLoading = false;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupSocketListeners();
});

function initializeApp() {
    // Simuler connexion admin
    document.getElementById('btn-login').addEventListener('click', () => {
        document.getElementById('login-overlay').style.display = 'none';
        loadDashboard();
    });

    // Charger les données initiales
    loadMenu();
    loadOrders();
    loadStats();
}
/*// Interface Admin SaaS - Savour d'Afrique
const socket = io(API_URL);
let menuData = [];
let ordersData = [];
let currentEditingId = null;

// États de l'interface
let currentSection = 'stocks';
let isLoading = false;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupSocketListeners();
});

function initializeApp() {
    // Simuler connexion admin (pas de vraie authentification pour l'instant)
    document.getElementById('btn-login').addEventListener('click', () => {
        document.getElementById('login-overlay').style.display = 'none';
        loadDashboard();
    });

    // Charger les données initiales
    loadMenu();
    loadOrders();
    loadStats();
}*/

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.sidebar nav button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(section);
        });
    });

    // Formulaire menu
    document.getElementById('add-menu-item').addEventListener('click', handleMenuSubmit);
    document.getElementById('clear-menu-form').addEventListener('click', clearMenuForm);

    // Boutons ventes
    document.getElementById('refresh-sales').addEventListener('click', loadStats);
    document.getElementById('export-report').addEventListener('click', exportReport);
}

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Admin connecté au serveur');
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        console.log('Admin déconnecté');
        updateConnectionStatus(false);
    });

    socket.on('menu-updated', (data) => {
        console.log('Menu mis à jour:', data);
        menuData = data;
        renderMenuTable();
        // Notifier le client du changement
        socket.emit('menu-changed', menuData);
    });

    socket.on('order-updated', (data) => {
        console.log('Commande mise à jour:', data);
        loadOrders();
        loadStats();
    });

    socket.on('order-removed', (id) => {
        console.log('Commande supprimée:', id);
        loadOrders();
        loadStats();
    });
}

function updateConnectionStatus(connected) {
    const status = document.querySelector('.connection-status') || createConnectionStatus();
    status.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    status.textContent = connected ? '🟢 Connecté' : '🔴 Déconnecté';
}

function createConnectionStatus() {
    const status = document.createElement('div');
    status.className = 'connection-status';
    document.querySelector('.sidebar').appendChild(status);
    return status;
}

function showSection(sectionId) {
    currentSection = sectionId;
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';

    // Mettre à jour la navigation active
    document.querySelectorAll('.sidebar nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick*="showSection('${sectionId}')"]`).classList.add('active');

    // Charger les données de la section
    switch(sectionId) {
        case 'stocks':
            loadMenu();
            break;
        case 'ventes':
            loadStats();
            loadOrders();
            break;
        case 'salle':
            loadFloorPlan();
            break;
    }
}

function loadDashboard() {
    showSection('stocks');
}

// GESTION DU MENU
async function loadMenu() {
    try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/menu`);
        menuData = await response.json();
        renderMenuTable();
    } catch (error) {
        console.error('Erreur chargement menu:', error);
        showNotification('Erreur de chargement du menu', 'error');
    } finally {
        setLoading(false);
    }
}
/*async function loadMenu() {
    try {
        setLoading(true);
        const response = await fetch('/api/menu');
        menuData = await response.json();
        renderMenuTable();
    } catch (error) {
        console.error('Erreur chargement menu:', error);
        showNotification('Erreur de chargement du menu', 'error');
    } finally {
        setLoading(false);
    }
}*/

function renderMenuTable() {
    const tbody = document.getElementById('stock-list');
    tbody.innerHTML = menuData.map(item => `
        <tr class="menu-item-row" data-id="${item.id}">
            <td>
                <div class="item-info">
                    <img src="${item.image}" alt="${item.nom}" class="item-thumb" onerror="this.style.display='none'">
                    <div>
                        <strong>${item.nom}</strong>
                        <small>ID: ${item.id}</small>
                    </div>
                </div>
            </td>
            <td>${item.prix.toFixed(2)} €</td>
            <td>
                <span class="category-badge category-${item.categorie.toLowerCase()}">${item.categorie}</span>
            </td>
            <td>
                ${item.accompagnements ? item.accompagnements.join(', ') : 'Aucun'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editMenuItem(${item.id})" title="Modifier">
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="deleteMenuItem(${item.id})" title="Supprimer">
                        🗑️
                    </button>
                    <label class="switch">
                        <input type="checkbox" ${item.dispo !== false ? 'checked' : ''} onchange="toggleAvailability(${item.id})">
                        <span class="slider"></span>
                    </label>
                </div>
            </td>
        </tr>
    `).join('');
}














// -----------------------------
// FORMULAIRE MENU (AJOUT / UPDATE)
// -----------------------------
async function handleMenuSubmit() {
    const formData = {
        nom: document.getElementById('plat-name').value.trim(),
        prix: parseFloat(document.getElementById('plat-price').value),
        categorie: document.getElementById('plat-category').value.trim(),
        image: document.getElementById('plat-image').value.trim(),
        accompagnements: document.getElementById('plat-acc').value.trim()
            ? document.getElementById('plat-acc').value.split(',').map(a => a.trim())
            : null
    };

    if (!formData.nom || !formData.prix || !formData.categorie || !formData.image) {
        showNotification('Tous les champs sont requis', 'error');
        return;
    }

    try {
        setLoading(true);
        let response;

        if (currentEditingId) {
            // Mise à jour
            response = await fetch(`${API_URL}/api/menu/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        } else {
            // Ajout
            response = await fetch(`${API_URL}/api/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        }

        if (response.ok) {
            showNotification(currentEditingId ? 'Plat mis à jour !' : 'Plat ajouté !', 'success');
            clearMenuForm();
            loadMenu();
        } else {
            throw new Error('Erreur API');
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
    } finally {
        setLoading(false);
    }
}

// -----------------------------
// EDIT MENU ITEM
// -----------------------------
function editMenuItem(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;

    currentEditingId = id;
    document.getElementById('plat-name').value = item.nom;
    document.getElementById('plat-price').value = item.prix;
    document.getElementById('plat-category').value = item.categorie;
    document.getElementById('plat-image').value = item.image;
    document.getElementById('plat-acc').value = item.accompagnements ? item.accompagnements.join(', ') : '';

    document.getElementById('add-menu-item').textContent = 'Mettre à jour';
    document.getElementById('menu-form').scrollIntoView({ behavior: 'smooth' });
}

// -----------------------------
// DELETE MENU ITEM
// -----------------------------
async function deleteMenuItem(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return;

    try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/menu/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Plat supprimé !', 'success');
            loadMenu();
        } else {
            throw new Error('Erreur suppression');
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    } finally {
        setLoading(false);
    }
}

// -----------------------------
// TOGGLE DISPONIBILITÉ
// -----------------------------
async function toggleAvailability(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;

    try {
        const response = await fetch(`${API_URL}/api/menu/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, dispo: !item.dispo })
        });

        if (response.ok) {
            item.dispo = !item.dispo;
            showNotification(`Plat ${item.dispo ? 'activé' : 'désactivé'}`, 'info');

            // Notifier les clients
            socket.emit('menu-changed', menuData);
        }
    } catch (error) {
        console.error('Erreur toggle disponibilité:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

// -----------------------------
// STATS
// -----------------------------
async function loadStats() {
    try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/report`);
        const stats = await response.json();

        document.getElementById('total-revenue').textContent = `${stats.totalRevenue.toFixed(2)} €`;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('total-items').textContent = stats.totalItems;

        renderPopularItems(stats.popularItems);
        renderSalesChart(stats);

    } catch (error) {
        console.error('Erreur chargement stats:', error);
        showNotification('Erreur de chargement des statistiques', 'error');
    } finally {
        setLoading(false);
    }
}

// -----------------------------
// COMMANDES
// -----------------------------
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/api/orders`);
        ordersData = await response.json();
        renderOrdersTable();
    } catch (error) {
        console.error('Erreur chargement commandes:', error);
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Supprimer cette commande ?')) return;

    try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Commande supprimée', 'success');
            loadOrders();
            loadStats();
        }
    } catch (error) {
        console.error('Erreur suppression commande:', error);
        showNotification('Erreur suppression', 'error');
    }
}
/*async function handleMenuSubmit() {
    const formData = {
        nom: document.getElementById('plat-name').value.trim(),
        prix: parseFloat(document.getElementById('plat-price').value),
        categorie: document.getElementById('plat-category').value.trim(),
        image: document.getElementById('plat-image').value.trim(),
        accompagnements: document.getElementById('plat-acc').value.trim()
            ? document.getElementById('plat-acc').value.split(',').map(a => a.trim())
            : null
    };

    if (!formData.nom || !formData.prix || !formData.categorie || !formData.image) {
        showNotification('Tous les champs sont requis', 'error');
        return;
    }

    try {
        setLoading(true);
        let response;
        if (currentEditingId) {
            // Mise à jour
            response = await fetch(`/api/menu/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        } else {
            // Ajout
            response = await fetch('/api/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        }

        if (response.ok) {
            const result = await response.json();
            showNotification(currentEditingId ? 'Plat mis à jour !' : 'Plat ajouté !', 'success');
            clearMenuForm();
            loadMenu(); // Recharger pour voir les changements
        } else {
            throw new Error('Erreur API');
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
    } finally {
        setLoading(false);
    }
}

function editMenuItem(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;

    currentEditingId = id;
    document.getElementById('plat-name').value = item.nom;
    document.getElementById('plat-price').value = item.prix;
    document.getElementById('plat-category').value = item.categorie;
    document.getElementById('plat-image').value = item.image;
    document.getElementById('plat-acc').value = item.accompagnements ? item.accompagnements.join(', ') : '';

    document.getElementById('add-menu-item').textContent = 'Mettre à jour';
    document.getElementById('menu-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteMenuItem(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return;

    try {
        setLoading(true);
        const response = await fetch(`/api/menu/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Plat supprimé !', 'success');
            loadMenu();
        } else {
            throw new Error('Erreur suppression');
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    } finally {
        setLoading(false);
    }
}

async function toggleAvailability(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;

    try {
        const response = await fetch(`/api/menu/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, dispo: !item.dispo })
        });

        if (response.ok) {
            item.dispo = !item.dispo;
            showNotification(`Plat ${item.dispo ? 'activé' : 'désactivé'}`, 'info');
            // Notifier les clients en temps réel
            socket.emit('menu-changed', menuData);
        }
    } catch (error) {
        console.error('Erreur toggle disponibilité:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

function clearMenuForm() {
    document.getElementById('plat-name').value = '';
    document.getElementById('plat-price').value = '';
    document.getElementById('plat-category').value = '';
    document.getElementById('plat-image').value = '';
    document.getElementById('plat-acc').value = '';
    currentEditingId = null;
    document.getElementById('add-menu-item').textContent = 'Ajouter / Mettre à jour';
}

// STATISTIQUES ET VENTES
async function loadStats() {
    try {
        setLoading(true);
        const response = await fetch('/api/report');
        const stats = await response.json();

        // Statistiques générales
        document.getElementById('total-revenue').textContent = `${stats.totalRevenue.toFixed(2)} €`;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('total-items').textContent = stats.totalItems;

        // Statistiques des plats populaires
        renderPopularItems(stats.popularItems);

        // Graphique des ventes
        renderSalesChart(stats);

    } catch (error) {
        console.error('Erreur chargement stats:', error);
        showNotification('Erreur de chargement des statistiques', 'error');
    } finally {
        setLoading(false);
    }
}

function renderPopularItems(popularItems) {
    const container = document.getElementById('popular-items') || createPopularItemsContainer();
    container.innerHTML = popularItems.map((item, index) => `
        <div class="popular-item">
            <div class="rank">#${index + 1}</div>
            <div class="item-details">
                <strong>${item.nom}</strong>
                <small>${item.count} commandes • ${item.revenue.toFixed(2)} €</small>
            </div>
            <div class="popularity-bar">
                <div class="bar" style="width: ${(item.count / popularItems[0].count) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

function createPopularItemsContainer() {
    const section = document.getElementById('ventes');
    const container = document.createElement('div');
    container.id = 'popular-items';
    container.className = 'popular-items-section';
    container.innerHTML = '<h3>🏆 Plats les plus populaires</h3>';
    section.insertBefore(container, section.querySelector('.sales-section'));
    return container;
}

function renderSalesChart(stats) {
    const chartContainer = document.getElementById('sales-chart');
    // Version simple d'un graphique en texte
    chartContainer.innerHTML = `
        <div class="chart-placeholder">
            <h4>📊 Évolution des ventes (24h)</h4>
            <div class="chart-bars">
                ${Array.from({length: 24}, (_, i) => `
                    <div class="chart-bar">
                        <div class="bar-fill" style="height: ${Math.random() * 100}%"></div>
                        <small>${i}h</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        ordersData = await response.json();
        renderOrdersTable();
    } catch (error) {
        console.error('Erreur chargement commandes:', error);
    }
}

function renderOrdersTable() {
    const tbody = document.getElementById('sales-list');
    tbody.innerHTML = ordersData.map(order => `
        <tr>
            <td>Table ${order.table}</td>
            <td>${order.subtotal.toFixed(2)} €</td>
            <td>
                <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
            </td>
            <td>${new Date(order.timestamp).toLocaleString('fr-FR')}</td>
            <td>
                <button class="btn-view" onclick="viewOrderDetails(${order.id})">👁️</button>
                <button class="btn-delete" onclick="deleteOrder(${order.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    const details = order.items.map(item => `${item}`).join('\n');
    alert(`Commande Table ${order.table}\n\n${details}\n\nTotal: ${order.subtotal.toFixed(2)} €\nStatut: ${order.status}`);
}

async function deleteOrder(orderId) {
    if (!confirm('Supprimer cette commande ?')) return;

    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Commande supprimée', 'success');
            loadOrders();
            loadStats();
        }
    } catch (error) {
        console.error('Erreur suppression commande:', error);
        showNotification('Erreur suppression', 'error');
    }
}

function exportReport() {
    // Export CSV simple
    const csv = [
        ['Table', 'Montant', 'Statut', 'Date'],
        ...ordersData.map(o => [o.table, o.subtotal, o.status, new Date(o.timestamp).toLocaleString('fr-FR')])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-ventes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Rapport exporté !', 'success');
}*/






// PLAN DE SALLE
function loadFloorPlan() {
    const plan = document.getElementById('floor-plan');
    plan.innerHTML = '';

    // Créer un plan de salle avec 12 tables
    for(let i = 1; i <= 12; i++) {
        const table = document.createElement('div');
        table.className = 'table-unit';
        table.innerHTML = `
            <div class="table-number">Table ${i}</div>
            <div class="table-status">Libre</div>
        `;

        // Simuler quelques tables occupées
        if ([2, 5, 8, 11].includes(i)) {
            table.classList.add('occupied');
            table.querySelector('.table-status').textContent = 'Occupée';
        }

        table.addEventListener('click', () => showTableDetails(i));
        plan.appendChild(table);
    }
}

function showTableDetails(tableNumber) {
    const occupied = [2, 5, 8, 11].includes(tableNumber);
    const status = occupied ? 'Occupée' : 'Libre';
    const order = occupied ? ordersData.find(o => o.table == tableNumber) : null;

    let message = `Table ${tableNumber} - ${status}`;
    if (order) {
        message += `\n\nCommande en cours:\n${order.items.join('\n')}\nTotal: ${order.subtotal.toFixed(2)} €`;
    }

    alert(message);
}

// UTILITAIRES
function setLoading(loading) {
    isLoading = loading;
    const loader = document.querySelector('.loading-overlay') || createLoader();
    loader.style.display = loading ? 'flex' : 'none';
}

function createLoader() {
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = '<div class="loader">Chargement...</div>';
    document.body.appendChild(loader);
    return loader;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Styles CSS dynamiques pour les notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }
    .notification-success { background: #10b981; }
    .notification-error { background: #ef4444; }
    .notification-info { background: #3b82f6; }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .connection-status {
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        margin-top: 20px;
    }
    .connection-status.connected {
        background: #dcfce7;
        color: #166534;
    }
    .connection-status.disconnected {
        background: #fef2f2;
        color: #991b1b;
    }
`;
document.head.appendChild(style);
