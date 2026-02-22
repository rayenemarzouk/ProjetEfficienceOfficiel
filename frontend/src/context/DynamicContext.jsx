import { createContext, useContext, useState, useCallback } from 'react';

const DynamicContext = createContext();

/**
 * Provider global pour le toggle dynamique.
 * isDynamic = true  → tous les effets streaming, compteurs animés, shimmer, etc. sont actifs
 * isDynamic = false → tout est statique, valeurs affichées instantanément
 * Persisté dans localStorage.
 */
export function DynamicProvider({ children }) {
  const [isDynamic, setIsDynamic] = useState(() => {
    const saved = localStorage.getItem('efficience-dynamic-mode');
    return saved !== null ? saved === 'true' : true; // actif par défaut
  });

  const toggleDynamic = useCallback(() => {
    setIsDynamic(prev => {
      const next = !prev;
      localStorage.setItem('efficience-dynamic-mode', String(next));
      return next;
    });
  }, []);

  return (
    <DynamicContext.Provider value={{ isDynamic, toggleDynamic }}>
      {children}
    </DynamicContext.Provider>
  );
}

export const useDynamic = () => useContext(DynamicContext);
