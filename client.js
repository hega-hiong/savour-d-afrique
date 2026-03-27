// URL de ton backend Render
const API_URL = "https://savour-backend-uhk1.onrender.com";

// Connexion Socket.io vers Render
const socket = io(API_URL);

// 1. NOTRE BASE DE DONNÉES DE PLATS
let menuData = [
    { id: 1, nom: "Poulet Yassa", prix: 14.50, categorie: "Plats", image: "images/yassa.png", accompagnements: ["Riz Blanc", "Frites"] },
    { id: 2, nom: "Mafé Boeuf", prix: 15.00, categorie: "Plats", image: "images/mafe.JPG", accompagnements: ["Riz Blanc", "Riz Rouge", "Alloco"] },
    { id: 3, nom: "Jus de Bissap", prix: 4.00, categorie: "Boissons", image: "images/bissap.JPG" },
    { id: 4, nom: "Thiébou Djeun", prix: 16.00, categorie: "Plats", image: "images/yassa.png", accompagnements: ["Riz Blanc"] },
    { id: 5, nom: "Jus de Gingembre", prix: 3.50, categorie: "Boissons", image: "images/bissap.JPG" },
    { id: 6, nom: "Tiramisu Africain", prix: 6.00, categorie: "Desserts", image: "images/yassa.png" }
];

let tableNum = "Inconnue";
let panier = [];

// Initialisation Socket.io
socket.on('connect', () => {
    console.log('Client connecté au backend Render');
});

socket.on('disconnect', () => {
    console.log('Client déconnecté du backend');
});

// Synchronisation temps réel du menu
socket.on('menu-updated', (updatedMenu) => {
    console.log('Menu mis à jour en temps réel:', updatedMenu);
    menuData = updatedMenu;
    genererMenu();
    showNotification('Le menu a été mis à jour !', 'info');
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Charger le menu depuis l'API
async function loadMenuFromAPI() {
    try {
        const response = await fetch(`${API_URL}/api/menu`);
        if (response.ok) {
            menuData = await response.json();
            console.log('Menu chargé depuis API:', menuData);
        } else {
            console.warn('Impossible de charger le menu depuis l\'API, utilisation des données locales');
        }
    } catch (error) {
        console.error('Erreur chargement menu API:', error);
        console.warn('Utilisation des données locales');
    }
}

function updatePanierUI() {
    const total = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);
    const count = panier.reduce((acc, item) => acc + item.quantite, 0);
    const cartText = document.getElementById('cart-text');
    if (cartText) cartText.innerText = `${count} article${count > 1 ? 's' : ''} - ${total.toFixed(2)} €`;
    document.getElementById('table-display').innerText = `Table ${tableNum}`;

    const cartBar = document.getElementById('cart-bar');
    if (cartBar) {
        if (count > 0) cartBar.classList.add('active'); else cartBar.classList.remove('active');
    }

    const details = panier.map(item => `${item.quantite}x ${item.nom}`).join('\n');
    const modalDetails = document.getElementById('modal-details');
    if (modalDetails) modalDetails.innerText = `Table ${tableNum} • Total: ${total.toFixed(2)} €\n${details}`;
}

function ajouterAuPanier(plat) {
    const existant = panier.find(item => item.id === plat.id);
    if (existant) {
        existant.quantite += 1;
    } else {
        panier.push({ id: plat.id, nom: plat.nom, prix: plat.prix, quantite: 1 });
    }
    updatePanierUI();
}

async function envoyerCommande() {
    if (panier.length === 0) {
        alert('Panier vide. Ajoutez un plat avant de commander.');
        return;
    }

    const details = panier.map(item => `${item.quantite}x ${item.nom}`);
    const subtotal = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

    const payload = {
        table: tableNum,
        items: details,
        subtotal,
        status: 'Nouveau',
        timestamp: Date.now()
    };

    try {
        const res = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);

        alert('Commande envoyée en cuisine !');
        panier = [];
        updatePanierUI();
        document.getElementById('modal-overlay').style.display = 'none';
    } catch (error) {
        console.error(error);
        alert('Échec de l\'envoi, réessayez.');
    }
}

function genererMenu() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) {
        console.error('menu-container not found');
        return;
    }
    menuContainer.innerHTML = '';
    menuData.forEach(plat => {
        const card = document.createElement('div');
        card.className = 'menu-item';
        card.innerHTML = `
            <img src="${plat.image}" alt="${plat.nom}" class="item-img" onerror="this.style.display='none'">
            <div class="item-info">
                <h3>${plat.nom}</h3>
                <div class="item-price">${plat.prix.toFixed(2)} €</div>
            </div>
            <button class="btn-add">+</button>
        `;
        card.querySelector('.btn-add').addEventListener('click', () => ajouterAuPanier(plat));
        menuContainer.appendChild(card);
    });
}

