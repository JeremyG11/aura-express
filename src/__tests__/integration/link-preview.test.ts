import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "@/server";
import axios from "axios";
import {
  setupTestEnv,
  mockAxiosSuccess,
  TEST_INTERNAL_SECRET,
  TEST_USER_ID,
  TEST_URL,
  MOCK_PREVIEW_DATA,
} from "@/__tests__/test-utils";

vi.mock("axios");
const mockedAxios = axios as any;

describe("Link Preview Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestEnv();
  });

  const authenticatedRequest = () =>
    request(app)
      .get("/api/link-preview")
      .set("x-internal-secret", TEST_INTERNAL_SECRET)
      .set("x-user-id", TEST_USER_ID);

  it("should return 401 without auth headers", async () => {
    const response = await request(app)
      .get("/api/link-preview")
      .query({ url: TEST_URL });
    expect(response.status).toBe(401);
  });

  it("should return 200 with valid auth and mock data", async () => {
    mockAxiosSuccess(mockedAxios);
    const response = await authenticatedRequest().query({ url: TEST_URL });

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe(MOCK_PREVIEW_DATA.hybridGraph.title);
  });

  it("should return 400 for invalid URL query", async () => {
    const response = await authenticatedRequest().query({ url: "" });
    expect(response.status).toBe(400);
  });
});
