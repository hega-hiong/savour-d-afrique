const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const init = { menu: [], orders: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
      return init;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('readDB error', err);
    return { menu: [], orders: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/menu', (req, res) => {
  const db = readDB();
  res.json(db.menu || []);
});

app.post('/api/menu', (req, res) => {
  const db = readDB();
  const item = { ...req.body, id: nanoid() };
  db.menu = db.menu || [];
  db.menu.push(item);
  writeDB(db);
  io.emit('menu-updated', db.menu);
  res.status(201).json(item);
});

app.put('/api/menu/:id', (req, res) => {
  const db = readDB();
  const idx = (db.menu || []).findIndex(i => i.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  db.menu[idx] = { ...db.menu[idx], ...req.body, id: req.params.id };
  writeDB(db);
  io.emit('menu-updated', db.menu);
  res.json(db.menu[idx]);
});

app.delete('/api/menu/:id', (req, res) => {
  const db = readDB();
  db.menu = (db.menu || []).filter(i => i.id !== req.params.id);
  writeDB(db);
  io.emit('menu-updated', db.menu);
  res.sendStatus(204);
});

app.get('/api/orders', (req, res) => {
  const db = readDB();
  res.json(db.orders || []);
});

app.post('/api/orders', (req, res) => {
  const db = readDB();
  const order = { ...req.body, id: nanoid(), status: 'Nouveau', timestamp: Date.now() };
  db.orders = db.orders || [];
  db.orders.unshift(order);
  writeDB(db);
  io.emit('order-updated', order);
  res.status(201).json(order);
});

app.put('/api/orders/:id', (req, res) => {
  const db = readDB();
  const idx = (db.orders || []).findIndex(o => o.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  db.orders[idx] = { ...db.orders[idx], ...req.body, id: req.params.id };
  writeDB(db);
  io.emit('order-updated', db.orders[idx]);
  res.json(db.orders[idx]);
});

app.delete('/api/orders/:id', (req, res) => {
  const db = readDB();
  db.orders = (db.orders || []).filter(o => o.id !== req.params.id);
  writeDB(db);
  io.emit('order-removed', req.params.id);
  res.sendStatus(204);
});

app.get('/api/report', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const menu = db.menu || [];

  const totalRevenue = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, o) => sum + ((o.items && o.items.length) || 0), 0);

  const popularItems = menu
    .map(item => {
      const sold = orders.reduce((count, order) => {
        return count + (order.items || []).filter(i => i.includes(item.nom)).length;
      }, 0);
      return { nom: item.nom, count: sold, revenue: sold * item.prix };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({ totalRevenue, totalOrders, totalItems, popularItems });
});

app.get('/api/qrcode/:table', async (req, res) => {
  const table = req.params.table;
  const url = `${req.protocol}://${req.get('host')}/index.html?table=${table}`;
  try {
    const buffer = await QRCode.toBuffer(url, { type: 'png', margin: 2, width: 280 });
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

io.on('connection', socket => { console.log('client connected'); });

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
console.log(`Starting server on port ${PORT}...`);
server.listen(PORT, () => console.log(`API ready on ${PORT}`));
/*server.listen(PORT, () => console.log(`API ready on https://savour-backend-uhk1.onrender.com`));*/
console.log('Server setup complete');




/*server.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));*/