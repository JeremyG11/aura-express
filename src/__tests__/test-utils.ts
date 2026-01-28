import { vi } from "vitest";

export const TEST_USER_ID = "test-user-id";
export const TEST_OPENGRAPH_KEY = "test-key";
export const TEST_URL = "https://example.com";
export const TEST_INTERNAL_SECRET = "test-internal-secret";

export const MOCK_PREVIEW_DATA = {
  hybridGraph: {
    title: "Test Title",
    description: "Test Description",
    image: "https://example.com/image.jpg",
  },
  favicon: "https://example.com/favicon.ico",
  url: TEST_URL,
};

/**
 * Setup common environment variables for tests
 */
export const setupTestEnv = () => {
  process.env.OPENGRAPH_IO_KEY = TEST_OPENGRAPH_KEY;
  process.env.SERVER_INTERNAL_SECRET = TEST_INTERNAL_SECRET;
};

/**
 * Teardown test environment
 */
export const teardownTestEnv = () => {
  delete process.env.OPENGRAPH_IO_KEY;
  delete process.env.SERVER_INTERNAL_SECRET;
};

/**
 * Creates mock Express Request and Response objects
 */
export const createMockRes = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return {
    res: { status, json } as any,
    json,
    status,
  };
};

/**
 * Mock axios calls consistently
 */
export const mockAxiosSuccess = (
  mockedAxios: any,
  data: any = MOCK_PREVIEW_DATA,
) => {
  mockedAxios.get.mockResolvedValueOnce({ data });
};

export const mockAxiosError = (mockedAxios: any, status: number, data: any) => {
  mockedAxios.get.mockRejectedValueOnce({
    isAxiosError: true,
    response: { status, data },
  });
  mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);
};
