"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../server");
(0, vitest_1.describe)("API Integration Tests", () => {
    (0, vitest_1.it)("GET /health should return 200 and status ok", async () => {
        const response = await (0, supertest_1.default)(server_1.app).get("/health");
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toHaveProperty("status", "ok");
        (0, vitest_1.expect)(response.body).toHaveProperty("timestamp");
        (0, vitest_1.expect)(response.body).toHaveProperty("uptime");
    });
});
//# sourceMappingURL=api.test.js.map