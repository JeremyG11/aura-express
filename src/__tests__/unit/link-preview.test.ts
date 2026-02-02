import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLinkPreview } from "@/controllers/link-preview";
import axios from "axios";
import { Request, Response } from "express";
import {
  setupTestEnv,
  createMockRes,
  mockAxiosSuccess,
  mockAxiosError,
  MOCK_PREVIEW_DATA,
  TEST_URL,
} from "@/__tests__/test-utils";

vi.mock("axios");
const mockedAxios = axios as any;

describe("Link Preview Controller", () => {
  let req: Partial<Request>;

  beforeEach(() => {
    vi.clearAllMocks();
    setupTestEnv();
    req = { query: { url: TEST_URL } };
  });

  it("should return 400 if URL is missing", async () => {
    const { res, status, json } = createMockRes();
    await getLinkPreview({ query: {} } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "URL is required",
    });
  });

  it("should return 500 if OPENGRAPH_IO_KEY is missing", async () => {
    delete process.env.OPENGRAPH_IO_KEY;
    const { res, status, json } = createMockRes();
    await getLinkPreview(req as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Link preview service is not configured.",
    });
  });

  it("should fetch metadata from OpenGraph.io and return mapped data", async () => {
    mockAxiosSuccess(mockedAxios);
    const { res, json } = createMockRes();

    await getLinkPreview(req as Request, res);

    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "Link preview fetched",
      data: {
        title: MOCK_PREVIEW_DATA.hybridGraph.title,
        description: MOCK_PREVIEW_DATA.hybridGraph.description,
        image: MOCK_PREVIEW_DATA.hybridGraph.image,
        favIcon: MOCK_PREVIEW_DATA.favicon,
        url: MOCK_PREVIEW_DATA.url,
      },
    });
  });

  it("should handle axios errors correctly", async () => {
    mockAxiosError(mockedAxios, 401, { error: { message: "Invalid API Key" } });
    const { res, status, json } = createMockRes();

    await getLinkPreview(req as Request, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid API Key",
    });
  });
});
