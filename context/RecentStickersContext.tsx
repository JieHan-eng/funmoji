import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@funmoji/recent_stickers";
const MAX_RECENT = 24;

export interface RecentSticker {
  id: string;
  uri: string;
}

type RecentStickersContextValue = {
  recentStickers: RecentSticker[];
  addSticker: (uri: string) => Promise<RecentSticker>;
  loadStickers: () => Promise<void>;
};

const RecentStickersContext = createContext<RecentStickersContextValue | null>(null);

export function RecentStickersProvider({ children }: { children: React.ReactNode }) {
  const [recentStickers, setRecentStickers] = useState<RecentSticker[]>([]);
  const stickersRef = useRef<RecentSticker[]>([]);
  stickersRef.current = recentStickers;

  const loadStickers = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecentSticker[];
        setRecentStickers(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setRecentStickers([]);
    }
  }, []);

  useEffect(() => {
    loadStickers();
  }, [loadStickers]);

  const addSticker = useCallback(async (uri: string): Promise<RecentSticker> => {
    const id = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const sticker: RecentSticker = { id, uri };
    const next = [sticker, ...stickersRef.current.filter((s) => s.uri !== uri)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRecentStickers(next);
    return sticker;
  }, []);

  return (
    <RecentStickersContext.Provider value={{ recentStickers, addSticker, loadStickers }}>
      {children}
    </RecentStickersContext.Provider>
  );
}

export function useRecentStickers(): RecentStickersContextValue {
  const ctx = useContext(RecentStickersContext);
  if (!ctx) throw new Error("useRecentStickers must be used within RecentStickersProvider");
  return ctx;
}
