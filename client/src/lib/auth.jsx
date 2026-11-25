import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, session } from './api';
import { applyTheme } from './utils';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, studio: null });

  const refresh = useCallback(async () => {
    if (!session.token()) return setState({ loading: false, user: null, studio: null });
    try {
      const { user, studio } = await api('/me');
      if (studio) applyTheme(studio);
      setState({ loading: false, user, studio });
    } catch {
      session.clear();
      setState({ loading: false, user: null, studio: null });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { token } = await api('/auth/login', { method: 'POST', body: { email, password } });
    session.setToken(token);
    session.setStudio(null);
    await refresh();
    const { user } = await api('/me');
    return user;
  };
  const logout = () => { session.clear(); setState({ loading: false, user: null, studio: null }); };
  const enterStudio = async (id) => { session.setStudio(id ? String(id) : null); await refresh(); };

  return <AuthCtx.Provider value={{ ...state, login, logout, refresh, enterStudio }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
