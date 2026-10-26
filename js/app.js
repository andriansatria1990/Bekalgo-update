/**
 * BekalGo - Main Application Controller
 * Handles rendering, events, routing, and role-based permissions
 */

import { store } from './state.js';

// Application Local UI State
let activeTab = 'katalog';
let selectedCategory = 'Semua';
let selectedRoute = 'Semua Rute';
let searchQuery = '';
let pendingDeleteTenantId = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Subscribe to state changes for reactive re-render
  store.subscribe(state => {
    updateTopBar();
    updateHeaderNav();
    renderCurrentView();
  });

  // Initial Render
  updateTopBar();
  updateHeaderNav();
  renderCurrentView();
  startCutoffTicker();
}

// ==================== GLOBAL HELPER FUNCTIONS (WINDOW BOUND) ====================

window.switchRole = function(role) {
  store.setRole(role);
  if (role === 'user') {
    activeTab = 'katalog';
  } else if (role === 'mitra') {
    activeTab = 'rekap';
  } else if (role === 'super_admin') {
    activeTab = 'mitra_mgmt';
  }
  showToast(`Beralih ke peran: ${getRoleDisplayName(role)}`, 'info');
};

window.switchMitraTenant = function(tenantId) {
  store.setRole('mitra', tenantId);
  showToast(`Beralih ke gerai: ${store.getCurrentTenant()?.name}`, 'info');
};

window.navigateTab = function(tabName) {
  activeTab = tabName;
  updateHeaderNav();
  renderCurrentView();
};

window.cycleClockMode = function() {
  const currentMode = store.state.systemClock.mode;
  if (currentMode === 'pre_cutoff') {
    store.setSystemClockMode('post_cutoff');
    showToast('Simulasi Waktu: Pukul 21:15 WIB (Cut-off H-1 Aktif, Pesanan Ditutup)', 'warning');
  } else if (currentMode === 'post_cutoff') {
    store.setSystemClockMode('morning_pickup');
    showToast('Simulasi Waktu: Pukul 06:45 WIB (Waktu Pengambilan Grab & Go di Gerai)', 'info');
  } else {
    store.setSystemClockMode('pre_cutoff');
    showToast('Simulasi Waktu: Pukul 16:30 WIB (Pemesanan H-1 Dibuka Normal)', 'success');
  }
};

window.triggerCron21 = function() {
  const res = store.triggerCron21();
  showToast(res.message, 'success');
};

window.resetAllData = function() {
  if (confirm('Apakah Anda ingin me-reset database demo ke data awal?')) {
    store.resetAllData();
    showToast('Data berhasil di-reset!', 'info');
  }
};

// Modal Handlers
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('is-open');
    if (modalId === 'modal-cart') {
      renderCartModal();
    }
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('is-open');
  }
};

// Cart Actions
window.addToCart = function(productId) {
  const res = store.addToCart(productId, 1);
  if (res.success) {
    showToast(res.message, 'success');
  } else {
    showToast(res.message, 'warning');
  }
};

window.updateCartQty = function(productId, delta) {
  const item = store.state.cart.find(i => i.productId === productId);
  if (item) {
    store.updateCartQty(productId, item.qty + delta);
    renderCartModal();
  }
};

window.removeFromCart = function(productId) {
  store.removeFromCart(productId);
  renderCartModal();
  showToast('Item dihapus dari keranjang', 'info');
};

window.checkoutCart = function() {
  const childName = document.getElementById('checkout-child-name')?.value;
  const childClass = document.getElementById('checkout-child-class')?.value;
  const pickupTimeSlot = document.getElementById('checkout-timeslot')?.value;
  const notes = document.getElementById('checkout-notes')?.value;

  const res = store.checkoutOrder({ childName, childClass, pickupTimeSlot, notes });

  if (res.success) {
    window.closeModal('modal-cart');
    showToast(res.message, 'success');
    activeTab = 'tiket';
    renderCurrentView();
  } else {
    showToast(res.message, 'danger');
    if (res.shortage) {
      setTimeout(() => {
        window.openModal('modal-topup');
      }, 1200);
    }
  }
};

// Top-Up Actions
window.setTopupAmount = function(amt) {
  const input = document.getElementById('custom-topup-input');
  if (input) input.value = amt;
};

window.confirmTopup = function() {
  const amtInput = document.getElementById('custom-topup-input');
  const methodSelect = document.getElementById('topup-method-select');
  const amount = Number(amtInput?.value || 50000);
  const method = methodSelect?.value || 'QRIS Instan';

  const res = store.topupWallet(amount, method);
  if (res.success) {
    window.closeModal('modal-topup');
    showToast(res.message, 'success');
  } else {
    showToast(res.message, 'danger');
  }
};

// Mitra Status & Product Actions
window.updateSubOrderStatus = function(orderId, subOrderId, newStatus) {
  const res = store.updateSubOrderStatus(orderId, subOrderId, newStatus);
  if (res.success) {
    showToast(res.message, 'success');
  }
};

window.openPrintLabelModal = function(orderId, subOrderId) {
  const order = store.state.orders.find(o => o.id === orderId);
  if (!order) return;
  const subOrder = order.subOrders.find(s => s.id === subOrderId);
  if (!subOrder) return;

  const body = document.getElementById('print-label-body');
  if (!body) return;

  body.innerHTML = `
    <div style="border: 2px solid #0f172a; padding: 20px; border-radius: 8px; background: #fff; font-family: monospace;">
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 14px;">
        <h2 style="margin: 0; font-size: 1.5rem; letter-spacing: -0.02em;">BekalGo Grab & Go</h2>
        <div style="font-size: 0.85rem; font-weight: bold; margin-top: 4px;">LABEL PENGAMBILAN MANDIRI</div>
        <div style="font-size: 0.75rem;">Sistem Pre-Order Terjadwal Sidoarjo</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; background: #f1f5f9; padding: 10px; border-radius: 6px;">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase;">Nomor Rak Gerai:</span>
          <div style="font-size: 1.8rem; font-weight: 900; color: #b45309;">${subOrder.rackNumber}</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 0.75rem;">Jadwal Pick-up:</span>
          <div style="font-size: 1.1rem; font-weight: bold;">${order.pickupTimeSlot}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${order.targetDate}</div>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="font-size: 0.75rem; color: #64748b;">NAMA SISWA / PENERIMA:</div>
        <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">${order.childName}</div>
        <div style="font-size: 0.85rem; font-weight: 600;">${order.childClass}</div>
      </div>

      <div style="margin-bottom: 12px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
        <div style="font-size: 0.75rem; color: #64748b;">GERAI UMKM:</div>
        <div style="font-size: 0.95rem; font-weight: bold;">${subOrder.tenantName}</div>
        <div style="font-size: 0.75rem;">Titik: ${subOrder.pickupPoint}</div>
      </div>

      <div style="margin-bottom: 12px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
        <div style="font-size: 0.75rem; color: #64748b;">DETAIL MENU BEKAL:</div>
        ${subOrder.items.map(it => `
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600; margin-top: 2px;">
            <span>${it.qty}x ${it.name}</span>
            <span>Rp ${(it.price * it.qty).toLocaleString('id-ID')}</span>
          </div>
        `).join('')}
      </div>

      ${order.notes && order.notes !== '-' ? `
        <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 6px 10px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 12px;">
          <strong>Catatan Orang Tua:</strong> ${order.notes}
        </div>
      ` : ''}

      <div style="text-align: center; border-top: 2px dashed #000; padding-top: 12px;">
        <div style="letter-spacing: 6px; font-size: 1rem; font-weight: bold; background: #000; color: #fff; padding: 6px; border-radius: 4px;">
          *${subOrder.id}*
        </div>
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">
          Ambil langsung di rak khusus tanpa perlu antre di kasir.
        </div>
      </div>
    </div>
  `;

  window.openModal('modal-print-label');
};

