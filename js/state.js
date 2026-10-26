/**
 * BekalGo - State Management & Business Logic Store
 * Handles: Multi-role authentication, Multi-tenant Cart, Wallet, Cut-off Cron, and Super Admin Tenant CRUD
 */

import { INITIAL_DATA } from './data.js';

const STORAGE_KEY = 'bekalgo_app_state_v1';

class Store {
  constructor() {
    this.subscribers = [];
    this.state = this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure default structure integrity
        return {
          ...INITIAL_DATA,
          ...parsed,
          auth: parsed.auth || {
            currentRole: 'user', // 'user' | 'mitra' | 'super_admin'
            userId: 'usr_01',
            tenantId: 'tnt_01'
          },
          cart: parsed.cart || [],
          systemClock: parsed.systemClock || {
            mode: 'pre_cutoff', // 'pre_cutoff' (16:30) | 'post_cutoff' (21:15) | 'morning_pickup' (06:45)
            virtualTime: '16:30 WIB'
          }
        };
      }
    } catch (e) {
      console.warn('Failed to parse localStorage, resetting to seed data', e);
    }

    return {
      ...JSON.parse(JSON.stringify(INITIAL_DATA)),
      auth: {
        currentRole: 'user',
        userId: 'usr_01',
        tenantId: 'tnt_01'
      },
      cart: [],
      systemClock: {
        mode: 'pre_cutoff',
        virtualTime: '16:30 WIB'
      }
    };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => cb(this.state));
  }

  // ==================== AUTH & ROLE MANAGEMENT ====================

  setRole(role, targetId = null) {
    this.state.auth.currentRole = role;
    if (role === 'user') {
      this.state.auth.userId = targetId || this.state.users[0]?.id || 'usr_01';
    } else if (role === 'mitra') {
      this.state.auth.tenantId = targetId || this.state.tenants[0]?.id || 'tnt_01';
    }
    this.saveState();
  }

  getCurrentUser() {
    if (this.state.auth.currentRole === 'user') {
      return this.state.users.find(u => u.id === this.state.auth.userId) || this.state.users[0];
    } else if (this.state.auth.currentRole === 'mitra') {
      return this.getCurrentTenant();
    } else {
      return this.state.superAdmin;
    }
  }

  getCurrentTenant() {
    return this.state.tenants.find(t => t.id === this.state.auth.tenantId) || this.state.tenants[0];
  }

  // ==================== CART & MULTI-TENANT CHECKOUT ====================

  addToCart(productId, qty = 1) {
    const product = this.state.products.find(p => p.id === productId);
    if (!product || !product.isActive) {
      return { success: false, message: 'Produk tidak tersedia' };
    }

    const tenant = this.state.tenants.find(t => t.id === product.tenantId);
    const existingIndex = this.state.cart.findIndex(item => item.productId === productId);

    if (existingIndex > -1) {
      this.state.cart[existingIndex].qty += qty;
    } else {
      this.state.cart.push({
        productId: product.id,
        tenantId: product.tenantId,
        tenantName: tenant ? tenant.name : 'Mitra Bekal',
        name: product.name,
        price: product.price,
        image: product.image,
        qty: qty
      });
    }

    this.saveState();
    return { success: true, message: `"${product.name}" ditambahkan ke keranjang` };
  }

  updateCartQty(productId, qty) {
    if (qty <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const item = this.state.cart.find(i => i.productId === productId);
    if (item) {
      item.qty = qty;
      this.saveState();
    }
  }

  removeFromCart(productId) {
    this.state.cart = this.state.cart.filter(item => item.productId !== productId);
    this.saveState();
  }

  clearCart() {
    this.state.cart = [];
    this.saveState();
  }

  getCartBreakdown() {
    const cart = this.state.cart;
    if (!cart || cart.length === 0) {
      return {
        items: [],
        tenantGroups: [],
        totalItemsCount: 0,
        subtotalProducts: 0,
        serviceFee: 0,
        totalPay: 0,
        tenantCount: 0
      };
    }

    // Group items by tenant
    const grouped = {};
    let subtotalProducts = 0;
    let totalItemsCount = 0;

    cart.forEach(item => {
      subtotalProducts += (item.price * item.qty);
      totalItemsCount += item.qty;

      if (!grouped[item.tenantId]) {
        const tenant = this.state.tenants.find(t => t.id === item.tenantId);
        grouped[item.tenantId] = {
          tenantId: item.tenantId,
          tenantName: tenant ? tenant.name : item.tenantName,
          pickupPoint: tenant ? tenant.pickupPoint : 'Rak Grab & Go',
          location: tenant ? tenant.location : '',
          items: [],
          tenantSubtotal: 0
        };
      }
      grouped[item.tenantId].items.push(item);
      grouped[item.tenantId].tenantSubtotal += (item.price * item.qty);
    });

    const tenantGroups = Object.values(grouped);
    // Service fee is fixed Rp 1.000 per order session regardless of number of tenants
    const serviceFee = this.state.config.serviceFee;
    const totalPay = subtotalProducts + serviceFee;

    return {
      items: cart,
      tenantGroups,
      totalItemsCount,
      subtotalProducts,
      serviceFee,
      totalPay,
      tenantCount: tenantGroups.length
    };
  }

  checkoutOrder({ childName, childClass, targetDate, pickupTimeSlot, notes }) {
    // 1. Cut-off Validation
    if (this.state.systemClock.mode === 'post_cutoff') {
      return {
        success: false,
        message: 'Mohon maaf, pemesanan untuk esok hari sudah ditutup (Cut-Off pukul 21:00 WIB). Mitra sedang menyiapkan produksi.'
      };
    }

    const breakdown = this.getCartBreakdown();
    if (breakdown.totalItemsCount === 0) {
      return { success: false, message: 'Keranjang belanja masih kosong' };
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Silakan login terlebih dahulu' };
    }

    // 2. Wallet Balance Validation (Wajib Dompet Internal)
    if (currentUser.walletBalance < breakdown.totalPay) {
      const shortage = breakdown.totalPay - currentUser.walletBalance;
      return {
        success: false,
        shortage: shortage,
        message: `Saldo BekalPay tidak mencukupi (Kurang Rp ${shortage.toLocaleString('id-ID')}). Silakan lakukan Top-Up minimal Rp 50.000 terlebih dahulu.`
      };
    }

    // 3. Deduct Wallet Balance
    currentUser.walletBalance -= breakdown.totalPay;

    // 4. Generate Order ID
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const orderId = `ORD-${todayStr}-${randNum}`;

    // 5. Generate Multi-Tenant Sub-Orders
    const subOrders = breakdown.tenantGroups.map((group, idx) => {
      const tenant = this.state.tenants.find(t => t.id === group.tenantId);
      const commissionRate = tenant ? tenant.commissionRate : this.state.config.defaultCommissionRate;
      const commissionFee = Math.round(group.tenantSubtotal * (commissionRate / 100));
      const rackChar = String.fromCharCode(65 + (idx % 4)); // A, B, C, D
      const rackNum = Math.floor(1 + Math.random() * 12);
      const rackCode = `RAK-${rackChar}${rackNum < 10 ? '0' + rackNum : rackNum}`;

      return {
        id: `SUB-${randNum}-${String.fromCharCode(65 + idx)}`,
        tenantId: group.tenantId,
        tenantName: group.tenantName,
        pickupPoint: group.pickupPoint,
        rackNumber: rackCode,
        items: group.items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          qty: item.qty
        })),
        tenantSubtotal: group.tenantSubtotal,
        commissionFee: commissionFee,
        status: 'preparing' // Default status once accepted
      };
    });

    const newOrder = {
      id: orderId,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      childName: childName || currentUser.childName || 'Ananda',
      childClass: childClass || currentUser.childClass || 'Sekolah',
      targetDate: targetDate || 'Besok Pagi',
      pickupTimeSlot: pickupTimeSlot || '06:30 - 07:00',
      notes: notes || '-',
      totalProductPrice: breakdown.subtotalProducts,
      serviceFee: breakdown.serviceFee,
      totalPayment: breakdown.totalPay,
      paymentMethod: 'BekalPay Internal Wallet',
      status: 'preparing',
      createdAt: new Date().toISOString(),
      subOrders: subOrders
    };

    // 6. Record Wallet Transaction
    const walletTx = {
      id: `WTX-${Date.now().toString().slice(-6)}`,
      userId: currentUser.id,
      type: 'payment',
      amount: breakdown.totalPay,
      method: 'BekalPay',
      description: `Pembayaran Pre-Order ${orderId} (${breakdown.tenantCount} Mitra Gerai)`,
      timestamp: new Date().toISOString(),
      status: 'Success'
    };

    this.state.orders.unshift(newOrder);
    this.state.walletTransactions.unshift(walletTx);
    this.state.cart = [];

    this.saveState();
    return {
      success: true,
      order: newOrder,
      message: `Pesanan ${orderId} berhasil diproses! Tiket Grab & Go telah diterbitkan.`
    };
  }

  // ==================== WALLET OPERATIONS ====================

  topupWallet(amount, method = 'QRIS Instant') {
    const user = this.getCurrentUser();
    if (!user || this.state.auth.currentRole !== 'user') {
      return { success: false, message: 'Hanya akun Orang Tua yang dapat mengisi saldo BekalPay' };
    }

    if (amount < this.state.config.minTopup) {
      return {
        success: false,
        message: `Minimal Top-Up adalah Rp ${this.state.config.minTopup.toLocaleString('id-ID')} untuk efisiensi transaksi.`
      };
    }

    user.walletBalance = (user.walletBalance || 0) + Number(amount);

    const tx = {
      id: `WTX-${Date.now().toString().slice(-6)}`,
      userId: user.id,
      type: 'topup',
      amount: Number(amount),
      method: method,
      description: `Top-Up Saldo BekalPay via ${method}`,
      timestamp: new Date().toISOString(),
      status: 'Success'
    };

    this.state.walletTransactions.unshift(tx);
    this.saveState();

    return {
      success: true,
      newBalance: user.walletBalance,
      message: `Top-Up Rp ${Number(amount).toLocaleString('id-ID')} berhasil! Saldo sekarang Rp ${user.walletBalance.toLocaleString('id-ID')}`
    };
  }

  // ==================== TENANT (MITRA GERAI) OPERATIONS ====================

  updateSubOrderStatus(orderId, subOrderId, newStatus) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, message: 'Pesanan tidak ditemukan' };

    const subOrder = order.subOrders.find(s => s.id === subOrderId);
    if (!subOrder) return { success: false, message: 'Sub-order mitra tidak ditemukan' };

    subOrder.status = newStatus;

    // Check if all suborders are completed
    const allCompleted = order.subOrders.every(s => s.status === 'completed');
    const allReady = order.subOrders.every(s => s.status === 'ready_pickup' || s.status === 'completed');

    if (allCompleted) {
      order.status = 'completed';
    } else if (allReady) {
      order.status = 'ready_pickup';
    }

    this.saveState();
    return { success: true, message: `Status pesanan ${subOrderId} diubah menjadi "${newStatus}"` };
  }

  addProduct(productData) {
    const tenantId = productData.tenantId || this.state.auth.tenantId;
    const newId = `prd_${Date.now().toString().slice(-5)}`;

    const newProduct = {
      id: newId,
      tenantId: tenantId,
      name: productData.name,
      price: Number(productData.price),
      category: productData.category || 'Nasi & Lauk',
      image: productData.image || 'assets/nasi-kuning.jpg',
      description: productData.description || 'Menu sarapan sehat dan higienis',
      calories: productData.calories || '400 kkal',
      tags: productData.tags || ['Bergizi', 'Halal'],
      quotaDaily: Number(productData.quotaDaily) || 30,
      isActive: true
    };

    this.state.products.push(newProduct);
    this.saveState();
    return { success: true, product: newProduct, message: `Menu "${newProduct.name}" berhasil ditambahkan!` };
  }

  updateProduct(productId, updateData) {
    const idx = this.state.products.findIndex(p => p.id === productId);
    if (idx === -1) return { success: false, message: 'Produk tidak ditemukan' };

    this.state.products[idx] = {
      ...this.state.products[idx],
      ...updateData,
      price: Number(updateData.price || this.state.products[idx].price),
      quotaDaily: Number(updateData.quotaDaily || this.state.products[idx].quotaDaily)
    };

    this.saveState();
    return { success: true, message: 'Data produk berhasil diperbarui' };
  }

  deleteProduct(productId) {
    this.state.products = this.state.products.filter(p => p.id !== productId);
    this.saveState();
    return { success: true, message: 'Menu berhasil dihapus' };
  }

  // ==================== SUPER ADMIN OPERATIONS ====================
  // (Catatan User: Super Admin bisa menambahkan dan menghapus mitra gerai)

  addTenant(tenantData) {
    const newId = `tnt_${Date.now().toString().slice(-4)}`;
    const newTenant = {
      id: newId,
      name: tenantData.name.trim(),
      owner: tenantData.owner ? tenantData.owner.trim() : 'Pemilik Mitra',
      phone: tenantData.phone ? tenantData.phone.trim() : '0812-0000-0000',
      email: tenantData.email ? tenantData.email.trim() : `mitra.${newId}@bekalgo.id`,
      location: tenantData.location ? tenantData.location.trim() : 'Sidoarjo',
      route: tenantData.route ? tenantData.route.trim() : 'Rute Pucang - GOR Sidoarjo',
      routeBadge: tenantData.routeBadge ? tenantData.routeBadge.trim() : 'Mitra Baru',
      pickupPoint: tenantData.pickupPoint ? tenantData.pickupPoint.trim() : 'Rak Grab & Go - Depan Kasir',
      commissionRate: Number(tenantData.commissionRate) || this.state.config.defaultCommissionRate,
      rating: 5.0,
      totalOrdersHandled: 0,
      isActive: tenantData.isActive !== undefined ? tenantData.isActive : true,
      openTime: tenantData.openTime || '06:00 - 08:30 WIB',
      image: tenantData.image || 'assets/pickup-shelf.jpg',
      description: tenantData.description || 'Mitra penyedia makanan sarapan dan bekal sekolah bergizi terpercaya.',
      isVerified: true
    };

    this.state.tenants.push(newTenant);
    this.saveState();
    return {
      success: true,
      tenant: newTenant,
      message: `Mitra Gerai "${newTenant.name}" berhasil didaftarkan ke sistem!`
    };
  }

  deleteTenant(tenantId) {
    const tenant = this.state.tenants.find(t => t.id === tenantId);
    if (!tenant) {
      return { success: false, message: 'Mitra gerai tidak ditemukan' };
    }

    const tenantName = tenant.name;

    // 1. Remove tenant from tenant list
    this.state.tenants = this.state.tenants.filter(t => t.id !== tenantId);

    // 2. Remove associated products from active catalog
    this.state.products = this.state.products.filter(p => p.tenantId !== tenantId);

    // 3. Remove from cart if any items were added
    this.state.cart = this.state.cart.filter(item => item.tenantId !== tenantId);

    // 4. If current auth was this tenant, reset to first available tenant
    if (this.state.auth.tenantId === tenantId) {
      this.state.auth.tenantId = this.state.tenants[0]?.id || null;
    }

    this.saveState();
    return {
      success: true,
      message: `Mitra gerai "${tenantName}" beserta produknya telah berhasil dihapus dari sistem oleh Super Admin.`
    };
  }

  updateTenant(tenantId, updateData) {
    const idx = this.state.tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) return { success: false, message: 'Mitra gerai tidak ditemukan' };

    this.state.tenants[idx] = {
      ...this.state.tenants[idx],
      ...updateData,
      commissionRate: Number(updateData.commissionRate || this.state.tenants[idx].commissionRate)
    };

    this.saveState();
    return { success: true, message: `Data mitra "${this.state.tenants[idx].name}" berhasil diperbarui!` };
  }

  // ==================== SYSTEM CLOCK & CRON JOB SIMULATION ====================

  setSystemClockMode(mode) {
    // 'pre_cutoff' | 'post_cutoff' | 'morning_pickup'
    this.state.systemClock.mode = mode;
    if (mode === 'pre_cutoff') {
      this.state.systemClock.virtualTime = '16:30 WIB';
    } else if (mode === 'post_cutoff') {
      this.state.systemClock.virtualTime = '21:15 WIB (Cut-Off Aktif)';
    } else if (mode === 'morning_pickup') {
      this.state.systemClock.virtualTime = '06:45 WIB (Waktu Pick-up)';
    }
    this.saveState();
  }

  triggerCron21() {
    this.setSystemClockMode('post_cutoff');
    // Lock all pending cutoff orders to preparing
    let updatedCount = 0;
    this.state.orders.forEach(order => {
      if (order.status === 'pending_cutoff') {
        order.status = 'preparing';
        order.subOrders.forEach(s => s.status = 'preparing');
        updatedCount++;
      }
    });
    this.saveState();
    return {
      success: true,
      message: `Cron Job Pukul 21:00:00 WIB sukses dieksekusi! Pemesanan H-1 resmi ditutup dan rekap final otomatis didistribusikan ke seluruh mitra gerai.`
    };
  }

  resetAllData() {
    this.state = {
      ...JSON.parse(JSON.stringify(INITIAL_DATA)),
      auth: {
        currentRole: 'user',
        userId: 'usr_01',
        tenantId: 'tnt_01'
      },
      cart: [],
      systemClock: {
        mode: 'pre_cutoff',
        virtualTime: '16:30 WIB'
      }
    };
    this.saveState();
    return { success: true, message: 'Database demo berhasil di-reset ke kondisi awal!' };
  }
}

export const store = new Store();
window.bekalGoStore = store;
