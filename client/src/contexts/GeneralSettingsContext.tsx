import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { baseURL } from '../utils/axios';
import axios from 'axios';

interface GeneralSettingsData {
  login_image: string | null;
  page_title: string | null;
  pwa_name: string | null;
  pwa_short_name: string | null;
  pwa_logo: string | null;
  pwa_theme_color: string | null;
  pwa_background_color: string | null;
}

interface GeneralSettingsContextType {
  settings: GeneralSettingsData;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: GeneralSettingsData = {
  login_image: null,
  page_title: 'Matrika CRM',
  pwa_name: 'Matrika',
  pwa_short_name: 'Matrika',
  pwa_logo: null,
  pwa_theme_color: '#0d0b12',
  pwa_background_color: '#0d0b12',
};

const GeneralSettingsContext = createContext<GeneralSettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
});

export const useGeneralSettings = () => useContext(GeneralSettingsContext);

function getSettingsImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const str = String(key).trim();
  if (!str) return null;
  if (str.startsWith('data:') || str.startsWith('blob:')) return str;
  if (str.startsWith('http://') || str.startsWith('https://')) {
    if (str.includes('.r2.cloudflarestorage.com')) {
      try {
        const parsed = new URL(str);
        const rawPath = decodeURIComponent(parsed.pathname);
        const k = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
        return `${baseURL}/image-proxy?key=${encodeURIComponent(k)}`;
      } catch { /* fallback */ }
    }
    return str;
  }
  return `${baseURL}/image-proxy?key=${encodeURIComponent(str)}`;
}

export function GeneralSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GeneralSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${baseURL}/generalsettings`);
      if (res.data?.data) {
        const raw = res.data.data;
        setSettings({
          login_image: getSettingsImageUrl(raw.login_image),
          page_title: raw.page_title && /^Matrika\b/i.test(raw.page_title) ? raw.page_title : defaultSettings.page_title,
          pwa_name: raw.pwa_name || defaultSettings.pwa_name,
          pwa_short_name: raw.pwa_short_name || defaultSettings.pwa_short_name,
          pwa_logo: getSettingsImageUrl(raw.pwa_logo),
          pwa_theme_color: raw.pwa_theme_color || defaultSettings.pwa_theme_color,
          pwa_background_color: raw.pwa_background_color || defaultSettings.pwa_background_color,
        });
      }
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Apply page title
  useEffect(() => {
    if (settings.page_title) {
      document.title = settings.page_title;
    }
  }, [settings.page_title]);

  // Apply PWA manifest theme color dynamically
  useEffect(() => {
    if (settings.pwa_theme_color) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', settings.pwa_theme_color);
    }
  }, [settings.pwa_theme_color]);

  return (
    <GeneralSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </GeneralSettingsContext.Provider>
  );
}

