import type { DiagnosticsData, ScanResult } from "@/context/ScanContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface ListingData {
  title: string;
  condition: string;
  description: string;
  price: number;
  shipping: string;
  tags: string[];
}

export async function identifyDevice(files: File[]): Promise<DiagnosticsData> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${API_BASE}/api/identify`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Identify failed: ${res.statusText}`);
  return res.json();
}

export async function analyzeDevice(
  diagnostics: DiagnosticsData,
  files: File[]
): Promise<ScanResult> {
  const form = new FormData();
  form.append("diagnostics", JSON.stringify(diagnostics));
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Analyze failed: ${res.statusText}`);
  const data = await res.json();
  if (data.comparables) {
    data.comparables = data.comparables.map((c: { imageUrl?: string }) => ({
      ...c,
      imageUrl: c.imageUrl ? `${API_BASE}/api/image-proxy?url=${encodeURIComponent(c.imageUrl)}` : "",
    }));
  }
  return { ...data, scannedAt: new Date(data.scannedAt) };
}

export async function generateListing(result: ScanResult): Promise<ListingData> {
  const form = new FormData();
  form.append("result", JSON.stringify(result));
  const res = await fetch(`${API_BASE}/api/listing`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Listing failed: ${res.statusText}`);
  return res.json();
}
