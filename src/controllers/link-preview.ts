import { Request, Response } from "express";
import axios from "axios";
import logger from "@/core/logger";
import { ApiResponse } from "@/utils/api-response";

export const getLinkPreview = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return ApiResponse.error(res, "URL is required", 400);
    }

    const apiKey = process.env.OPENGRAPH_IO_KEY;

    if (!apiKey) {
      logger.error(
        "[LinkPreview] OPENGRAPH_IO_KEY is missing in environment variables.",
      );
      return ApiResponse.error(
        res,
        "Link preview service is not configured.",
        500,
      );
    }

    logger.info(`[LinkPreview] Fetching from OpenGraph.io for: ${url}`);

    const opengraphUrl = `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=${apiKey}`;

    const response = await axios.get(opengraphUrl, { timeout: 10000 });
    const data = response.data;

    if (data.error) {
      logger.error(`[OpenGraph.io] Error: ${data.error.message}`);
      return ApiResponse.error(res, data.error.message, 400);
    }

    // Transform OpenGraph.io response to our simplified format
    const hybrid = data.hybridGraph || {};
    const openGraph = data.openGraph || {};
    const htmlInferred = data.htmlInferred || {};

    let fallbackTitle = url;
    try {
      fallbackTitle = new URL(url).hostname;
    } catch (e) {
      // Ignore
    }

    return ApiResponse.success(
      res,
      {
        title:
          hybrid.title ||
          openGraph.title ||
          htmlInferred.title ||
          fallbackTitle,
        description:
          hybrid.description ||
          openGraph.description ||
          htmlInferred.description ||
          "",
        image: hybrid.image || openGraph.image || htmlInferred.image || null,
        favIcon: data.favicon || null,
        url: data.url || url,
      },
      "Link preview fetched",
    );
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(
        `[LinkPreview] OpenGraph.io returned ${error.response.status}: ${JSON.stringify(error.response.data)}`,
      );
      return ApiResponse.error(
        res,
        error.response.data.error?.message || "External service error",
        error.response.status,
      );
    }

    logger.error(`[LinkPreview] Unexpected Error: ${error.message}`);
    return ApiResponse.error(res, "Failed to fetch link preview");
  }
};
