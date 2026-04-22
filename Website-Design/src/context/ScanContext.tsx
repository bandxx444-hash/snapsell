import React, { createContext, useContext, useState, useCallback } from "react";
import type { ListingData } from "@/lib/api";

export type DeviceCondition = "Excellent" | "Good" | "Fair" | "Poor";
export type Decision = "sell" | "trade-in" | "donate";

export interface ComparableListing {
  title: string;
  soldPrice: number;
  condition: string;
  soldDate: string;
  variant: string;
  imageUrl?: string;
  ebayUrl: string;
}

export interface ScanResult {
  id: string;
  deviceName: string;
  brand: string;
  modelNumber: string;
  year: number;
  condition: DeviceCondition;
  conditionNotes: string;
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
  comparables: ComparableListing[];
  recommendation: Decision;
  recommendationReason: string;
  scannedAt: Date;
  decision: Decision;
  adjustedPrice: number;
  listing?: string;
}

export interface DiagnosticsData {
  productName: string;
  brand: string;
  modelNumber: string;
  yearOfPurchase: number;
  itemCondition: string;
  itemCategory: string;
  aiConfidence: Record<string, boolean>;
}

interface ScanContextType {
  files: File[];
  setFiles: (f: File[]) => void;
  diagnostics: DiagnosticsData;
  setDiagnostics: (d: DiagnosticsData) => void;
  result: ScanResult | null;
  setResult: (r: ScanResult | null) => void;
  listing: ListingData | null;
  setListing: (l: ListingData | null) => void;
  scanHistory: ScanResult[];
  addToHistory: (r: ScanResult) => void;
  clearHistory: () => void;
  resetScan: () => void;
}

const defaultDiagnostics: DiagnosticsData = {
  productName: "",
  brand: "",
  modelNumber: "",
  yearOfPurchase: new Date().getFullYear(),
  itemCondition: "",
  itemCategory: "",
  aiConfidence: {},
};

const ScanContext = createContext<ScanContextType | null>(null);

export const useScan = (): ScanContextType => {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used within ScanProvider");
  return ctx;
};

export const ScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData>(defaultDiagnostics);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>(() => {
    try {
      const saved = sessionStorage.getItem("snapsell_history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const addToHistory = useCallback((r: ScanResult) => {
    setScanHistory(prev => {
      const next = [r, ...prev];
      sessionStorage.setItem("snapsell_history", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
    sessionStorage.removeItem("snapsell_history");
  }, []);

  const resetScan = useCallback(() => {
    setFiles([]);
    setDiagnostics(defaultDiagnostics);
    setResult(null);
    setListing(null);
  }, []);

  return (
    <ScanContext.Provider value={{ files, setFiles, diagnostics, setDiagnostics, result, setResult, listing, setListing, scanHistory, addToHistory, clearHistory, resetScan }}>
      {children}
    </ScanContext.Provider>
  );
};
