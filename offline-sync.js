/**
 * offline-sync.js — Offline Queue & Auto-Sync
 * Saves failed API submissions to localStorage, retries when online.
 */

const SYNC_QUEUE_KEY = 'starting_shift_offline_queue';

const OfflineSync = {
  // Get pending items
  getQueue() {
    try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); }
    catch { return []; }
  },

  // Save to queue
  addToQueue(item) {
    const queue = this.getQueue();
    item._queued_at = new Date().toISOString();
    item._id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    queue.push(item);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    this.updateBadge();
    return item._id;
  },

  // Remove from queue
  removeFromQueue(id) {
    const queue = this.getQueue().filter(q => q._id !== id);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    this.updateBadge();
  },

  // Clear all
  clearQueue() {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    this.updateBadge();
  },

  // Count pending
  pendingCount() {
    return this.getQueue().length;
  },

  // Sync all pending items
  async syncAll() {
    if (!navigator.onLine) return { synced: 0, failed: 0 };
    const queue = this.getQueue();
    if (!queue.length) return { synced: 0, failed: 0 };

    let synced = 0, failed = 0;
    const token = localStorage.getItem('fms_token');
    if (!token) return { synced: 0, failed: queue.length };

    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify(item.body),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.removeFromQueue(item._id);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    this.updateBadge();
    return { synced, failed };
  },

  // Update badge UI (if element exists)
  updateBadge() {
    const count = this.pendingCount();
    const badge = document.getElementById('offlineBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    const bar = document.getElementById('offlineBar');
    if (bar) {
      bar.style.display = count > 0 ? 'flex' : 'none';
      const txt = bar.querySelector('.ob-text');
      if (txt) txt.textContent = `${count} laporan tersimpan offline — menunggu koneksi`;
    }
  },

  // Show online/offline status
  updateStatus() {
    const el = document.getElementById('connStatus');
    if (!el) return;
    if (navigator.onLine) {
      el.innerHTML = '<span style="color:var(--success,#10B981)">● Online</span>';
    } else {
      el.innerHTML = '<span style="color:var(--danger,#EF4444)">● Offline</span>';
    }
  },

  // Initialize listeners
  init() {
    this.updateBadge();
    this.updateStatus();

    window.addEventListener('online', async () => {
      this.updateStatus();
      if (this.pendingCount() > 0) {
        const result = await this.syncAll();
        if (result.synced > 0) {
          this.showToast(`✅ ${result.synced} laporan berhasil disinkronkan!`);
        }
      }
    });

    window.addEventListener('offline', () => {
      this.updateStatus();
    });

    // Try sync on load if online
    if (navigator.onLine && this.pendingCount() > 0) {
      setTimeout(() => this.syncAll().then(r => {
        if (r.synced > 0) this.showToast(`✅ ${r.synced} laporan offline berhasil disinkronkan!`);
      }), 3000);
    }
  },

  // Simple toast notification
  showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1E293B;color:white;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3);animation:fadeIn .3s ease';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 4000);
  }
};
