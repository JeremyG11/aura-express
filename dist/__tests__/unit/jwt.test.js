"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jwt_1 = require("../../utils/jwt");
(0, vitest_1.describe)("JWT Utility", () => {
    const secret = "test-secret";
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.stubEnv("JWT_SECRET", secret);
    });
    (0, vitest_1.it)("should sign and verify a JWT", () => {
        const payload = { userId: "123" };
        const token = (0, jwt_1.signJwt)(payload);
        (0, vitest_1.expect)(token).toBeDefined();
        const result = (0, jwt_1.verifyJwt)(token);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.decoded).toMatchObject(payload);
    });
    (0, vitest_1.it)("should return invalid for an incorrect token", () => {
        const result = (0, jwt_1.verifyJwt)("invalid-token");
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.decoded).toBeNull();
    });
});
//# sourceMappingURL=jwt.test.js.map