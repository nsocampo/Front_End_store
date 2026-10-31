const CART_KEY = 'frontendStoreCart';
const API_BASE_URL = String(window.FRONTEND_STORE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

const cartToggle = document.getElementById('cartToggle');
const cartPanel = document.getElementById('cartPanel');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const emptyCartBtn = document.getElementById('emptyCartBtn');
const checkoutForm = document.getElementById('checkoutForm');

const syncCartVisibility = () => {
  const isOpen = Boolean(cartPanel && cartPanel.classList.contains('open'));
  document.body.classList.toggle('cart-open', isOpen);
};

const formatPrice = (value) => currencyFormatter.format(Number(value || 0));

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartBadge() {
  if (!cartCount) return;
  const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  cartCount.textContent = totalItems;
}

function renderCart() {
  if (!cartItems || !cartTotal) return;

  updateCartBadge();

  if (cart.length === 0) {
    cartItems.innerHTML = '<p>Tu carrito está vacío.</p>';
    cartTotal.textContent = formatPrice(0);
    saveCart();
    return;
  }

  let total = 0;

  cartItems.innerHTML = cart.map((item) => {
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    total += subtotal;

    return `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <p>${formatPrice(item.price)} c/u</p>
        </div>
        <div class="cart-item-actions">
          <button type="button" data-action="decrease" data-id="${item.id}" aria-label="Disminuir cantidad">-</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="increase" data-id="${item.id}" aria-label="Aumentar cantidad">+</button>
          <button type="button" class="remove-btn" data-action="remove" data-id="${item.id}" aria-label="Eliminar producto">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');

  cartTotal.textContent = formatPrice(total);
  saveCart();
}

function addToCart(product) {
  const itemId = String(product.id);
  const existingItem = cart.find((item) => String(item.id) === itemId);

  if (existingItem) {
    existingItem.quantity += Number(product.quantity || 1);
  } else {
    cart.push({
      id: itemId,
      name: product.name,
      productName: product.productName || product.name,
      size: product.size || '',
      price: Number(product.price),
      quantity: Number(product.quantity || 1)
    });
  }

  renderCart();
  cartPanel?.classList.add('open');
}

function changeQuantity(id, delta) {
  cart = cart
    .map((item) => {
      if (String(item.id) === String(id)) {
        return { ...item, quantity: Number(item.quantity || 1) + delta };
      }
      return item;
    })
    .filter((item) => Number(item.quantity) > 0);

  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => String(item.id) !== String(id));
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function createProductButtons() {
  document.querySelectorAll('.producto').forEach((productCard) => {
    const nameElement = productCard.querySelector('.producto__nombre');
    const priceElement = productCard.querySelector('.producto__precio');

    if (!nameElement || !priceElement) return;

    const exists = productCard.querySelector('.producto__agregar');
    if (exists) return;

    const name = nameElement.textContent.trim();
    const price = Number(priceElement.textContent.replace(/[^\d.]/g, '')) || 0;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'producto__agregar';
    button.textContent = 'Agregar al carrito';
    button.dataset.id = name.toLowerCase().replace(/\s+/g, '-');
    button.dataset.name = name;
    button.dataset.price = price;

    productCard.appendChild(button);
  });
}

function initProductPage() {
  const productForm = document.getElementById('productForm');
  if (!productForm) return;

  productForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const size = document.getElementById('productSize')?.value || 'General';
    const quantity = Number(document.getElementById('productQuantity')?.value || 1);
    const name = productForm.dataset.productName || 'Producto';
    const price = Number(productForm.dataset.productPrice || 0);

    addToCart({
      id: `${name}-${size}`,
      name: `${name} (${size})`,
      productName: name,
      size,
      price,
      quantity
    });
  });
}

async function submitCheckout(event) {
  event.preventDefault();

  if (cart.length === 0) {
    alert('Tu carrito está vacío.');
    return;
  }

  if (!checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
    return;
  }

  const payload = {
    nombre: document.getElementById('customerName')?.value.trim() || '',
    email: document.getElementById('customerEmail')?.value.trim() || '',
    telefono: document.getElementById('customerPhone')?.value.trim() || '',
    direccion: document.getElementById('customerAddress')?.value.trim() || '',
    items: cart.map((item) => {
      const legacyMatch = String(item.name).match(/^(.*) \((Chica|Mediana|Grande)\)$/);
      return {
        productName: item.productName || (legacyMatch ? legacyMatch[1] : ''),
        size: item.size || (legacyMatch ? legacyMatch[2] : ''),
        quantity: Number(item.quantity)
      };
    })
  };

  if (!payload.nombre || !payload.email || !payload.telefono || !payload.direccion) {
    alert('Completa todos los campos del cliente antes de realizar el pedido.');
    return;
  }

  const submitButton = checkoutForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo guardar el pedido.');
    }

    if (data.message !== 'Pedido realizado correctamente.' || !data.orderId) {
      throw new Error('El servidor no confirmó que el pedido se haya guardado.');
    }

    alert('Pedido realizado correctamente.');
    clearCart();
    checkoutForm.reset();
    cartPanel?.classList.remove('open');
    syncCartVisibility();
  } catch (error) {
    console.error(error);
    alert(`No se pudo realizar el pedido. ${error.message}`);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

cartToggle?.addEventListener('click', () => {
  cartPanel?.classList.toggle('open');
  syncCartVisibility();
});

closeCart?.addEventListener('click', () => {
  cartPanel?.classList.remove('open');
  syncCartVisibility();
});

emptyCartBtn?.addEventListener('click', () => {
  if (cart.length === 0) {
    alert('El carrito ya está vacío.');
    return;
  }

  const confirmed = window.confirm('¿Deseas vaciar todo el carrito?');
  if (confirmed) {
    clearCart();
  }
});

checkoutForm?.addEventListener('submit', submitCheckout);

document.addEventListener('click', (event) => {
  const clickedInsideCart = cartPanel?.contains(event.target) || cartToggle?.contains(event.target);

  if (!clickedInsideCart && cartPanel && cartPanel.classList.contains('open')) {
    cartPanel.classList.remove('open');
    syncCartVisibility();
  }

  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action;
    const id = actionButton.dataset.id;

    if (action === 'increase') changeQuantity(id, 1);
    if (action === 'decrease') changeQuantity(id, -1);
    if (action === 'remove') removeFromCart(id);
  }

  const productButton = event.target.closest('.producto__agregar');
  if (productButton) {
    addToCart({
      id: productButton.dataset.id,
      name: productButton.dataset.name,
      price: Number(productButton.dataset.price || 0),
      quantity: 1
    });
  }
});

createProductButtons();
initProductPage();
renderCart();
syncCartVisibility();
