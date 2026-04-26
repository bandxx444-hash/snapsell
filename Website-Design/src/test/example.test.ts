import { describe, it, expect } from "vitest";
import { simulateAIDiagnostics, simulateAIAnalysis, getRandomFact } from "@/lib/mock-ai";

describe("mock AI flow", () => {
  it("pre-fills category and condition on diagnostics", () => {
    const diagnostics = simulateAIDiagnostics();

    expect(diagnostics.itemCategory).toBe("Electronics");
    expect(diagnostics.itemCondition).toBe("Good");
    expect(diagnostics.aiConfidence.itemCategory).toBe(true);
    expect(diagnostics.aiConfidence.itemCondition).toBe(true);
  });

  it("uses confirmed diagnostics when creating analysis", () => {
    const diagnostics = simulateAIDiagnostics();
    const analysis = simulateAIAnalysis(diagnostics);

    expect(analysis.brand).toBe(diagnostics.brand);
    expect(analysis.modelNumber).toBe(diagnostics.modelNumber);
    expect(analysis.estimatedValue).toBeGreaterThan(0);
    expect(analysis.comparables.length).toBeGreaterThan(0);
  });

  it("returns a user-facing resale tip", () => {
    expect(getRandomFact().length).toBeGreaterThan(20);
  });
});
