import { describe, it, expect, vi, beforeEach } from "vitest";
import { signJwt, verifyJwt } from "@/shared/utils/jwt";

describe("JWT Utility", () => {
  const secret = "test-secret";

  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", secret);
  });

  it("should sign and verify a JWT", () => {
    const payload = { userId: "123" };
    const token = signJwt(payload);

    expect(token).toBeDefined();

    const result = verifyJwt(token);
    expect(result.valid).toBe(true);
    expect(result.decoded).toMatchObject(payload);
  });

  it("should return invalid for an incorrect token", () => {
    const result = verifyJwt("invalid-token");
    expect(result.valid).toBe(false);
    expect(result.decoded).toBeNull();
  });
});
