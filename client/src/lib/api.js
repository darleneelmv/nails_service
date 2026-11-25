const TOKEN_KEY = 'brillo_token';
const STUDIO_KEY = 'brillo_studio'; // superadmin: which studio they're "inside"

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* noop */ } },
};

export const session = {
  token: () => store.get(TOKEN_KEY),
  setToken: (t) => store.set(TOKEN_KEY, t),
  studio: () => store.get(STUDIO_KEY),
  setStudio: (id) => store.set(STUDIO_KEY, id),
  clear: () => { store.set(TOKEN_KEY, null); store.set(STUDIO_KEY, null); },
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = session.token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const s = session.studio();
  if (s) headers['X-Studio-Id'] = s;
  if (body && !form) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Error de conexión');
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { url } = await api('/upload', { method: 'POST', form: fd });
  return url;
}
