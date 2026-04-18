import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getApiBaseUrl } from "@/lib/config";

interface ConfigContextType {
  apiBaseUrl: string;
  isLoading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getApiBaseUrl().then((url) => {
      setApiBaseUrl(url);
      setIsLoading(false);
    });
  }, []);

  return (
    <ConfigContext.Provider value={{ apiBaseUrl, isLoading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
}
