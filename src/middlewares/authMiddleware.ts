import { Request, Response, NextFunction } from "express";
import { auth } from "../libs/auth";
import { fromNodeHeaders } from "better-auth/node";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  console.log("[Auth] Session result:", session ? "FOUND" : "NULL");
  if (session) {
    res.locals.userId = session.user.id;
    res.locals.user = session.user;
    return next();
  }

  const internalSecret = req.headers["x-internal-secret"] as string;
  const bridgedUserId = req.headers["x-user-id"] as string;

  console.log("[Auth] Bridged Auth Attempt:", {
    hasSecret: !!internalSecret,
    hasUserId: !!bridgedUserId,
    secretMatch: internalSecret === process.env.SERVER_INTERNAL_SECRET,
  });

  if (
    internalSecret &&
    internalSecret === process.env.SERVER_INTERNAL_SECRET &&
    bridgedUserId
  ) {
    res.locals.userId = bridgedUserId;
    return next();
  }

  // Temporary fallback for development if cookies/secrets are failing
  if (process.env.NODE_ENV !== "production" && bridgedUserId) {
    console.warn(
      "[Auth] WARNING: Using insecure fallback userId:",
      bridgedUserId,
    );
    res.locals.userId = bridgedUserId;
    return next();
  }

  console.error("[Auth] Authentication FAILED for:", req.url);
  return res
    .status(401)
    .json({ error: "Unauthorized - No valid session or secure bridge found" });
};
