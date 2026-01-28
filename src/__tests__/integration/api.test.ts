import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "@/server";
import { prisma } from "@/core/db";
import { setupTestEnv, teardownTestEnv } from "@/__tests__/test-utils";

describe("API Endpoints", () => {
  beforeEach(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it("should return health check status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
