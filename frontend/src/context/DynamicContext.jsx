// @refresh reset
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPublicSettings } from '../services/api';

const DynamicContext = createContext();

/**
 * Provider global pour le toggle dynamique.
 * isDynamic = true  → tous les effets streaming, compteurs animés, shimmer, etc. sont actifs
 * isDynamic = false → tout est statique, valeurs affichées instantanément
 * Contrôlé par le toggle "Modèles IA" dans les réglages admin (avec vérification email).
 * Le mode dynamique expire après 15 jours et doit être renouvelé avec un code.
 */
export function DynamicProvider({ children }) {
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicExpiresAt, setDynamicExpiresAt] = useState(null);
  const [dataAccessEnabled, setDataAccessEnabled] = useState(true); // aiModelsEnabled from server

  // Charger l'état depuis le serveur
  const refreshDynamic = useCallback(async () => {
    try {
      const res = await getPublicSettings();
      const active = res.data.dynamicActive === true;
      setIsDynamic(active);
      setDynamicExpiresAt(res.data.dynamicExpiresAt || null);
      setDataAccessEnabled(res.data.aiModelsEnabled !== false);
      localStorage.setItem('efficience-dynamic-mode', String(active));
    } catch {
      // En cas d'erreur, garder l'état actuel
    }
  }, []);

  useEffect(() => {
    refreshDynamic();
  }, [refreshDynamic]);

  const setDynamic = useCallback((val) => {
    setIsDynamic(val);
    localStorage.setItem('efficience-dynamic-mode', String(val));
  }, []);

  return (
    <DynamicContext.Provider value={{ isDynamic, dynamicExpiresAt, dataAccessEnabled, setDynamic, refreshDynamic }}>
      {children}
    </DynamicContext.Provider>
  );
}

export const useDynamic = () => useContext(DynamicContext);