window.submitAddProduct = function(e) {
  e.preventDefault();
  const name = document.getElementById('prod-name').value;
  const price = document.getElementById('prod-price').value;
  const category = document.getElementById('prod-category').value;
  const calories = document.getElementById('prod-calories').value;
  const quotaDaily = document.getElementById('prod-quota').value;
  const description = document.getElementById('prod-desc').value;

  const res = store.addProduct({
    name,
    price,
    category,
    calories,
    quotaDaily,
    description
  });

  if (res.success) {
    window.closeModal('modal-add-product');
    showToast(res.message, 'success');
  }
};

window.deleteProduct = function(productId) {
  if (confirm('Hapus menu ini dari daftar toko?')) {
    const res = store.deleteProduct(productId);
    showToast(res.message, 'info');
  }
};

// ==================== SUPER ADMIN TENANT CRUD ACTIONS ====================
// (Catatan User: Super Admin bisa menambahkan dan menghapus mitra gerai)

window.submitAddTenant = function(e) {
  e.preventDefault();
  const name = document.getElementById('tenant-name').value;
  const owner = document.getElementById('tenant-owner').value;
  const phone = document.getElementById('tenant-phone').value;
  const location = document.getElementById('tenant-location').value;
  const route = document.getElementById('tenant-route').value;
  const commissionRate = document.getElementById('tenant-commission').value;
  const pickupPoint = document.getElementById('tenant-pickup-point').value;
  const description = document.getElementById('tenant-desc').value;

  const res = store.addTenant({
    name,
    owner,
    phone,
    location,
    route,
    commissionRate,
    pickupPoint,
    description
  });

  if (res.success) {
    document.getElementById('form-add-tenant').reset();
    window.closeModal('modal-add-tenant');
    showToast(res.message, 'success');
  } else {
    showToast(res.message, 'danger');
  }
};

window.askDeleteTenant = function(tenantId) {
  const tenant = store.state.tenants.find(t => t.id === tenantId);
  if (!tenant) return;

  pendingDeleteTenantId = tenantId;
  const span = document.getElementById('delete-tenant-name-span');
  if (span) span.textContent = `"${tenant.name}" (${tenant.owner})`;

  const confirmBtn = document.getElementById('btn-confirm-delete-tenant');
  if (confirmBtn) {
    confirmBtn.onclick = function() {
      executeDeleteTenant(pendingDeleteTenantId);
    };
  }

  window.openModal('modal-delete-tenant');
};

function executeDeleteTenant(tenantId) {
  const res = store.deleteTenant(tenantId);
  window.closeModal('modal-delete-tenant');
  pendingDeleteTenantId = null;

  if (res.success) {
    showToast(res.message, 'success');
  } else {
    showToast(res.message, 'danger');
  }
}

window.toggleTenantStatus = function(tenantId) {
  const tenant = store.state.tenants.find(t => t.id === tenantId);
  if (!tenant) return;
  const newStatus = !tenant.isActive;
  store.updateTenant(tenantId, { isActive: newStatus });
  showToast(`Status ${tenant.name} diubah menjadi: ${newStatus ? 'Buka (Aktif)' : 'Tutup Sementara'}`, 'info');
};

// ==================== RENDERING LOGIC ====================

function updateTopBar() {
  const role = store.state.auth.currentRole;
  const btnUser = document.getElementById('btn-role-user');
  const btnMitra = document.getElementById('btn-role-mitra');
  const btnAdmin = document.getElementById('btn-role-admin');
  const clockText = document.getElementById('virtual-clock-text');
  const cutoffBanner = document.getElementById('cutoff-banner');

  if (btnUser) btnUser.className = `role-btn ${role === 'user' ? 'active' : ''}`;
  if (btnMitra) btnMitra.className = `role-btn ${role === 'mitra' ? 'active active-mitra' : ''}`;
  if (btnAdmin) btnAdmin.className = `role-btn ${role === 'super_admin' ? 'active active-admin' : ''}`;

  if (clockText) {
    clockText.textContent = store.state.systemClock.virtualTime;
  }

  if (cutoffBanner) {
    if (store.state.systemClock.mode === 'post_cutoff') {
      cutoffBanner.className = 'cutoff-alert-strip';
      cutoffBanner.innerHTML = `
        <span>🔒 <strong>Cut-Off Pukul 21:00 Berlaku:</strong> Pemesanan untuk esok hari telah ditutup. Seluruh mitra gerai sedang menyiapkan rekap produksi.</span>
        <button class="clock-toggle-btn" onclick="window.cycleClockMode()" style="background: #991b1b; color: white;">Buka Kembali (Simulasi)</button>
      `;
    } else if (store.state.systemClock.mode === 'morning_pickup') {
      cutoffBanner.className = 'cutoff-alert-strip is-open';
      cutoffBanner.innerHTML = `
        <span>☀️ <strong>Sesi Grab & Go Pagi (06:00 - 08:30 WIB):</strong> Makanan sudah siap di rak gerai. Ambil langsung tanpa antre kasir!</span>
      `;
    } else {
      cutoffBanner.className = 'cutoff-alert-strip is-open';
      cutoffBanner.innerHTML = `
        <span>📢 <strong>Sistem Cut-Off H-1:</strong> Pemesanan bekal untuk besok dibuka hingga pukul 21:00 WIB.</span>
        <span class="cutoff-timer-highlight" id="countdown-timer">Sisa Waktu: 04j 29m 12d</span>
      `;
    }
  }
}

