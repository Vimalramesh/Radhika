// ---- Data keys for localStorage ----
const STORAGE_KEYS = {
  MENU: "ck_menu_items",
  SALES: "ck_sales_history",
};

const ADMIN_PIN = "1081"; // change this if you like

// ---- State ----
let menuItems = [];
let cart = [];

// ---- Utilities ----
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read from storage", key, e);
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save to storage", key, e);
  }
}

function formatCurrency(amount) {
  return "₹" + amount.toFixed(2);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Menu (with defaults for Samosa & Somas) ----
function loadMenu() {
  const existing = loadFromStorage(STORAGE_KEYS.MENU, null);
  if (Array.isArray(existing) && existing.length > 0) {
    // Fix image paths for existing items (in case old URLs were stored)
    menuItems = existing.map((item) => {
      if (item.name === "Samosa" && !item.imageUrl) {
        return { ...item, imageUrl: "samosa.png" };
      }
      if (item.name === "Somas" && !item.imageUrl) {
        return { ...item, imageUrl: "somas.png" };
      }
      return item;
    });
  } else {
    menuItems = [
      {
        id: generateId(),
        name: "Samosa",
        price: 15,
        imageUrl: "samosa.png",
        isActive: true,
      },
      {
        id: generateId(),
        name: "Somas",
        price: 20,
        imageUrl: "somas.png",
        isActive: true,
      },
    ];
    saveMenu();
  }
}

function saveMenu() {
  saveToStorage(STORAGE_KEYS.MENU, menuItems);
}

function renderMenu() {
  const container = document.getElementById("menu-list");
  container.innerHTML = "";

  menuItems
    .filter((item) => item.isActive)
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "menu-card";

      const img = document.createElement("img");
      img.src = item.imageUrl || "https://via.placeholder.com/300x200?text=Food";
      img.alt = item.name;

      const body = document.createElement("div");
      body.className = "menu-card-body";

      const title = document.createElement("div");
      title.className = "menu-card-title";
      title.textContent = item.name;

      const price = document.createElement("div");
      price.className = "menu-card-price";
      price.textContent = formatCurrency(item.price);

      const actions = document.createElement("div");
      actions.className = "menu-card-actions";

      const addBtn = document.createElement("button");
      addBtn.className = "btn small primary";
      addBtn.textContent = "Add to Cart";
      addBtn.addEventListener("click", () => {
        addToCart(item.id);
      });

      actions.appendChild(addBtn);
      body.appendChild(title);
      body.appendChild(price);
      body.appendChild(actions);
      card.appendChild(img);
      card.appendChild(body);
      container.appendChild(card);
    });
}

// ---- Cart logic ----
function findMenuItemById(id) {
  return menuItems.find((m) => m.id === id);
}

function addToCart(itemId) {
  const menuItem = findMenuItemById(itemId);
  if (!menuItem) return;

  const existing = cart.find((c) => c.itemId === itemId);
  if (existing) {
    existing.quantity += 1;
    existing.lineTotal = existing.quantity * existing.unitPrice;
  } else {
    cart.push({
      itemId,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity: 1,
      lineTotal: menuItem.price,
    });
  }
  renderCart();
}

function updateCartQuantity(itemId, delta) {
  const item = cart.find((c) => c.itemId === itemId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter((c) => c.itemId !== itemId);
  } else {
    item.lineTotal = item.quantity * item.unitPrice;
  }
  renderCart();
}

function removeFromCart(itemId) {
  cart = cart.filter((c) => c.itemId !== itemId);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const grandTotal = subtotal;
  return { subtotal, grandTotal };
}

