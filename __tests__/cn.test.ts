import { describe, expect, it } from "vitest";

import { cn } from "@/lib/cn";

describe("cn", () => {
  it("une clases válidas y descarta los valores falsy", () => {
    expect(cn("a", null, false, "b", undefined, "", 0)).toBe("a b");
  });

  it("devuelve una cadena vacía cuando no hay clases", () => {
    expect(cn(null, undefined, false)).toBe("");
  });
});