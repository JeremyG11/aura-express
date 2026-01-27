import { Request, Response } from "express";
import axios from "axios";
import logger from "../libs/logger";

export const getLinkPreview = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const apiKey = process.env.OPENGRAPH_IO_KEY;

    if (!apiKey) {
      logger.error(
        "[LinkPreview] OPENGRAPH_IO_KEY is missing in environment variables.",
      );
      return res
        .status(500)
        .json({ error: "Link preview service is not configured." });
    }

    logger.info(`[LinkPreview] Fetching from OpenGraph.io for: ${url}`);

    const opengraphUrl = `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=${apiKey}`;

    const response = await axios.get(opengraphUrl, { timeout: 10000 });
    const data = response.data;

    if (data.error) {
      logger.error(`[OpenGraph.io] Error: ${data.error.message}`);
      return res.status(400).json({ error: data.error.message });
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

    return res.json({
      title:
        hybrid.title || openGraph.title || htmlInferred.title || fallbackTitle,
      description:
        hybrid.description ||
        openGraph.description ||
        htmlInferred.description ||
        "",
      image: hybrid.image || openGraph.image || htmlInferred.image || null,
      favIcon: data.favicon || null,
      url: data.url || url,
    });
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(
        `[LinkPreview] OpenGraph.io returned ${error.response.status}: ${JSON.stringify(error.response.data)}`,
      );
      return res.status(error.response.status).json({
        error: error.response.data.error?.message || "External service error",
      });
    }

    logger.error(`[LinkPreview] Unexpected Error: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch link preview" });
  }
};