function renderCart() {
  const tbody = document.getElementById("cart-body");
  tbody.innerHTML = "";

  cart.forEach((item) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.name;

    const tdQty = document.createElement("td");
    const qtyDiv = document.createElement("div");
    qtyDiv.className = "qty-controls";
    const minusBtn = document.createElement("button");
    minusBtn.textContent = "-";
    minusBtn.addEventListener("click", () => updateCartQuantity(item.itemId, -1));
    const qtySpan = document.createElement("span");
    qtySpan.textContent = item.quantity;
    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => updateCartQuantity(item.itemId, 1));
    qtyDiv.appendChild(minusBtn);
    qtyDiv.appendChild(qtySpan);
    qtyDiv.appendChild(plusBtn);
    tdQty.appendChild(qtyDiv);

    const tdPrice = document.createElement("td");
    tdPrice.textContent = formatCurrency(item.unitPrice);

    const tdTotal = document.createElement("td");
    tdTotal.textContent = formatCurrency(item.lineTotal);

    const tdRemove = document.createElement("td");
    tdRemove.style.textAlign = "right";
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn small danger";
    removeBtn.textContent = "X";
    removeBtn.addEventListener("click", () => removeFromCart(item.itemId));
    tdRemove.appendChild(removeBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdQty);
    tr.appendChild(tdPrice);
    tr.appendChild(tdTotal);
    tr.appendChild(tdRemove);
    tbody.appendChild(tr);
  });

  const { subtotal, grandTotal } = calculateTotals();
  document.getElementById("subtotal-amount").textContent = formatCurrency(subtotal);
  document.getElementById("grand-total").textContent = formatCurrency(grandTotal);

  const now = new Date();
  const billDatetimeElem = document.getElementById("bill-datetime");
  billDatetimeElem.textContent = now.toLocaleString();
}

// ---- Sales history & monthly report ----
function loadSalesHistory() {
  return loadFromStorage(STORAGE_KEYS.SALES, []);
}

function saveSalesHistory(history) {
  saveToStorage(STORAGE_KEYS.SALES, history);
}

function recordSale(order) {
  const history = loadSalesHistory();
  history.push(order);
  saveSalesHistory(history);
}

function renderMonthlyReport(selectedYear, selectedMonthIndex) {
  // monthIndex is 0-11
  const history = loadSalesHistory();
  const filtered = history.filter((order) => {
    const d = new Date(order.dateTimeISO);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonthIndex;
  });

  const byDateMap = new Map();
  filtered.forEach((order) => {
    const d = new Date(order.dateTimeISO);
    const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = byDateMap.get(dateKey) || { date: dateKey, orders: 0, total: 0 };
    existing.orders += 1;
    existing.total += order.grandTotal;
    byDateMap.set(dateKey, existing);
  });

  const rows = Array.from(byDateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const tbody = document.getElementById("report-body");
  tbody.innerHTML = "";

  let monthlyTotal = 0;
  let monthlyOrders = 0;

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    tdDate.textContent = row.date;
    const tdOrders = document.createElement("td");
    tdOrders.textContent = row.orders.toString();
    const tdTotal = document.createElement("td");
    tdTotal.textContent = row.total.toFixed(2);

    monthlyTotal += row.total;
    monthlyOrders += row.orders;

    tr.appendChild(tdDate);
    tr.appendChild(tdOrders);
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });

  document.getElementById("report-total-orders").textContent =
    monthlyOrders.toString();
  document.getElementById("report-total-amount").textContent =
    "₹" + monthlyTotal.toFixed(2);
}

// ---- QR Modal / Payment ----
function openQrModal() {
  const { grandTotal } = calculateTotals();
  if (grandTotal <= 0) {
    alert("Cart is empty. Add at least one item.");
    return;
  }
  document.getElementById("qr-amount").textContent = formatCurrency(grandTotal);
  document.getElementById("qr-modal").classList.remove("hidden");
}

function closeQrModal() {
  document.getElementById("qr-modal").classList.add("hidden");
}

function confirmPayment() {
  const { grandTotal } = calculateTotals();
  if (grandTotal <= 0 || cart.length === 0) {
    alert("Cart is empty. Cannot confirm payment.");
    return;
  }
  const now = new Date();
  const order = {
    id: generateId(),
    dateTimeISO: now.toISOString(),
    items: cart.map((c) => ({
      name: c.name,
      unitPrice: c.unitPrice,
      quantity: c.quantity,
      lineTotal: c.lineTotal,
    })),
    grandTotal,
  };
  recordSale(order);
  alert("Payment confirmed and order saved.");
  clearCart();
  closeQrModal();

  // Refresh monthly report (for current month)
  const currentMonthInput = document.getElementById("month-select");
  if (currentMonthInput.value) {
    const [yearStr, monthStr] = currentMonthInput.value.split("-");
    renderMonthlyReport(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1);
  }
}

// ---- Admin CRUD for menu items ----
function resetMenuForm() {
  document.getElementById("menu-id").value = "";
  document.getElementById("menu-name").value = "";
  document.getElementById("menu-price").value = "";
  document.getElementById("menu-image").value = "";
  document.getElementById("menu-active").checked = true;
}