function setupFiltres() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const cat = e.target.getAttribute('data-cat');
            document.querySelectorAll('.menu-item').forEach(item => {
                const nom = item.querySelector('.item-info h3').innerText;
                const plat = menuData.find(p => p.nom === nom);
                if (!plat) return;
                item.style.display = (cat === 'tous' || plat.categorie === cat) ? 'flex' : 'none';
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    tableNum = params.get('table') || 'Inconnue';
    updatePanierUI();

    await loadMenuFromAPI();
    genererMenu();
    setupFiltres();

    document.getElementById('btn-checkout').addEventListener('click', () => {
        if (panier.length === 0) {
            alert('Panier vide. Ajoutez un plat avant de commander.');
            return;
        }
        document.getElementById('modal-overlay').style.display = 'flex';
    });
    document.getElementById('btn-cancel').addEventListener('click', () => document.getElementById('modal-overlay').style.display = 'none');
    document.getElementById('btn-confirm').addEventListener('click', envoyerCommande);
});




/*// Interface Client - Savour d'Afrique
const socket = io();

// 1. NOTRE BASE DE DONNÉES DE PLATS
let menuData = [
    { id: 1, nom: "Poulet Yassa", prix: 14.50, categorie: "Plats", image: "images/yassa.png", accompagnements: ["Riz Blanc", "Frites"] },
    { id: 2, nom: "Mafé Boeuf", prix: 15.00, categorie: "Plats", image: "images/mafe.JPG", accompagnements: ["Riz Blanc", "Riz Rouge", "Alloco"] },
    { id: 3, nom: "Jus de Bissap", prix: 4.00, categorie: "Boissons", image: "images/bissap.JPG" },
    { id: 4, nom: "Thiébou Djeun", prix: 16.00, categorie: "Plats", image: "images/yassa.png", accompagnements: ["Riz Blanc"] },
    { id: 5, nom: "Jus de Gingembre", prix: 3.50, categorie: "Boissons", image: "images/bissap.JPG" },
    { id: 6, nom: "Tiramisu Africain", prix: 6.00, categorie: "Desserts", image: "images/yassa.png" }
];

let tableNum = "Inconnue";
let panier = [];

// Initialisation Socket.io
socket.on('connect', () => {
    console.log('Client connecté au serveur');
});

socket.on('disconnect', () => {
    console.log('Client déconnecté du serveur');
});

// Synchronisation temps réel du menu
socket.on('menu-updated', (updatedMenu) => {
    console.log('Menu mis à jour en temps réel:', updatedMenu);
    menuData = updatedMenu;
    genererMenu(); // Régénérer l'affichage du menu
    showNotification('Le menu a été mis à jour !', 'info');
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Charger le menu depuis l'API
async function loadMenuFromAPI() {
    try {
        const response = await fetch('/api/menu');
        if (response.ok) {
            menuData = await response.json();
            console.log('Menu chargé depuis API:', menuData);
        } else {
            console.warn('Impossible de charger le menu depuis l\'API, utilisation des données locales');
        }
    } catch (error) {
        console.error('Erreur chargement menu API:', error);
        console.warn('Utilisation des données locales');
    }
}

function updatePanierUI() {
    const total = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);
    const count = panier.reduce((acc, item) => acc + item.quantite, 0);
    const cartText = document.getElementById('cart-text');
    if (cartText) cartText.innerText = `${count} article${count > 1 ? 's' : ''} - ${total.toFixed(2)} €`;
    document.getElementById('table-display').innerText = `Table ${tableNum}`;

    const cartBar = document.getElementById('cart-bar');
    if (cartBar) {
        if (count > 0) cartBar.classList.add('active'); else cartBar.classList.remove('active');
    }

    const details = panier.map(item => `${item.quantite}x ${item.nom}`).join('\n');
    const modalDetails = document.getElementById('modal-details');
    if (modalDetails) modalDetails.innerText = `Table ${tableNum} • Total: ${total.toFixed(2)} €\n${details}`;
}

function ajouterAuPanier(plat) {
    const existant = panier.find(item => item.id === plat.id);
    if (existant) {
        existant.quantite += 1;
    } else {
        panier.push({ id: plat.id, nom: plat.nom, prix: plat.prix, quantite: 1 });
    }
    updatePanierUI();
}

async function envoyerCommande() {
    if (panier.length === 0) {
        alert('Panier vide. Ajoutez un plat avant de commander.');
        return;
    }

    const details = panier.map(item => `${item.quantite}x ${item.nom}`);
    const subtotal = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

    const payload = {
        table: tableNum,
        items: details,
        subtotal,
        status: 'Nouveau',
        timestamp: Date.now()
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);

        alert('Commande envoyée en cuisine !');
        panier = [];
        updatePanierUI();
        document.getElementById('modal-overlay').style.display = 'none';
    } catch (error) {
        console.error(error);
        alert('Échec de l\'envoi, réessayez.');
    }
}

function genererMenu() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) {
        console.error('menu-container not found');
        return;
    }
    menuContainer.innerHTML = '';
    menuData.forEach(plat => {
        const card = document.createElement('div');
        card.className = 'menu-item';
        card.innerHTML = `
            <img src="${plat.image}" alt="${plat.nom}" class="item-img" onerror="this.style.display='none'">
            <div class="item-info">
                <h3>${plat.nom}</h3>
                <div class="item-price">${plat.prix.toFixed(2)} €</div>
            </div>
            <button class="btn-add">+</button>
        `;
        card.querySelector('.btn-add').addEventListener('click', () => ajouterAuPanier(plat));
        menuContainer.appendChild(card);
    });
}

function setupFiltres() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const cat = e.target.getAttribute('data-cat');
            document.querySelectorAll('.menu-item').forEach(item => {
                const nom = item.querySelector('.item-info h3').innerText;
                const plat = menuData.find(p => p.nom === nom);
                if (!plat) return;
                item.style.display = (cat === 'tous' || plat.categorie === cat) ? 'flex' : 'none';
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    tableNum = params.get('table') || 'Inconnue';
    updatePanierUI();

    // Charger le menu depuis l'API avant d'afficher
    await loadMenuFromAPI();
    genererMenu();
    setupFiltres();

    document.getElementById('btn-checkout').addEventListener('click', () => {
        if (panier.length === 0) {
            alert('Panier vide. Ajoutez un plat avant de commander.');
            return;
        }
        document.getElementById('modal-overlay').style.display = 'flex';
    });
    document.getElementById('btn-cancel').addEventListener('click', () => document.getElementById('modal-overlay').style.display = 'none');
    document.getElementById('btn-confirm').addEventListener('click', envoyerCommande);
});*/












































