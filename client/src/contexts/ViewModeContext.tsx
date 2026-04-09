import React, { createContext, useContext, useState, useEffect } from "react";

export type ViewMode = "mobile" | "desktop";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isForced: boolean; // true when user manually overrides
  actualDevice: "mobile" | "desktop";
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

function getActualDevice(): "mobile" | "desktop" {
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [actualDevice, setActualDevice] = useState<"mobile" | "desktop">(getActualDevice);
  const [forcedMode, setForcedMode] = useState<ViewMode | null>(() => {
    const stored = localStorage.getItem("forcedViewMode");
    return stored as ViewMode | null;
  });

  useEffect(() => {
    const handleResize = () => setActualDevice(getActualDevice());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const viewMode: ViewMode = forcedMode || actualDevice;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-view-mode", viewMode);
    if (viewMode === "mobile") {
      root.classList.add("view-mobile");
      root.classList.remove("view-desktop");
    } else {
      root.classList.add("view-desktop");
      root.classList.remove("view-mobile");
    }
  }, [viewMode]);

  const setViewMode = (mode: ViewMode) => {
    if (mode === actualDevice) {
      setForcedMode(null);
      localStorage.removeItem("forcedViewMode");
    } else {
      setForcedMode(mode);
      localStorage.setItem("forcedViewMode", mode);
    }
  };

  return (
    <ViewModeContext.Provider value={{
      viewMode,
      setViewMode,
      isForced: forcedMode !== null,
      actualDevice,
    }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used within ViewModeProvider");
  return ctx;
}
