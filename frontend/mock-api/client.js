/**
 * CampusFind API Client
 * Handles all communication with the backend API
 */

const API_BASE_URL = '/api';

// Auth State
let authToken = null;
let currentUser = null;

try {
  authToken = localStorage.getItem('auth_token');
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser && storedUser !== 'undefined') {
    currentUser = JSON.parse(storedUser);
  }
} catch (e) {
  console.error("Local storage cleared due to parse error", e);
  localStorage.removeItem('currentUser');
}

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
};
// ============ OFFLINE DB MOCK ============
let localDB = JSON.parse(localStorage.getItem('CAMPUSFIND_DB_V4'));
if (!localDB) {
  localDB = {
    items: [],
    claims: [],
    messages: []
  };
  localStorage.setItem('CAMPUSFIND_DB_V4', JSON.stringify(localDB));
}
const saveDB = () => localStorage.setItem('CAMPUSFIND_DB_V4', JSON.stringify(localDB));

// API Client functions
const api = {
  // ============ AUTH (Mocked for now until backend is ready) ============
  async login(email, password) {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Init trust score for current mock user mapping to reputation system
        const generatedId = 'u-' + email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        currentUser = { id: generatedId, name: email.split('@')[0], email, trustScore: 95 };
        authToken = 'mock-jwt-token';
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('auth_token', authToken);
        resolve(currentUser);
      }, 500);
    });
  },

  logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
    window.location.reload();
  },

  getCurrentUser() {
    return currentUser;
  },
  // ============ ITEMS ============
  async getItems(filters = {}) {
    let result = [...localDB.items];
    if (filters.type) result = result.filter(i => i.type === filters.type);
    if (filters.status) result = result.filter(i => i.status === filters.status);
    if (filters.category && filters.category !== 'All') result = result.filter(i => i.category === filters.category);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(s) || 
        i.description.toLowerCase().includes(s) ||
        (i.visualTags && i.visualTags.some(t => t.toLowerCase().includes(s)))
      );
    }
    
    // sorting by newest
    result.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { items: result };
  },

  async getLostItems() { 
    const items = localDB.items.filter(i => i.type === 'LOST').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { items };
  },
  
  async getFoundItems() { 
    const items = localDB.items.filter(i => i.type === 'FOUND').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); 
    return { items };
  },

  async getItemById(id) {
    const item = localDB.items.find(i => i.id === id);
    if (!item) throw new Error('Item not found');
    return item;
  },

  async createItem(data) {
    const newItem = {
      ...data,
      id: `item-${Date.now()}`,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    localDB.items.push(newItem);
    saveDB();
    return newItem;
  },

  async updateItem(id, data) {
    const index = localDB.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Item not found');
    localDB.items[index] = { ...localDB.items[index], ...data };
    saveDB();
    return localDB.items[index];
  },

  async deleteItem(id) {
    localDB.items = localDB.items.filter(i => i.id !== id);
    saveDB();
  },

  async updateItemStatus(id, status) {
    const index = localDB.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Item not found');
    localDB.items[index].status = status;
    saveDB();
    return localDB.items[index];
  },

  // ============ CLAIMS ============

  async createClaim(claimData) {
    const newClaim = {
      ...claimData,
      id: `claim-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    localDB.claims.push(newClaim);

    const item = localDB.items.find(i => i.id === claimData.itemId);
    if (item && item.status === 'OPEN') {
      item.status = 'PENDING_CLAIM';
    }

    saveDB();
    return newClaim;
  },

  async getClaimsForItem(itemId) {
    return localDB.claims.filter(c => c.itemId === itemId);
  },

  async getClaimsByUser(userId) {
    return localDB.claims.filter(c => c.claimantId === userId);
  },

  async approveClaim(claimId, reviewedBy, notes) {
    const claim = localDB.claims.find(c => c.id === claimId);
    if (!claim) throw new Error("Claim not found");
    claim.status = 'APPROVED';
    claim.reviewedBy = reviewedBy;
    claim.verificationNotes = notes;

    // Logical Error Fix: Resolve the parent item automatically
    const item = localDB.items.find(i => i.id === claim.itemId);
    if (item) item.status = 'RESOLVED';

    // Update Trust Score logic
    if (currentUser && currentUser.id === reviewedBy) {
      currentUser.trustScore = (currentUser.trustScore || 95) + 5;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    saveDB();
    return claim;
  },

  async rejectClaim(claimId, reviewedBy, notes) {
    const claim = localDB.claims.find(c => c.id === claimId);
    if (!claim) throw new Error("Claim not found");
    claim.status = 'REJECTED';
    claim.reviewedBy = reviewedBy;
    claim.verificationNotes = notes;

    const item = localDB.items.find(i => i.id === claim.itemId);
    if (item && item.status === 'PENDING_CLAIM') {
       const otherPending = localDB.claims.some(c => c.itemId === claim.itemId && c.status === 'PENDING');
       if (!otherPending) {
          item.status = 'OPEN';
       }
    }

    saveDB();
    return claim;
  },

  // ============ CHAT MESSAGES ============

  async getMessages(claimId) {
    return (localDB.messages || [])
      .filter(m => m.claimId === claimId)
      .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  async sendMessage(claimId, text, senderId) {
    if (!localDB.messages) localDB.messages = [];
    const msg = {
      id: `msg-${Date.now()}`,
      claimId,
      senderId,
      text,
      createdAt: new Date().toISOString()
    };
    localDB.messages.push(msg);
    saveDB();
    return msg;
  },

  // ============ MATCHES ============
  
  // Intelligent cross-modal text and tag matching engine
  _scoreMatch(lost, found) {
    let score = 0;
    if (lost.category === found.category) score += 40;
    
    const lostWords = (lost.title + ' ' + (lost.description || '')).toLowerCase().split(/\W+/);
    const foundWords = (found.title + ' ' + (found.description || '')).toLowerCase().split(/\W+/);
    
    const lostTags = (lost.visualTags || []).map(t => t.toLowerCase());
    const foundTags = (found.visualTags || []).map(t => t.toLowerCase());

    let overlaps = 0;
    
    // Match text to text OR text to Vision AI Tags
    lostWords.forEach(w => {
      if (w.length > 3 && (foundWords.includes(w) || foundTags.some(t => t.includes(w)))) overlaps++;
    });

    // Match Vision AI tags to text
    lostTags.forEach(t => {
      if (t.length > 3 && foundWords.some(w => w.includes(t))) overlaps++;
    });

    // Match Vision AI tags directly to Vision AI tags
    lostTags.forEach(t => {
      if (foundTags.includes(t)) overlaps += 2; // Exact tag match is stronger
    });
    
    score += (overlaps * 20); // points per match
    return score;
  },

  async getMatchesForLostItem(lostItemId, threshold = 40) { 
    const lost = localDB.items.find(i => i.id === lostItemId);
    const candidates = localDB.items.filter(i => i.type === 'FOUND' && i.status === 'OPEN');
    let matches = [];
    if (lost) {
      matches = candidates.map(found => ({
         lostItemId: lost.id,
         foundItemId: found.id,
         foundItem: found,
         confidenceScore: this._scoreMatch(lost, found)
      })).filter(m => m.confidenceScore >= threshold);
    }
    return matches.sort((a,b) => b.confidenceScore - a.confidenceScore);
  },

  async getMatchesForFoundItem(foundItemId, threshold = 40) { 
    const found = localDB.items.find(i => i.id === foundItemId);
    const candidates = localDB.items.filter(i => i.type === 'LOST' && i.status === 'OPEN');
    let matches = [];
    if (found) {
      matches = candidates.map(lost => ({
         foundItemId: found.id,
         lostItemId: lost.id,
         lostItem: lost,
         confidenceScore: this._scoreMatch(lost, found)
      })).filter(m => m.confidenceScore >= threshold);
    }
    return matches.sort((a,b) => b.confidenceScore - a.confidenceScore);
  },

  async getUnprocessedMatches() { return []; },

  // ============ HEALTH CHECK ============
  async healthCheck() {
    return { status: "OK", source: "LOCAL_DB" };
  }
};

// Utility functions for formatting
const utils = {
  // Format date to relative time (e.g., "2 hours ago")
  formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // Format date for display
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  },

  // Generate item ID format (e.g., "Lost#2024")
  generateItemRef(type, year) {
    return `${type}#${year || new Date().getFullYear()}`;
  },

  // Escape HTML to prevent XSS
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Export for use in pages
window.api = api;
window.utils = utils;

// Shared UI Logic: Auth Modal & Navbar Update
document.addEventListener('DOMContentLoaded', () => {
  // Inject Login Modal HTML into the body with forced fixed inline styles to avoid inheritance bugs
  const loginModalHTML = `
    <div class="modal-overlay" id="globalLoginModal" style="position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 9999 !important; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; pointer-events: none;">
      <div class="modal-card">
        <h3 class="modal-title">Welcome Back</h3>
        <p class="modal-desc">Sign in to securely report items and claim what you've lost.</p>
        <input type="email" id="loginEmail" class="form-input" placeholder="student@nits.edu" style="margin-bottom: 8px;">
        <div style="position: relative; margin-bottom: 24px;">
          <input type="password" id="loginPass" class="form-input" placeholder="Password" style="width: 100%; padding-right: 40px; box-sizing: border-box;">
          <span id="togglePass" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-dim); display: flex; align-items: center;">
             <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </span>
        </div>
        <div class="modal-actions" style="justify-content: space-between; align-items: center;">
          <span style="font-size:11px; color:var(--text-dim); cursor:pointer;">Forgot Password?</span>
          <div>
             <button class="btn btn-solid" id="loginCancelBtn">Cancel</button>
             <button class="btn btn-accent" id="loginSubmitBtn">Sign In</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', loginModalHTML);

  const loginModal = document.getElementById('globalLoginModal');
  const loginCancelBtn = document.getElementById('loginCancelBtn');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const loginEmailInput = document.getElementById('loginEmail');
  const loginPassInput = document.getElementById('loginPass');
  const togglePass = document.getElementById('togglePass');

  if (togglePass) {
    togglePass.onclick = () => {
      if (loginPassInput.type === 'password') {
        loginPassInput.type = 'text';
        togglePass.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.974 9.974 0 012.356-3.626m3.04-2.043A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.02 10.02 0 01-1.748 3.125m-2.981-.663A3 3 0 0112.5 15.5m-3.95-3.95a3 3 0 014.24-4.24M3 3l18 18"/></svg>';
      } else {
        loginPassInput.type = 'password';
        togglePass.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
      }
    };
  }

  const closeLoginModal = () => { 
    loginModal.style.opacity = '0';
    loginModal.style.pointerEvents = 'none';
    setTimeout(() => { loginModal.style.display = 'none'; }, 200);
  };
  const openLoginModal = (e) => { 
    if (e) e.preventDefault();
    loginModal.style.display = 'flex';
    // Small timeout to allow display:flex to render before transitioning opacity
    setTimeout(() => {
      loginModal.style.opacity = '1'; 
      loginModal.style.pointerEvents = 'auto';
      loginEmailInput.focus(); 
    }, 10);
  };

  loginCancelBtn.onclick = (e) => { e.preventDefault(); closeLoginModal(); };
  
  loginSubmitBtn.onclick = (e) => {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    if (!email) {
      alert("Please enter a valid email.");
      return;
    }
    loginSubmitBtn.textContent = 'Verifying...';
    api.login(email, 'password').then(() => {
      window.location.reload();
    });
  };

  const loginBtns = document.querySelectorAll('.btn-login');
  loginBtns.forEach(btn => {
    btn.type = "button"; // Prevent any form submission jumping
    // If logged in, turn into user profile/logout
    if (api.getCurrentUser()) {
      const user = api.getCurrentUser();
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="white" stroke-width="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" stroke-width="1.6" stroke-linecap="round"/></svg><span>${user.name}</span>`;
      btn.onclick = (e) => {
        e.preventDefault();
        if(confirm('Do you want to logout?')) api.logout();
      };
    } else {
      btn.onclick = (e) => {
        openLoginModal(e);
      };
    }
  });

  // Search Autocomplete Logic
  const searchBars = document.querySelectorAll('.search-bar');
  searchBars.forEach(bar => {
    const input = bar.querySelector('input');
    if (!input) return;

    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    bar.appendChild(dropdown);

    let debounceTimer;

    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      
      if (!query) {
        dropdown.classList.remove('active');
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await api.getItems({ search: query });
          const items = res.items.slice(0, 5); // limit to top 5 hits

          if (items.length === 0) {
            dropdown.innerHTML = `<div class="search-dropdown-item"><span class="sd-meta" style="text-transform: none;">No results found for "${utils.escapeHTML(query)}"</span></div>`;
          } else {
            dropdown.innerHTML = items.map(item => `
              <div class="search-dropdown-item" onclick="window.location.href='item-detail.html?id=${item.id}'">
                <span class="sd-title">${utils.escapeHTML(item.title)}</span>
                <span class="sd-meta">${item.type === 'LOST' ? 'Lost' : 'Found'} &middot; ${utils.escapeHTML(item.category)} &middot; ${utils.escapeHTML(item.location)}</span>
              </div>
            `).join('');
          }
          dropdown.classList.add('active');
        } catch (err) {
          console.error("Search failed", err);
        }
      }, 250); // 250ms debounce
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!bar.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  });
});