/*// Importation des modules Firebase (via CDN pour faire simple)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket: "XXX",
  messagingSenderId: "XXX",
  appId: "XXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);*/

/*// MODIFICATION DE LA FONCTION DE CONFIRMATION
document.getElementById('btn-confirm').onclick = async () => {
    const params = new URLSearchParams(window.location.search);
    const tableNum = params.get('table');

    if (panier.length === 0) return alert("Panier vide !");

    try {
        // ENVOI À FIREBASE
        await addDoc(collection(db, "commandes"), {
            table: tableNum || "Inconnue",
            articles: panier, // Tes objets {nomComplet, quantite, prix}
            total: totalPrice,
            statut: "nouveau",
            createdAt: serverTimestamp()
        });

        alert("Commande envoyée !");
        panier = [];
        updatePanierUI();
        document.getElementById('modal-overlay').style.display = 'none';
    } catch (e) {
        console.error("Erreur d'envoi : ", e);
    }
};*/
/*// On s'assure que tout le HTML est chargé avant d'exécuter le script
document.addEventListener('DOMContentLoaded', () => {
    
    let itemCount = 0;
    let totalPrice = 0;

    // Récupération des éléments du DOM
    const cartBar = document.getElementById('cart-bar');
    const cartText = document.getElementById('cart-text');
    const addButtons = document.querySelectorAll('.btn-add');
    const checkoutBtn = document.getElementById('btn-checkout');

    // On ajoute un événement "click" sur chaque bouton "+"
    addButtons.forEach(button => {
        button.addEventListener('click', function() {
            // On récupère le prix depuis l'attribut data-price
            const price = parseFloat(this.getAttribute('data-price'));
            
            itemCount++;
            totalPrice += price;
            
            // Mise à jour du texte avec formatage à 2 décimales
            cartText.innerText = `${itemCount} article${itemCount > 1 ? 's' : ''} - ${totalPrice.toFixed(2)} €`;
            
            // On fait apparaître le panier
            if (itemCount > 0) {
                cartBar.classList.add('active');
            }
        });
    });

     Écouteur pour le bouton "Commander" (pour la future Pop-up)
    checkoutBtn.addEventListener('click', () => {
        console.log("Clic sur commander ! Lancement de la Pop-up...");
         C'est ici qu'on appellera la fonction pour ouvrir la modale
    });

});*/





