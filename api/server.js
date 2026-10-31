require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.FRONTEND_ORIGINS ||
  'http://127.0.0.1:5500,http://localhost:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const productCatalog = new Map([
  ['vuejs', { name: 'VueJS', price: 25 }],
  ['angularjs', { name: 'AngularJS', price: 25 }],
  ['reactjs', { name: 'ReactJS', price: 25 }],
  ['redux', { name: 'Redux', price: 25 }],
  ['node.js', { name: 'Node.js', price: 25 }],
  ['sass', { name: 'SASS', price: 25 }],
  ['html5', { name: 'HTML5', price: 25 }],
  ['github', { name: 'Github', price: 25 }],
  ['bulmacss', { name: 'BulmaCSS', price: 25 }],
  ['typescript', { name: 'TypeScript', price: 25 }],
  ['drupal', { name: 'Drupal', price: 25 }],
  ['javascript', { name: 'JavaScript', price: 25 }],
  ['graphql', { name: 'GraphQL', price: 25 }],
  ['wordpress', { name: 'WordPress', price: 25 }]
]);
const validSizes = new Set(['Chica', 'Mediana', 'Grande']);

if (!process.env.DATABASE_URL) {
  throw new Error('Falta configurar DATABASE_URL en api/.env.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origen no permitido por CORS.'));
  }
}));
app.use(express.json({ limit: '20kb' }));

function validateCheckout(body) {
  const requiredTextFields = [
    ['nombre', 120],
    ['email', 254],
    ['telefono', 20],
    ['direccion', 250]
  ];

  for (const [field, maxLength] of requiredTextFields) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > maxLength) {
      return `El campo ${field} es obligatorio y no debe exceder ${maxLength} caracteres.`;
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return 'El correo electrónico no es válido.';
  }

  if (body.telefono.trim().length < 7) {
    return 'El teléfono debe tener al menos 7 caracteres.';
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
    return 'El pedido debe incluir entre 1 y 100 productos.';
  }

  for (const item of body.items) {
    if (!item || typeof item.productName !== 'string' || typeof item.size !== 'string') {
      return 'Cada producto debe incluir nombre y talla.';
    }

    if (!productCatalog.has(item.productName.trim().toLowerCase())) {
      return `El producto "${item.productName}" no existe.`;
    }

    if (!validSizes.has(item.size)) {
      return `La talla de "${item.productName}" no es válida.`;
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      return `La cantidad de "${item.productName}" debe ser un entero entre 1 y 1000.`;
    }
  }

  return null;
}

app.get('/api/health', async (request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/checkout', async (request, response, next) => {
  const validationError = validateCheckout(request.body || {});
  if (validationError) {
    response.status(400).json({ message: validationError });
    return;
  }

  const items = request.body.items.map((item) => {
    const product = productCatalog.get(item.productName.trim().toLowerCase());
    const subtotal = product.price * item.quantity;
    return {
      productName: product.name,
      size: item.size,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal
    };
  });
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    const orderResult = await client.query(
      `INSERT INTO orders
        (customer_name, customer_email, customer_phone, customer_address, total)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at, total`,
      [
        request.body.nombre.trim(),
        request.body.email.trim(),
        request.body.telefono.trim(),
        request.body.direccion.trim(),
        total
      ]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items
          (order_id, product_name, size, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.productName, item.size, item.quantity, item.unitPrice, item.subtotal]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;
    response.status(201).json({
      message: 'Pedido realizado correctamente.',
      orderId: order.id,
      createdAt: order.created_at,
      total: order.total
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('No se pudo revertir la transacción del pedido.', rollbackError);
      }
    }
    next(error);
  } finally {
    if (client) client.release();
  }
});

app.use((request, response) => {
  response.status(404).json({ message: 'Ruta no encontrada.' });
});

app.use((error, request, response, next) => {
  console.error(error);
  if (response.headersSent) {
    next(error);
    return;
  }

  response.status(500).json({
    message: 'Error del servidor. No se pudo guardar el pedido.'
  });
});

const server = app.listen(port, () => {
  console.log(`API lista en http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
