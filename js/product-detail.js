const PRODUCT_MAP = {
  vuejs: { name: 'VueJS', image: 'img/1.jpg', price: 25 },
  angularjs: { name: 'AngularJS', image: 'img/2.jpg', price: 25 },
  reactjs: { name: 'ReactJS', image: 'img/3.jpg', price: 25 },
  redux: { name: 'Redux', image: 'img/4.jpg', price: 25 },
  'node-js': { name: 'Node.js', image: 'img/5.jpg', price: 25 },
  sass: { name: 'SASS', image: 'img/6.jpg', price: 25 },
  html5: { name: 'HTML5', image: 'img/7.jpg', price: 25 },
  github: { name: 'Github', image: 'img/8.jpg', price: 25 },
  bulmacss: { name: 'BulmaCSS', image: 'img/9.jpg', price: 25 },
  typescript: { name: 'TypeScript', image: 'img/10.jpg', price: 25 },
  drupal: { name: 'Drupal', image: 'img/11.jpg', price: 25 },
  javascript: { name: 'JavaScript', image: 'img/12.jpg', price: 25 },
  graphql: { name: 'GraphQL', image: 'img/13.jpg', price: 25 },
  wordpress: { name: 'WordPress', image: 'img/14.jpg', price: 25 }
};

function getProductFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('producto') || 'reactjs';
  return PRODUCT_MAP[key.toLowerCase()] || PRODUCT_MAP.reactjs;
}

function applyProductDetail() {
  const product = getProductFromQuery();
  const titleEl = document.querySelector('h1');
  const imageEl = document.querySelector('.camisa__imagen');
  const form = document.getElementById('productForm');

  if (titleEl) titleEl.textContent = product.name;
  if (imageEl) imageEl.src = product.image;
  if (imageEl) imageEl.alt = product.name;
  if (form) {
    form.dataset.productName = product.name;
    form.dataset.productPrice = product.price;
  }

  const nameInput = document.getElementById('customerName');
  if (nameInput) nameInput.placeholder = 'Nombre completo';
}

document.addEventListener('DOMContentLoaded', () => {
  applyProductDetail();
});

const productLinks = document.querySelectorAll('.producto a');
productLinks.forEach((link) => {
  const productName = link.querySelector('.producto__nombre')?.textContent.trim();
  if (!productName) return;

  const key = Object.keys(PRODUCT_MAP).find((slug) => PRODUCT_MAP[slug].name.toLowerCase() === productName.toLowerCase());
  if (key) {
    link.href = `producto.html?producto=${key}`;
  }
});
