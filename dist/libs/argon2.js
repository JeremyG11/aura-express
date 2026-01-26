"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const argon2_1 = require("@node-rs/argon2");
const opts = {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
};
async function hashPassword(password) {
    const result = await (0, argon2_1.hash)(password, opts);
    return result;
}
async function verifyPassword(data) {
    const { password, hash: hashedPassword } = data;
    const result = await (0, argon2_1.verify)(hashedPassword, password, opts);
    return result;
}
//# sourceMappingURL=argon2.js.map