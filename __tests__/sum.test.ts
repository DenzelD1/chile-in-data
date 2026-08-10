import { describe, expect, it } from "vitest";

function sum(a: number, b: number): number {
  return a + b;
}

describe("sum", () => {
  it("suma dos números positivos", () => {
    expect(sum(1, 2)).toBe(3);
  });

  it("suma números negativos", () => {
    expect(sum(-1, -2)).toBe(-3);
  });
});