function updateHeaderNav() {
  const role = store.state.auth.currentRole;
  const navContainer = document.getElementById('main-nav-tabs');
  const headerActions = document.getElementById('header-actions');
  const currentUser = store.getCurrentUser();

  if (!navContainer || !headerActions) return;

  // 1. Role-specific Navigation Tabs
  if (role === 'user') {
    navContainer.innerHTML = `
      <button class="nav-tab-btn ${activeTab === 'katalog' ? 'active' : ''}" onclick="window.navigateTab('katalog')">
        🍱 Katalog Sarapan
      </button>
      <button class="nav-tab-btn ${activeTab === 'recurring' ? 'active' : ''}" onclick="window.navigateTab('recurring')">
        🔁 Langganan Rutin
      </button>
      <button class="nav-tab-btn ${activeTab === 'tiket' ? 'active' : ''}" onclick="window.navigateTab('tiket')">
        🎫 Tiket Grab & Go (${store.state.orders.filter(o => o.userId === currentUser.id).length})
      </button>
      <button class="nav-tab-btn ${activeTab === 'wallet' ? 'active' : ''}" onclick="window.navigateTab('wallet')">
        💳 BekalPay
      </button>
    `;

    const breakdown = store.getCartBreakdown();
    headerActions.innerHTML = `
      <button class="wallet-badge-btn" onclick="window.openModal('modal-topup')" title="Klik untuk Top-up Saldo">
        <span>💰</span>
        <span>Rp ${(currentUser?.walletBalance || 0).toLocaleString('id-ID')}</span>
        <span style="font-size: 0.75rem; background: #166534; color: white; padding: 2px 6px; border-radius: 99px;">+ Top-up</span>
      </button>

      <button class="cart-btn" onclick="window.openModal('modal-cart')" title="Buka Keranjang">
        🛒
        ${breakdown.totalItemsCount > 0 ? `<span class="cart-count">${breakdown.totalItemsCount}</span>` : ''}
      </button>

      <div class="user-profile-badge" title="Profil Akun">
        <div class="user-avatar">${currentUser?.name?.slice(0, 2)?.toUpperCase() || 'OR'}</div>
        <div class="user-name-role">
          <span class="name">${currentUser?.name || 'Ibu Rina'}</span>
          <span class="role-tag">Orang Tua • ${currentUser?.childName || 'Ananda'}</span>
        </div>
      </div>
    `;

  } else if (role === 'mitra') {
    const currentTenant = store.getCurrentTenant();
    navContainer.innerHTML = `
      <button class="nav-tab-btn ${activeTab === 'rekap' ? 'active' : ''}" onclick="window.navigateTab('rekap')">
        📋 Rekap Pesanan H-1
      </button>
      <button class="nav-tab-btn ${activeTab === 'menu' ? 'active' : ''}" onclick="window.navigateTab('menu')">
        🍽️ Kelola Menu & Stok
      </button>
      <button class="nav-tab-btn ${activeTab === 'penjualan' ? 'active' : ''}" onclick="window.navigateTab('penjualan')">
        📈 Laporan Omzet
      </button>
    `;

    headerActions.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.8rem; color: var(--slate-600); font-weight: 600;">Pilih Gerai:</span>
        <select onchange="window.switchMitraTenant(this.value)" style="padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-weight: 700; background: white; font-family: var(--font-sans); font-size: 0.85rem; cursor: pointer;">
          ${store.state.tenants.map(t => `
            <option value="${t.id}" ${t.id === currentTenant?.id ? 'selected' : ''}>${t.name}</option>
          `).join('')}
        </select>
      </div>

      <div class="user-profile-badge" style="background: #ccfbf1; border: 1px solid #99f6e4;">
        <div class="user-avatar" style="background: var(--secondary); color: white;">🏪</div>
        <div class="user-name-role">
          <span class="name">${currentTenant?.owner || 'Mitra'}</span>
          <span class="role-tag" style="color: var(--secondary-dark);">Mitra Gerai Terverifikasi</span>
        </div>
      </div>
    `;

  } else if (role === 'super_admin') {
    navContainer.innerHTML = `
      <button class="nav-tab-btn ${activeTab === 'mitra_mgmt' ? 'active' : ''}" onclick="window.navigateTab('mitra_mgmt')">
        🏢 Kelola Mitra Gerai
      </button>
      <button class="nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}" onclick="window.navigateTab('analytics')">
        📊 Metrik Finansial
      </button>
      <button class="nav-tab-btn ${activeTab === 'cron_monitor' ? 'active' : ''}" onclick="window.navigateTab('cron_monitor')">
        ⚙️ Monitoring Cut-Off & Rekap
      </button>
    `;

    headerActions.innerHTML = `
      <button class="btn-admin-action" onclick="window.openModal('modal-add-tenant')" style="padding: 6px 14px; font-size: 0.82rem;">
        ➕ Tambah Mitra Gerai
      </button>
      <div class="user-profile-badge" style="background: #e0e7ff; border: 1px solid #c7d2fe;">
        <div class="user-avatar" style="background: #4f46e5; color: white;">⚡</div>
        <div class="user-name-role">
          <span class="name">${store.state.superAdmin.name}</span>
          <span class="role-tag" style="color: #4338ca;">Super Admin BekalGo</span>
        </div>
      </div>
    `;
  }
}

function renderCurrentView() {
  const container = document.getElementById('app-view-container');
  if (!container) return;

  const role = store.state.auth.currentRole;

  if (role === 'user') {
    renderUserView(container);
  } else if (role === 'mitra') {
    renderMitraView(container);
  } else if (role === 'super_admin') {
    renderSuperAdminView(container);
  }
}

// ==================== 1. USER VIEW RENDERING ====================

function renderUserView(container) {
  if (activeTab === 'katalog') {
    renderUserKatalog(container);
  } else if (activeTab === 'recurring') {
    renderUserRecurring(container);
  } else if (activeTab === 'tiket') {
    renderUserTiket(container);
  } else if (activeTab === 'wallet') {
    renderUserWallet(container);
  }
}

function renderUserKatalog(container) {
  const currentUser = store.getCurrentUser();
  const routes = ['Semua Rute', ...new Set(store.state.tenants.map(t => t.route))];
  const categories = ['Semua', 'Nasi & Lauk', 'Bento Anak', 'Roti & Susu', 'Bubur & Tradisional', 'Minuman Sehat'];

  // Filter products
  const filteredProducts = store.state.products.filter(p => {
    const tenant = store.state.tenants.find(t => t.id === p.tenantId);
    if (!tenant || !tenant.isActive) return false;

    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchRoute = selectedRoute === 'Semua Rute' || tenant.route === selectedRoute;
    const matchSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCategory && matchRoute && matchSearch;
  });

  container.innerHTML = `
    <!-- Hero Banner -->
    <div class="hero-card">
      <div class="hero-text">
        <div class="hero-badge">🚀 Inovasi Sarapan Anak Bebas Antre</div>
        <h2>Pre-Order Malam Ini, <span>Grab & Go</span> Besok Pagi!</h2>
        <p>
          Beli bekal sekolah anak tanpa repot bangun dini hari memasak atau terjebak antrean jalan raya Sidoarjo. Makanan sudah siap berlabel nama ananda di rak khusus gerai.
        </p>
        <div class="hero-features-list">
          <div class="hero-feature-item">
            <span>⏱️</span> Cut-Off H-1 Pukul 21:00
          </div>
          <div class="hero-feature-item">
            <span>🍱</span> Keranjang Multi-Tenant
          </div>
          <div class="hero-feature-item">
            <span>⚡</span> Ambil 10 Detik di Rak Khusus
          </div>
        </div>
      </div>
      <div class="hero-img-wrap">
        <img src="assets/hero-banner.jpg" alt="BekalGo Grab and Go Sidoarjo" />
      </div>
    </div>

    <!-- Controls: Search, Route Filter & Category Pills -->
    <div class="catalog-controls">
      <div class="search-and-route">
        <div class="search-input-group">
          <span>🔍</span>
          <input type="text" id="katalog-search-input" placeholder="Cari menu sarapan atau nama gerai mitra..." value="${searchQuery}" oninput="window.handleSearch(this.value)">
        </div>

        <div class="route-select-group">
          <select id="route-select" onchange="window.handleRouteSelect(this.value)">
            ${routes.map(r => `<option value="${r}" ${r === selectedRoute ? 'selected' : ''}>📍 ${r}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="category-pills">
        ${categories.map(c => `
          <button class="cat-pill ${c === selectedCategory ? 'active' : ''}" onclick="window.handleCategorySelect('${c}')">${c}</button>
        `).join('')}
      </div>
    </div>

    <!-- Mitra Gerai Terverifikasi Section -->
    <div class="section-title-wrap">
      <h3>🏪 Mitra Gerai Sarapan di Rute Anda (${store.state.tenants.filter(t => t.isActive).length} Gerai Aktif)</h3>
      <p>Gerai menyediakan rak khusus Grab & Go agar Anda tidak perlu antre reguler</p>
    </div>

    <div class="tenants-grid">
      ${store.state.tenants.filter(t => t.isActive).map(t => `
        <div class="tenant-card">
          <div class="tenant-card-img">
            <img src="${t.image}" alt="${t.name}">
            <div class="tenant-route-badge">📍 ${t.route}</div>
          </div>
          <div class="tenant-card-body">
            <h4>${t.name}</h4>
            <div class="tenant-pickup-loc">
              <span>🏷️</span> ${t.pickupPoint}
            </div>
            <p>${t.description}</p>
            <div class="tenant-meta">
              <span class="rating">⭐ ${t.rating} (${t.totalOrdersHandled}+ Pesanan)</span>
              <span>🕒 ${t.openTime}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Menu Sarapan & Bekal Sekolah Section -->
    <div class="section-title-wrap">
      <h3>🍱 Pilihan Menu Sarapan & Bekal Bergizi (${filteredProducts.length} Menu)</h3>
      <p>Pesan sebelum pukul 21:00 WIB untuk pengambilan besok pagi</p>
    </div>

    <div class="products-grid">
      ${filteredProducts.length > 0 ? filteredProducts.map(p => {
        const tenant = store.state.tenants.find(t => t.id === p.tenantId);
        return `
          <div class="product-card">
            <div class="product-img-wrap">
              <img src="${p.image}" alt="${p.name}">
              <div class="product-tenant-tag">${tenant ? tenant.name : 'Mitra Bekal'}</div>
              <div class="product-cal-badge">${p.calories || '450 kkal'}</div>
            </div>
            <div class="product-body">
              <h4>${p.name}</h4>
              <p>${p.description}</p>
              <div class="product-footer">
                <div class="product-price">Rp ${p.price.toLocaleString('id-ID')}</div>
                <button class="btn-add-cart" onclick="window.addToCart('${p.id}')">
                  <span>+</span> Keranjang
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('') : `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: white; border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🍽️</div>
          <h4 style="font-weight: 700; margin-bottom: 6px;">Tidak ada menu yang sesuai kriteria</h4>
          <p style="color: var(--slate-600); font-size: 0.9rem;">Coba ubah kata kunci pencarian atau pilih rute lain di Sidoarjo.</p>
        </div>
      `}
    </div>
  `;
}

window.handleSearch = function(val) {
  searchQuery = val;
  renderUserKatalog(document.getElementById('app-view-container'));
};

window.handleRouteSelect = function(val) {
  selectedRoute = val;
  renderUserKatalog(document.getElementById('app-view-container'));
};

window.handleCategorySelect = function(val) {
  selectedCategory = val;
  renderUserKatalog(document.getElementById('app-view-container'));
};

function renderUserRecurring(container) {
  const recurring = store.state.recurringPlans[0];
  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto;">
      <div class="section-title-wrap" style="margin-bottom: 24px;">
        <div>
          <h3>🔁 Fitur Pengunci Retensi: Langganan Bekal Otomatis (Recurring Order)</h3>
          <p>Solusi anti-ribet! Jadwalkan bekal ananda Senin-Jumat selama 1 bulan. Saldo terpotong otomatis tiap H-1 sebelum 21:00 WIB.</p>
        </div>
      </div>

      <div style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 30px; box-shadow: var(--shadow-sm); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
          <div>
            <span class="badge-status" style="background: #dcfce7; color: #166534; font-weight: 700; margin-bottom: 8px;">
              ✓ Status: Langganan Aktif
            </span>
            <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--dark-slate); margin-top: 4px;">${recurring.title}</h3>
            <p style="color: var(--slate-600); font-size: 0.9rem;">Untuk Ananda: <strong>${recurring.childName}</strong> (SD Islam Al-Falah)</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; color: var(--slate-600);">Total Biaya Mingguan:</div>
            <div style="font-size: 1.6rem; font-weight: 900; color: var(--primary);">Rp ${recurring.weeklyCost.toLocaleString('id-ID')}</div>
            <div style="font-size: 0.75rem; color: var(--secondary-dark); font-weight: 600;">Hemat Service Fee & Eksekusi Otomatis</div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--slate-200); padding-top: 20px;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 14px;">Jadwal Menu Bergizi Harian (Senin - Jumat):</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
            ${recurring.menuSchedule.map(item => `
              <div style="background: var(--slate-50); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius-md);">
                <div style="font-size: 0.8rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">${item.day}</div>
                <div style="font-weight: 700; font-size: 0.92rem; margin: 4px 0 2px 0;">${item.menu}</div>
                <div style="font-size: 0.75rem; color: var(--slate-600);">${item.tenant}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: 24px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-weight: 700; color: #1e40af; font-size: 0.9rem;">Eksekusi Otomatis Berikutnya:</div>
            <div style="font-size: 0.85rem; color: #3b82f6;">${recurring.nextExecution} • Memotong Saldo BekalPay pukul 20:50 WIB</div>
          </div>
          <button class="btn-table-action btn-table-edit" onclick="showToast('Fitur kustomisasi menu mingguan berhasil disimpan!', 'success')">
            ⚙️ Ubah Jadwal Menu
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderUserTiket(container) {
  const currentUser = store.getCurrentUser();
  const userOrders = store.state.orders.filter(o => o.userId === currentUser.id);

  container.innerHTML = `
    <div style="max-width: 860px; margin: 0 auto;">
      <div class="section-title-wrap" style="margin-bottom: 20px;">
        <div>
          <h3>🎫 Tiket Digital Grab & Go (Pengambilan Mandiri)</h3>
          <p>Tunjukkan tiket ini atau sebutkan Nomor Rak saat mengambil bekal di titik khusus gerai mitra tanpa antre.</p>
        </div>
      </div>

      ${userOrders.length > 0 ? userOrders.map(order => `
        <div class="pickup-ticket">
          <div class="pickup-ticket-header">
            <div>
              <span class="badge-status ${order.status}">
                ● Status Pesanan: ${getOrderStatusLabel(order.status)}
              </span>
              <div style="font-size: 1.15rem; font-weight: 800; margin-top: 6px;">${order.id}</div>
              <div style="font-size: 0.82rem; color: var(--slate-600);">
                Tanggal Ambil: <strong>${order.targetDate}</strong> • Slot Jam: <strong>${order.pickupTimeSlot} WIB</strong>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.8rem; color: var(--slate-600);">Nama Ananda:</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--dark-slate);">${order.childName}</div>
              <div style="font-size: 0.78rem; color: var(--slate-600);">${order.childClass}</div>
            </div>
          </div>

          <div style="margin: 16px 0; border-top: 1px dashed var(--slate-300); padding-top: 14px;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--slate-700); margin-bottom: 10px;">
              Titik Pengambilan Rak Grab & Go (${order.subOrders.length} Gerai Mitra):
            </h4>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
              ${order.subOrders.map(sub => `
                <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; display: flex; gap: 12px; align-items: center;">
                  <div class="rack-callout">
                    <span>NO. RAK</span>
                    <strong>${sub.rackNumber}</strong>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 800; font-size: 0.95rem; color: var(--dark-slate);">${sub.tenantName}</div>
                    <div style="font-size: 0.78rem; color: var(--secondary-dark); margin: 2px 0;">📍 ${sub.pickupPoint}</div>
                    <div style="font-size: 0.82rem; color: var(--slate-700); font-weight: 600;">
                      ${sub.items.map(it => `${it.qty}x ${it.name}`).join(', ')}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="barcode-sim">
            ||| | ||||| || |||||| | |||| | ||||| | |||||||| |||
            <div style="font-size: 0.75rem; letter-spacing: 2px; color: var(--slate-600); font-weight: 600; margin-top: 4px;">
              KODE RESI: ${order.id}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--slate-100); padding-top: 12px; font-size: 0.85rem;">
            <div>
              <span>Total Pembayaran: <strong>Rp ${order.totalPayment.toLocaleString('id-ID')}</strong> (Termasuk Service Fee Rp 1.000)</span>
            </div>
            <button class="btn-table-action btn-table-edit" onclick="showToast('Petunjuk arah menuju rak gerai dibuka di Google Maps', 'info')">
              🗺️ Rute Gerai Sidoarjo
            </button>
          </div>
        </div>
      `).join('') : `
        <div style="text-align: center; padding: 40px; background: white; border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🎫</div>
          <h4 style="font-weight: 700;">Belum ada pesanan aktif</h4>
          <p style="color: var(--slate-600); font-size: 0.85rem; margin-top: 4px;">Pilih menu sarapan lezat di katalog sebelum jam 21:00 WIB.</p>
          <button class="btn-add-tenant" onclick="window.navigateTab('katalog')" style="margin: 16px auto 0 auto;">Buka Katalog Sarapan</button>
        </div>
      `}
    </div>
  `;
}

function renderUserWallet(container) {
  const currentUser = store.getCurrentUser();
  const txs = store.state.walletTransactions.filter(t => t.userId === currentUser.id);

  container.innerHTML = `
    <div style="max-width: 860px; margin: 0 auto;">
      <div class="section-title-wrap" style="margin-bottom: 24px;">
        <div>
          <h3>💳 Dompet Internal BekalPay</h3>
          <p>Sistem wallet internal membebaskan Anda dan UMKM dari beban biaya admin payment gateway per transaksi.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-bottom: 28px;">
        <!-- Saldo Card -->
        <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: white; padding: 28px; border-radius: var(--radius-xl); box-shadow: var(--shadow-md); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <span style="font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.9;">BekalPay Balance</span>
              <span style="font-size: 1.4rem;">🍱</span>
            </div>
            <div style="font-size: 2.3rem; font-weight: 900; letter-spacing: -0.02em;">
              Rp ${(currentUser.walletBalance || 0).toLocaleString('id-ID')}
            </div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">
              Pemilik: ${currentUser.name} (${currentUser.phone})
            </div>
          </div>

          <div style="margin-top: 24px; display: flex; gap: 10px;">
            <button class="btn-mitra-print" onclick="window.openModal('modal-topup')" style="color: #065f46; font-weight: 800;">
              ➕ Top-Up Saldo (Min. Rp 50.000)
            </button>
          </div>
        </div>

        <!-- Info Mitigasi Finansial -->
        <div style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm); font-size: 0.86rem;">
          <h4 style="font-weight: 800; margin-bottom: 8px; color: var(--dark-slate);">Mengapa Wajib BekalPay?</h4>
          <p style="color: var(--slate-600); line-height: 1.5; margin-bottom: 12px;">
            Berdasarkan riset proposal startup, jika setiap order Rp 15.000 dipotong biaya admin gateway (Rp 2.000), margin platform dan pedagang akan habis.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 14px; border-radius: var(--radius-md); color: #166534; font-size: 0.82rem;">
            ✓ Top-up 1x minimal Rp 50.000 cukup untuk pemesanan rutin beberapa hari tanpa potongan transfer berulang.
          </div>
        </div>
      </div>

      <!-- Riwayat Mutasi Dompet -->
      <div class="recap-card">
        <div class="recap-header">
          <h3>Riwayat Transaksi Saldo BekalPay</h3>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID Transaksi</th>
                <th>Keterangan</th>
                <th>Metode</th>
                <th>Waktu</th>
                <th>Nominal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${txs.length > 0 ? txs.map(tx => `
                <tr>
                  <td style="font-family: var(--font-mono); font-weight: 700;">${tx.id}</td>
                  <td>${tx.description}</td>
                  <td><span class="badge-status" style="background: var(--slate-100);">${tx.method}</span></td>
                  <td style="font-size: 0.8rem; color: var(--slate-600);">${new Date(tx.timestamp).toLocaleString('id-ID')}</td>
                  <td style="font-weight: 800; color: ${tx.type === 'topup' ? '#10b981' : '#ef4444'};">
                    ${tx.type === 'topup' ? '+' : '-'} Rp ${tx.amount.toLocaleString('id-ID')}
                  </td>
                  <td><span class="badge-status completed">Berhasil</span></td>
                </tr>
              `).join('') : `
                <tr><td colspan="6" style="text-align: center; color: var(--slate-600);">Belum ada riwayat transaksi</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Render Cart Modal Body
function renderCartModal() {
  const body = document.getElementById('cart-modal-body');
  if (!body) return;

  const breakdown = store.getCartBreakdown();
  const currentUser = store.getCurrentUser();

  if (breakdown.totalItemsCount === 0) {
    body.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🛒</div>
        <h4 style="font-weight: 700; color: var(--dark-slate);">Keranjang Masih Kosong</h4>
        <p style="color: var(--slate-600); font-size: 0.88rem; margin: 8px 0 20px 0;">
          Pilih menu sarapan dari mitra gerai favorit Anda di Sidoarjo.
        </p>
        <button class="btn-add-tenant" onclick="window.closeModal('modal-cart')">Mulai Belanja</button>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Multi-Tenant Grouping Display -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--dark-slate);">
            Pesanan Multi-Tenant (${breakdown.tenantCount} Mitra Gerai):
          </h4>
          <button class="btn-table-action btn-table-delete" onclick="store.clearCart(); renderCartModal();" style="font-size: 0.75rem;">
            Kosongkan
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${breakdown.tenantGroups.map(group => `
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; background: var(--slate-50);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 10px;">
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--primary);">
                  🏪 ${group.tenantName}
                </div>
                <div style="font-size: 0.75rem; color: var(--slate-600);">
                  📍 ${group.pickupPoint}
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${group.items.map(it => `
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 700; font-size: 0.88rem;">${it.name}</div>
                      <div style="font-size: 0.78rem; color: var(--primary);">Rp ${it.price.toLocaleString('id-ID')} / porsi</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <button class="btn-table-action btn-table-edit" style="padding: 2px 8px; font-weight: 900;" onclick="window.updateCartQty('${it.productId}', -1)">-</button>
                      <span style="font-weight: 800; font-size: 0.9rem; min-width: 18px; text-align: center;">${it.qty}</span>
                      <button class="btn-table-action btn-table-edit" style="padding: 2px 8px; font-weight: 900;" onclick="window.updateCartQty('${it.productId}', 1)">+</button>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div style="text-align: right; margin-top: 10px; font-size: 0.85rem; font-weight: 700; color: var(--slate-700);">
                Subtotal Gerai: Rp ${group.tenantSubtotal.toLocaleString('id-ID')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Detail Ananda & Penjadwalan Grab & Go -->
      <div style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px;">
        <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 12px; color: var(--dark-slate);">
          Data Siswa & Pengambilan Grab & Go (Besok Pagi):
        </h4>

        <div class="form-row">
          <div class="form-group">
            <label>Nama Siswa / Anak *</label>
            <input type="text" id="checkout-child-name" class="form-control" value="${currentUser?.childName || 'Rayyan Al-Fatih'}" required>
          </div>
          <div class="form-group">
            <label>Kelas & Sekolah *</label>
            <input type="text" id="checkout-child-class" class="form-control" value="${currentUser?.childClass || 'Kelas 4B - SD Al-Falah'}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Estimasi Jam Pengambilan di Rak *</label>
            <select id="checkout-timeslot" class="form-control">
              <option value="06:00 - 06:30">06:00 - 06:30 WIB (Paling Awal)</option>
              <option value="06:30 - 07:00" selected>06:30 - 07:00 WIB (Favorit)</option>
              <option value="07:00 - 07:30">07:00 - 07:30 WIB</option>
              <option value="07:30 - 08:00">07:30 - 08:00 WIB</option>
            </select>
          </div>
          <div class="form-group">
            <label>Catatan Khusus (Alergi / Permintaan)</label>
            <input type="text" id="checkout-notes" class="form-control" placeholder="Contoh: Sambal dipisah, tanpa seledri">
          </div>
        </div>
      </div>

      <!-- Ringkasan Finansial -->
      <div style="background: var(--slate-100); padding: 16px; border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 6px;">
          <span>Subtotal Makanan (${breakdown.totalItemsCount} Porsi):</span>
          <strong>Rp ${breakdown.subtotalProducts.toLocaleString('id-ID')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 6px;">
          <span>Biaya Layanan Platform (Fixed):</span>
          <strong style="color: var(--secondary-dark);">Rp ${breakdown.serviceFee.toLocaleString('id-ID')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 900; border-top: 1px dashed var(--slate-300); padding-top: 8px; margin-top: 8px;">
          <span>Total Pembayaran:</span>
          <span style="color: var(--primary);">Rp ${breakdown.totalPay.toLocaleString('id-ID')}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 0.85rem; padding-top: 8px; border-top: 1px solid var(--border-color);">
          <span>Saldo BekalPay Anda:</span>
          <strong>Rp ${(currentUser?.walletBalance || 0).toLocaleString('id-ID')}</strong>
        </div>

        ${currentUser?.walletBalance < breakdown.totalPay ? `
          <div style="background: var(--danger-light); color: var(--danger); font-size: 0.8rem; padding: 8px 12px; border-radius: 4px; margin-top: 10px; font-weight: 600;">
            ⚠️ Saldo kurang Rp ${(breakdown.totalPay - currentUser.walletBalance).toLocaleString('id-ID')}. Silakan Top-Up terlebih dahulu.
          </div>
        ` : ''}
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        ${currentUser?.walletBalance < breakdown.totalPay ? `
          <button class="btn-add-tenant" style="background: #166534;" onclick="window.closeModal('modal-cart'); window.openModal('modal-topup');">
            Top-Up BekalPay Dahulu
          </button>
        ` : `
          <button class="btn-add-tenant" onclick="window.checkoutCart()">
            Bayar Sekarang (BekalPay) & Terbitkan Tiket
          </button>
        `}
      </div>
    </div>
  `;
}

// ==================== 2. MITRA GERAI VIEW RENDERING ====================

function renderMitraView(container) {
  const currentTenant = store.getCurrentTenant();
  if (!currentTenant) {
    container.innerHTML = `<div style="text-align: center; padding: 40px;">Gerai tidak ditemukan.</div>`;
    return;
  }

  // Filter orders relevant to this tenant
  const tenantOrders = [];
  store.state.orders.forEach(order => {
    const matchingSub = order.subOrders.find(s => s.tenantId === currentTenant.id);
    if (matchingSub) {
      tenantOrders.push({
        parentOrder: order,
        subOrder: matchingSub
      });
    }
  });

  // Calculate stats
  let totalGrossOmzet = 0;
  let totalCommission = 0;
  let totalDishes = 0;

  const dishCountMap = {};

  tenantOrders.forEach(to => {
    totalGrossOmzet += to.subOrder.tenantSubtotal;
    totalCommission += to.subOrder.commissionFee;
    to.subOrder.items.forEach(it => {
      totalDishes += it.qty;
      dishCountMap[it.name] = (dishCountMap[it.name] || 0) + it.qty;
    });
  });

  const netEarnings = totalGrossOmzet - totalCommission;

  container.innerHTML = `
    <div class="mitra-dashboard">
      <!-- Header Banner Gerai -->
      <div class="mitra-header-card">
        <div class="mitra-store-info">
          <h2>🏪 ${currentTenant.name}</h2>
          <p>
            <span>👤 Pemilik: ${currentTenant.owner}</span> •
            <span>📍 ${currentTenant.location}</span> •
            <span>🏷️ ${currentTenant.pickupPoint}</span>
          </p>
        </div>

        <div class="mitra-actions-top">
          <button class="btn-mitra-print" onclick="window.printAllMitraLabels('${currentTenant.id}')">
            🖨️ Cetak Semua Label Grab & Go
          </button>
        </div>
      </div>

      <!-- KPI Widgets -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">
            <span>Total Porsi Besok Pagi</span>
            <span>🍱</span>
          </div>
          <div class="kpi-value">${totalDishes} Porsi</div>
          <div class="kpi-subtext">Dari ${tenantOrders.length} pesanan pre-order masuk</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">
            <span>Omzet Kotor H-1</span>
            <span>💰</span>
          </div>
          <div class="kpi-value">Rp ${totalGrossOmzet.toLocaleString('id-ID')}</div>
          <div class="kpi-subtext">Sudah dibayar di depan oleh pelanggan</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">
            <span>Komisi Platform (${currentTenant.commissionRate}%)</span>
            <span>🏷️</span>
          </div>
          <div class="kpi-value" style="color: var(--secondary-dark);">Rp ${totalCommission.toLocaleString('id-ID')}</div>
          <div class="kpi-subtext">Potongan ringan kemitraan aplikasi</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">
            <span>Pendapatan Bersih Mitra</span>
            <span>💵</span>
          </div>
          <div class="kpi-value" style="color: #065f46;">Rp ${netEarnings.toLocaleString('id-ID')}</div>
          <div class="kpi-subtext">Siap ditarik ke rekening pedagang</div>
        </div>
      </div>

      ${activeTab === 'rekap' ? `
        <!-- Rekap Masak Dapur Fisik -->
        <div class="recap-card">
          <div class="recap-header">
            <div>
              <h3>🍳 Rekapitulasi Bahan Masak Esok Hari</h3>
              <p style="font-size: 0.85rem; color: var(--slate-600);">
                Daftar total porsi yang harus dimasak malam/pagi hari tanpa perlu cek HP satu-satu saat jam sibuk
              </p>
            </div>
            <span class="badge-status" style="background: #eff6ff; color: #1e40af; font-weight: 700;">
              Otomasi Cut-off 21:00 WIB
            </span>
          </div>

          <div class="cooking-summary-chips">
            ${Object.keys(dishCountMap).length > 0 ? Object.entries(dishCountMap).map(([dish, qty]) => `
              <div class="cooking-chip">
                <span>🍱 ${dish}</span>
                <span class="qty-bubble">${qty} Porsi</span>
              </div>
            `).join('') : `
              <div style="color: var(--slate-600); font-size: 0.88rem;">Belum ada pesanan masuk untuk esok hari</div>
            `}
          </div>

          <!-- Tabel Pesanan Grab & Go Mitra -->
          <h4 style="font-size: 1rem; font-weight: 800; margin: 24px 0 12px 0;">
            Daftar Label Kemasan di Rak Grab & Go (${tenantOrders.length} Paket)
          </h4>

          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>No. Rak</th>
                  <th>ID Pesanan</th>
                  <th>Nama Anak / Kelas</th>
                  <th>Menu Pesanan</th>
                  <th>Estimasi Jam Ambil</th>
                  <th>Status Penyiapan</th>
                  <th>Aksi Label</th>
                </tr>
              </thead>
              <tbody>
                ${tenantOrders.length > 0 ? tenantOrders.map(to => `
                  <tr>
                    <td><span class="rack-tag">${to.subOrder.rackNumber}</span></td>
                    <td style="font-family: var(--font-mono); font-weight: 700;">${to.parentOrder.id}</td>
                    <td>
                      <div style="font-weight: 700;">${to.parentOrder.childName}</div>
                      <div style="font-size: 0.75rem; color: var(--slate-600);">${to.parentOrder.childClass}</div>
                    </td>
                    <td>
                      ${to.subOrder.items.map(it => `<div><strong>${it.qty}x</strong> ${it.name}</div>`).join('')}
                    </td>
                    <td style="font-weight: 600;">${to.parentOrder.pickupTimeSlot}</td>
                    <td>
                      <select class="form-control" style="padding: 4px 8px; font-size: 0.8rem; font-weight: 700;" onchange="window.updateSubOrderStatus('${to.parentOrder.id}', '${to.subOrder.id}', this.value)">
                        <option value="preparing" ${to.subOrder.status === 'preparing' ? 'selected' : ''}>⏳ Sedang Dimasak</option>
                        <option value="ready_pickup" ${to.subOrder.status === 'ready_pickup' ? 'selected' : ''}>✅ Di Rak Grab & Go</option>
                        <option value="completed" ${to.subOrder.status === 'completed' ? 'selected' : ''}>✨ Selesai Diambil</option>
                      </select>
                    </td>
                    <td>
                      <button class="btn-table-action btn-table-edit" onclick="window.openPrintLabelModal('${to.parentOrder.id}', '${to.subOrder.id}')">
                        🖨️ Cetak Stiker
                      </button>
                    </td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="7" style="text-align: center; color: var(--slate-600);">Belum ada antrean pesanan</td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${activeTab === 'menu' ? `
        <!-- Kelola Menu Mitra -->
        <div class="recap-card">
          <div class="recap-header">
            <div>
              <h3>🍽️ Katalog Menu Makanan Gerai Anda</h3>
              <p style="font-size: 0.85rem; color: var(--slate-600);">Atur menu sarapan, harga jual, dan kuota porsi harian</p>
            </div>
            <button class="btn-add-tenant" onclick="window.openModal('modal-add-product')">
              ➕ Tambah Menu Baru
            </button>
          </div>

          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nama Menu</th>
                  <th>Kategori</th>
                  <th>Harga Porsi</th>
                  <th>Kalori</th>
                  <th>Kuota Harian</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${store.state.products.filter(p => p.tenantId === currentTenant.id).map(p => `
                  <tr>
                    <td><img src="${p.image}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;"></td>
                    <td><strong style="color: var(--dark-slate);">${p.name}</strong></td>
                    <td><span class="badge-status" style="background: var(--slate-100);">${p.category}</span></td>
                    <td style="font-weight: 800; color: var(--primary);">Rp ${p.price.toLocaleString('id-ID')}</td>
                    <td>${p.calories || '-'}</td>
                    <td>${p.quotaDaily || 30} Porsi</td>
                    <td><span class="badge-status completed">Aktif Dijual</span></td>
                    <td>
                      <button class="btn-table-action btn-table-delete" onclick="window.deleteProduct('${p.id}')">Hapus</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${activeTab === 'penjualan' ? `
        <!-- Laporan Penjualan & Pencairan Dana H-1 -->
        <div class="recap-card">
          <div class="recap-header">
            <div>
              <h3>📈 Laporan Keuangan & Penarikan Dana</h3>
              <p style="font-size: 0.85rem; color: var(--slate-600);">Omzet penjualan H-1 dapat langsung dicairkan untuk belanja bahan baku pasar</p>
            </div>
            <button class="btn-add-tenant" style="background: #0d9488;" onclick="showToast('Permintaan pencairan dana Rp ${netEarnings.toLocaleString('id-ID')} diproses ke rekening!', 'success')">
              💸 Tarik Saldo (Rp ${netEarnings.toLocaleString('id-ID')})
            </button>
          </div>

          <div style="background: #f0fdfa; border: 1px solid #99f6e4; padding: 20px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <div style="font-weight: 800; color: #115e59; font-size: 1.1rem; margin-bottom: 4px;">Kepastian Modal Bahan Baku (Nilai Tawar UMKM)</div>
            <p style="font-size: 0.85rem; color: #0f766e; line-height: 1.5;">
              Berkat sistem pre-order dan cut-off 21:00 WIB, pedagang menerima uang di depan (H-1) sebelum belanja ke pasar dini hari, sehingga omzet harian 100% aman tanpa risiko makanan sisa terbuang.
            </p>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

window.printAllMitraLabels = function(tenantId) {
  const currentTenant = store.state.tenants.find(t => t.id === tenantId);
  const matchingOrders = [];

  store.state.orders.forEach(order => {
    const sub = order.subOrders.find(s => s.tenantId === tenantId);
    if (sub) {
      matchingOrders.push({ order, sub });
    }
  });

  if (matchingOrders.length === 0) {
    showToast('Belum ada pesanan untuk dicetak', 'info');
    return;
  }

  const body = document.getElementById('print-label-body');
  if (!body) return;

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      ${matchingOrders.map(({ order, sub }) => `
        <div style="border: 2px solid #0f172a; padding: 16px; border-radius: 8px; background: #fff; font-family: monospace; page-break-after: always;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
            <strong style="font-size: 1.2rem;">BekalGo Grab & Go</strong>
            <span style="font-weight: bold;">RAK: ${sub.rackNumber}</span>
          </div>
          <div style="font-size: 1.15rem; font-weight: 900;">${order.childName} (${order.childClass})</div>
          <div style="font-size: 0.85rem; margin: 4px 0;">Menu: ${sub.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</div>
          <div style="font-size: 0.8rem; color: #475569;">Jam Ambil: ${order.pickupTimeSlot} | ${order.targetDate}</div>
        </div>
      `).join('')}
    </div>
  `;

  window.openModal('modal-print-label');
};

// ==================== 3. SUPER ADMIN VIEW RENDERING ====================
// (Catatan User: Super admin bisa menambahkan dan menghapus mitra)

function renderSuperAdminView(container) {
  const totalTenants = store.state.tenants.length;
  const activeTenants = store.state.tenants.filter(t => t.isActive).length;
  const totalOrders = store.state.orders.length;

  let totalGmv = 0;
  let totalServiceFee = 0;
  let totalPlatformCommission = 0;

  store.state.orders.forEach(order => {
    totalGmv += order.totalPayment;
    totalServiceFee += order.serviceFee;
    order.subOrders.forEach(sub => {
      totalPlatformCommission += sub.commissionFee;
    });
  });

  const totalPlatformRevenue = totalServiceFee + totalPlatformCommission;

  container.innerHTML = `
    <div class="admin-dashboard">
      <!-- Admin Header Card -->
      <div class="admin-header-card">
        <div>
          <h2>⚡ Dashboard Super Admin BekalGo</h2>
          <p>Kontrol Pusat Operasional: Manajemen Kemitraan UMKM Sidoarjo, Otomasi Cron 21:00, & Analitik Finansial</p>
        </div>

        <div class="admin-quick-actions">
          <button class="btn-admin-action" onclick="window.openModal('modal-add-tenant')">
            ➕ Tambah Mitra Gerai Baru
          </button>
          <button class="btn-admin-cron" onclick="window.triggerCron21()">
            ⚙️ Jalankan Cron 21:00
          </button>
          <button class="clock-toggle-btn" onclick="window.resetAllData()" style="padding: 10px 14px;">
            ↺ Reset Demo
          </button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">
            <span>Total Mitra Gerai Terdaftar</span>
            <span>🏪</span>
          </div>
          <div class="kpi-value">${totalTenants} Gerai</div>
          <div class="kpi-subtext">${activeTenants} aktif melayani Grab & Go</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">
            <span>Gross Merchandise Value (GMV)</span>
            <span>💳</span>
          </div>
          <div class="kpi-value">Rp ${totalGmv.toLocaleString('id-ID')}</div>
          <div class="kpi-subtext">Dari ${totalOrders} transaksi pemesanan</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">
            <span>Service Fee Terkumpul (Rp 1.000)</span>
            <span>🎫</span>
          </div>
          <div class="kpi-value" style="color: #4f46e5;">Rp ${totalServiceFee.toLocaleString('id-ID')}</div>
          <div class="kpi-subtext">Biaya layanan tetap per transaksi induk</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">
            <span>Total Pendapatan Platform</span>
            <span>📈</span>
          </div>
          <div class="kpi-value" style="color: #10b981;">Rp ${totalPlatformRevenue.toLocaleString('id-ID')}</div>
          <div class="kpi-subtext">Service Fee + Komisi Tenant 3-5%</div>
        </div>
      </div>

      <!-- TAB 1: MANAJEMEN MITRA GERAI (FITUR UTAMA PERMINTAAN USER) -->
      ${activeTab === 'mitra_mgmt' ? `
        <div class="tenant-mgmt-card">
          <div class="tenant-mgmt-header">
            <div>
              <h3>🏪 Manajemen Mitra Gerai UMKM (Super Admin)</h3>
              <p style="font-size: 0.85rem; color: var(--slate-600); margin-top: 4px;">
                Sesuai hak akses Super Admin: Anda memiliki wewenang penuh untuk <strong>menambah</strong> dan <strong>menghapus mitra gerai</strong> di sistem.
              </p>
            </div>
            <button class="btn-add-tenant" onclick="window.openModal('modal-add-tenant')">
              ➕ Daftarkan Mitra Baru
            </button>
          </div>

          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Logo/Foto</th>
                  <th>Nama Gerai UMKM</th>
                  <th>Pemilik & WhatsApp</th>
                  <th>Rute Sekolah (Sidoarjo)</th>
                  <th>Titik Rak Grab & Go</th>
                  <th>Komisi</th>
                  <th>Status</th>
                  <th>Aksi (Wewenang Super Admin)</th>
                </tr>
              </thead>
              <tbody>
                ${store.state.tenants.map(t => `
                  <tr>
                    <td>
                      <img src="${t.image}" alt="${t.name}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
                    </td>
                    <td>
                      <div style="font-weight: 800; color: var(--dark-slate);">${t.name}</div>
                      <div style="font-size: 0.75rem; color: var(--slate-600);">${t.location}</div>
                    </td>
                    <td>
                      <div style="font-weight: 700;">${t.owner}</div>
                      <div style="font-size: 0.8rem; color: var(--secondary-dark); font-family: var(--font-mono);">${t.phone}</div>
                    </td>
                    <td>
                      <span class="badge-status" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">
                        📍 ${t.route}
                      </span>
                    </td>
                    <td style="font-size: 0.82rem; font-weight: 600;">${t.pickupPoint}</td>
                    <td style="font-weight: 800; color: var(--primary);">${t.commissionRate}%</td>
                    <td>
                      <button class="btn-table-action ${t.isActive ? 'btn-table-edit' : 'btn-table-delete'}" onclick="window.toggleTenantStatus('${t.id}')">
                        ${t.isActive ? '✅ Aktif' : '⏸️ Nonaktif'}
                      </button>
                    </td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn-table-action btn-table-delete" onclick="window.askDeleteTenant('${t.id}')" title="Hapus Mitra Ini">
                          🗑️ Hapus Mitra
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- TAB 2: ANALITIK FINANSIAL -->
      ${activeTab === 'analytics' ? `
        <div class="recap-card">
          <div class="recap-header">
            <h3>📊 Proyeksi Skalabilitas Bisnis (Sesuai Proposal)</h3>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px;">
            <div style="background: var(--slate-50); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-md);">
              <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 6px;">Target 50 Mitra Aktif</h4>
              <p style="font-size: 0.85rem; color: var(--slate-600); line-height: 1.5;">
                Dengan rata-rata 70 - 150 porsi per hari per gerai, sistem menghasilkan 3.500 - 7.500 transaksi harian.
              </p>
              <div style="font-size: 1.3rem; font-weight: 900; color: var(--primary); margin-top: 10px;">
                Rp 3.500.000 - Rp 7.500.000 / hari
              </div>
              <div style="font-size: 0.75rem; color: var(--secondary-dark); font-weight: 600;">Potensi Pendapatan Pasif Platform</div>
            </div>

            <div style="background: var(--slate-50); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-md);">
              <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 6px;">Mitigasi Biaya Admin (Internal Wallet)</h4>
              <p style="font-size: 0.85rem; color: var(--slate-600); line-height: 1.5;">
                Dengan mewajibkan Top-Up minimal Rp 50.000, biaya Payment Gateway (QRIS MDR 0.7% / VA) hanya terjadi 1 kali per 4-5 kali transaksi bekal, melindungi profitabilitas Rp 1.000 fee.
              </p>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 3: MONITORING CRON & CUT-OFF -->
      ${activeTab === 'cron_monitor' ? `
        <div class="recap-card">
          <div class="recap-header">
            <div>
              <h3>⚙️ Monitoring Otomasi Sistem & Cron Job 21:00 WIB</h3>
              <p style="font-size: 0.85rem; color: var(--slate-600);">Log automasi penutupan pemesanan H-1 dan distribusi rekapitulasi data</p>
            </div>
            <button class="btn-admin-cron" onclick="window.triggerCron21()">
              Eksekusi Cron Sekarang (Simulasi)
            </button>
          </div>

          <div style="background: var(--slate-900); color: #34d399; font-family: var(--font-mono); font-size: 0.85rem; padding: 20px; border-radius: var(--radius-md); line-height: 1.6;">
            <div>[21:00:00 WIB] SERVER CRON DISPATCHER: Menjalankan script penutupan pesanan H-1...</div>
            <div>[21:00:01 WIB] STATUS: Katalog pemesanan dikunci untuk tanggal besok.</div>
            <div>[21:00:02 WIB] GENERATOR: Membuat rekap batch pesanan untuk ${store.state.tenants.length} mitra gerai...</div>
            <div>[21:00:03 WIB] WHATSAPP GATEWAY: Rekap porsi dan link cetak label terkirim ke pemilik gerai.</div>
            <div>[STATUS SEKARANG]: ${store.state.systemClock.mode === 'post_cutoff' ? 'AKTIF (Pesanan Dikunci untuk Produksi)' : 'STANDBY (Menunggu Cut-off Pukul 21:00)'}</div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ==================== UTILITY FUNCTIONS ====================

function getRoleDisplayName(role) {
  if (role === 'user') return 'Orang Tua (User)';
  if (role === 'mitra') return 'Mitra Gerai UMKM';
  if (role === 'super_admin') return 'Super Admin Platform';
  return role;
}

function getOrderStatusLabel(status) {
  if (status === 'pending_cutoff') return 'Menunggu Cut-Off 21:00 WIB';
  if (status === 'preparing') return 'Sedang Disiapkan Mitra';
  if (status === 'ready_pickup') return 'Siap di Rak Grab & Go (Bisa Diambil)';
  if (status === 'completed') return 'Selesai Diambil';
  return status;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'danger' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function startCutoffTicker() {
  setInterval(() => {
    const timerElem = document.getElementById('countdown-timer');
    if (!timerElem) return;

    if (store.state.systemClock.mode === 'post_cutoff') {
      timerElem.textContent = 'Cut-Off Berjalan';
      return;
    }

    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(21, 0, 0, 0);

    let diff = cutoff - now;
    if (diff <= 0) {
      diff += 24 * 3600 * 1000;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = n => (n < 10 ? '0' + n : n);
    timerElem.textContent = `Sisa Waktu: ${pad(hours)}j ${pad(mins)}m ${pad(secs)}d`;
  }, 1000);
}
