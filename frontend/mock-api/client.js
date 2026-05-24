/**
 * CampusFind API Client
 * Connects to the real Express backend
 */

const API_BASE_URL = 'http://localhost:3000/api';

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

// Helper function to handle fetch responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `API Error: ${response.status}`);
  }
  return response.json();
};

function dataURItoBlob(dataURI) {
  var byteString = atob(dataURI.split(',')[1]);
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], {type: mimeString});
}

// API Client functions
const api = {
  // ============ AUTH ============
  async login(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(res);
    
    currentUser = { id: String(data.id), name: data.name, email: data.email, trustScore: data.trustScore };
    authToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('auth_token', authToken);
    return currentUser;
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
    const queryParams = new URLSearchParams();
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.category && filters.category !== 'All') queryParams.append('category', filters.category);
    if (filters.search) queryParams.append('search', filters.search);
    
    const res = await fetch(`${API_BASE_URL}/items?${queryParams.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getLostItems() { 
    return this.getItems({ type: 'LOST' });
  },
  
  async getFoundItems() { 
    return this.getItems({ type: 'FOUND' });
  },

  async getPlatformStats() {
    const res = await fetch(`${API_BASE_URL}/items/stats`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getItemById(id) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createItem(data) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'imageUrl' && data[key]) {
        // Convert base64 dataURI to blob and append as 'image'
        const blob = dataURItoBlob(data[key]);
        formData.append('image', blob, 'upload.jpg');
      } else if (key === 'visualTags') {
        // We let the backend generate them now with Gemini, but we can pass existing ones too
      } else if (data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    // Make request WITHOUT setting Content-Type so the browser sets it to multipart/form-data with the correct boundary
    const headers = getHeaders();
    delete headers['Content-Type'];

    const res = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(res);
  },

  async updateItem(id, data) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteItem(id) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateItemStatus(id, status) {
    return this.updateItem(id, { status });
  },

  // ============ CLAIMS ============

  async createClaim(claimData) {
    const res = await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(claimData)
    });
    return handleResponse(res);
  },

  async getClaimsForItem(itemId) {
    const res = await fetch(`${API_BASE_URL}/claims/item/${itemId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getClaimsByUser(userId) {
    const res = await fetch(`${API_BASE_URL}/claims/user`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async approveClaim(claimId, reviewedBy, notes) {
    const res = await fetch(`${API_BASE_URL}/claims/${claimId}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ notes })
    });
    const data = await handleResponse(res);
    // Refresh user trust score in local storage (simplified)
    if (currentUser) {
      currentUser.trustScore += 5;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    return data;
  },

  async rejectClaim(claimId, reviewedBy, notes) {
    const res = await fetch(`${API_BASE_URL}/claims/${claimId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ notes })
    });
    return handleResponse(res);
  },

  // ============ CHAT MESSAGES ============

  async getMessages(claimId) {
    const res = await fetch(`${API_BASE_URL}/claims/${claimId}/messages`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async sendMessage(claimId, text, senderId) {
    const res = await fetch(`${API_BASE_URL}/claims/${claimId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    return handleResponse(res);
  },

  // ============ MATCHES ============
  async getMatchesForLostItem(lostItemId, threshold = 40) {
    const res = await fetch(
      `${API_BASE_URL}/items/${lostItemId}/matches?threshold=${threshold}`,
      { headers: getHeaders() }
    );
    const data = await handleResponse(res);
    return data.matches || [];
  },

  async getMatchesForFoundItem(foundItemId, threshold = 40) {
    const res = await fetch(
      `${API_BASE_URL}/items/${foundItemId}/matches?threshold=${threshold}`,
      { headers: getHeaders() }
    );
    const data = await handleResponse(res);
    return data.matches || [];
  },

  async getUnprocessedMatches() { return []; },

  // ============ HEALTH CHECK ============
  async healthCheck() {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
  }
};

// Compare MongoDB / API ids reliably
function sameId(a, b) {
  if (a == null || b == null) return false;
  const left = typeof a === 'object' ? (a.id || a._id || a) : a;
  const right = typeof b === 'object' ? (b.id || b._id || b) : b;
  return String(left) === String(right);
}

// Utility functions for formatting
const utils = {
  sameId,
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
  // Inject Login Modal HTML into the body
  const loginModalHTML = `
    <div class="modal-overlay" id="globalLoginModal" style="position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 9999 !important; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; pointer-events: none;">
      <div class="modal-card">
        <h3 class="modal-title">Welcome</h3>
        <p class="modal-desc">Sign in or create an account to securely report items and claim what you've lost. If you don't have an account, one will be created automatically.</p>
        <input type="email" id="loginEmail" class="form-input" placeholder="john_ug_24@cse.nits.ac.in" style="margin-bottom: 8px;">
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
             <button class="btn btn-accent" id="loginSubmitBtn">Login / Sign Up</button>
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
    setTimeout(() => {
      loginModal.style.opacity = '1'; 
      loginModal.style.pointerEvents = 'auto';
      loginEmailInput.focus(); 
    }, 10);
  };

  loginCancelBtn.onclick = (e) => { e.preventDefault(); closeLoginModal(); };
  
  loginSubmitBtn.onclick = async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    const pass = loginPassInput.value.trim();
    
    // Basic frontend validation
    const emailRegex = /^[a-zA-Z0-9._-]+_(ug|pg)_\d{2}@[a-zA-Z0-9-]+\.nits\.ac\.in$/i;
    if (!email || !emailRegex.test(email)) {
      alert("Please use your valid institute email format (e.g., john_ug_23@cse.nits.ac.in).");
      return;
    }
    if (!pass || pass.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    loginSubmitBtn.textContent = 'Verifying...';
    try {
      await api.login(email, pass);
      window.location.reload();
    } catch (err) {
      alert('Login failed: ' + err.message);
      loginSubmitBtn.textContent = 'Login / Sign Up';
    }
  };

  const loginBtns = document.querySelectorAll('.btn-login');
  loginBtns.forEach(btn => {
    btn.type = "button"; 
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
          const items = res.items.slice(0, 5); 

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
      }, 250); 
    });

    document.addEventListener('click', (e) => {
      if (!bar.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  });
});
