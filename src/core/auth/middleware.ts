import { Request, Response, NextFunction } from "express";
import { auth } from "@/core/auth/config";
import { fromNodeHeaders } from "better-auth/node";
import logger from "@/shared/core/logger";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (session) {
    res.locals.userId = session.user.id;
    res.locals.user = session.user;
    return next();
  }

  const internalSecret = req.headers["x-internal-secret"] as string;
  const bridgedUserId = req.headers["x-user-id"] as string;

  if (
    internalSecret &&
    internalSecret === process.env.SERVER_INTERNAL_SECRET &&
    bridgedUserId
  ) {
    res.locals.userId = bridgedUserId;
    return next();
  }

  if (process.env.NODE_ENV !== "production" && bridgedUserId) {
    logger.warn(
      "[Auth] WARNING: Using insecure fallback userId:",
      bridgedUserId,
    );
    res.locals.userId = bridgedUserId;
    return next();
  }

  logger.error("[Auth] Authentication FAILED for:", req.url);
  return res
    .status(401)
    .json({ error: "Unauthorized - No valid session or secure bridge found" });
};
