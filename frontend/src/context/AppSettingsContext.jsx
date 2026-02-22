// @refresh reset
import { createContext, useContext, useState, useEffect } from 'react';
import { getPublicSettings } from '../services/api';
import { setAIEnabled } from '../utils/aiModels';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    aiModelsEnabled: true,
    importEnabled: true,
    loaded: false
  });

  const fetchSettings = async () => {
    try {
      const res = await getPublicSettings();
      const s = res.data;
      setSettings({
        maintenanceMode: s.maintenanceMode || false,
        aiModelsEnabled: s.aiModelsEnabled !== false,
        importEnabled: s.importEnabled !== false,
        loaded: true
      });
      // Synchronise le kill-switch global des modèles IA
      setAIEnabled(s.aiModelsEnabled !== false);
    } catch (err) {
      // En cas d'erreur, tout reste activé
      setSettings(prev => ({ ...prev, loaded: true }));
      setAIEnabled(true);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Permet de rafraîchir les settings (ex: après un toggle dans Settings page)
  const refreshSettings = () => fetchSettings();

  return (
    <AppSettingsContext.Provider value={{ ...settings, refreshSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppSettings() { return useContext(AppSettingsContext); }
