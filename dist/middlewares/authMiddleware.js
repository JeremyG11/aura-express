"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const auth_1 = require("../libs/auth");
const node_1 = require("better-auth/node");
const authMiddleware = async (req, res, next) => {
    const session = await auth_1.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
    });
    console.log("[Auth] Session result:", session ? "FOUND" : "NULL");
    if (session) {
        res.locals.userId = session.user.id;
        res.locals.user = session.user;
        return next();
    }
    const internalSecret = req.headers["x-internal-secret"];
    const bridgedUserId = req.headers["x-user-id"];
    console.log("[Auth] Bridged Auth Attempt:", {
        hasSecret: !!internalSecret,
        hasUserId: !!bridgedUserId,
        secretMatch: internalSecret === process.env.SERVER_INTERNAL_SECRET,
    });
    if (internalSecret &&
        internalSecret === process.env.SERVER_INTERNAL_SECRET &&
        bridgedUserId) {
        res.locals.userId = bridgedUserId;
        return next();
    }
    // Temporary fallback for development if cookies/secrets are failing
    if (process.env.NODE_ENV !== "production" && bridgedUserId) {
        console.warn("[Auth] WARNING: Using insecure fallback userId:", bridgedUserId);
        res.locals.userId = bridgedUserId;
        return next();
    }
    console.error("[Auth] Authentication FAILED for:", req.url);
    return res
        .status(401)
        .json({ error: "Unauthorized - No valid session or secure bridge found" });
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=authMiddleware.js.map