function populateMenuForm(item) {
  document.getElementById("menu-id").value = item.id;
  document.getElementById("menu-name").value = item.name;
  document.getElementById("menu-price").value = item.price;
  document.getElementById("menu-image").value = item.imageUrl || "";
  document.getElementById("menu-active").checked = !!item.isActive;
}

function renderAdminMenuTable() {
  const tbody = document.getElementById("admin-menu-body");
  tbody.innerHTML = "";

  menuItems.forEach((item) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.name;

    const tdPrice = document.createElement("td");
    tdPrice.textContent = formatCurrency(item.price);

    const tdActive = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + (item.isActive ? "active" : "inactive");
    badge.textContent = item.isActive ? "Active" : "Inactive";
    tdActive.appendChild(badge);

    const tdActions = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "btn small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => populateMenuForm(item));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn small danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      if (confirm(`Delete menu item "${item.name}"?`)) {
        menuItems = menuItems.filter((m) => m.id !== item.id);
        saveMenu();
        renderMenu();
        renderAdminMenuTable();
        // Remove from cart as well if present
        cart = cart.filter((c) => c.itemId !== item.id);
        renderCart();
      }
    });

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdPrice);
    tr.appendChild(tdActive);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function handleMenuFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("menu-id").value;
  const name = document.getElementById("menu-name").value.trim();
  const price = parseFloat(document.getElementById("menu-price").value);
  const imageUrl = document.getElementById("menu-image").value.trim();
  const isActive = document.getElementById("menu-active").checked;

  if (!name || isNaN(price)) {
    alert("Please enter valid name and price.");
    return;
  }

  if (id) {
    // update existing
    const item = menuItems.find((m) => m.id === id);
    if (item) {
      item.name = name;
      item.price = price;
      item.imageUrl = imageUrl;
      item.isActive = isActive;
    }
  } else {
    // create new
    menuItems.push({
      id: generateId(),
      name,
      price,
      imageUrl,
      isActive,
    });
  }

  saveMenu();
  renderMenu();
  renderAdminMenuTable();
  resetMenuForm();
}

// ---- Init ----
function initMonthInput() {
  const monthInput = document.getElementById("month-select");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  monthInput.value = `${year}-${month}`;
}

function setupEventListeners() {
  document
    .getElementById("pay-now-btn")
    .addEventListener("click", openQrModal);
  document
    .getElementById("qr-close-btn")
    .addEventListener("click", closeQrModal);
  document
    .getElementById("confirm-payment-btn")
    .addEventListener("click", confirmPayment);
  document
    .getElementById("clear-cart-btn")
    .addEventListener("click", () => {
      if (cart.length === 0) return;
      if (confirm("Clear all items from cart?")) {
        clearCart();
      }
    });
  document
    .getElementById("print-bill-btn")
    .addEventListener("click", () => window.print());

  document
    .getElementById("menu-form")
    .addEventListener("submit", handleMenuFormSubmit);
  document
    .getElementById("menu-reset-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      resetMenuForm();
    });

  document
    .getElementById("refresh-report-btn")
    .addEventListener("click", () => {
      const monthInput = document.getElementById("month-select");
      if (!monthInput.value) return;
      const [yearStr, monthStr] = monthInput.value.split("-");
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      renderMonthlyReport(year, monthIndex);
    });

  const adminLoginBtn = document.getElementById("admin-login-btn");
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener("click", () => {
      const entered = prompt("Enter admin PIN:");
      if (entered === null) return;
      if (entered === ADMIN_PIN) {
        const reportsSection = document.getElementById("reports-section");
        if (reportsSection) {
          reportsSection.classList.remove("hidden-admin");
        }
        alert("Admin panel unlocked.");
      } else {
        alert("Incorrect PIN.");
      }
    });
  }
}

function init() {
  loadMenu();
  renderMenu();
  renderAdminMenuTable();
  renderCart();
  initMonthInput();

  const monthInput = document.getElementById("month-select");
  if (monthInput.value) {
    const [yearStr, monthStr] = monthInput.value.split("-");
    renderMonthlyReport(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1);
  }

  setupEventListeners();
}

document.addEventListener("DOMContentLoaded", init);

