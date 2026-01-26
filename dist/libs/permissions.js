"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roles = exports.ac = void 0;
const access_1 = require("better-auth/plugins/access");
const access_2 = require("better-auth/plugins/admin/access");
const statements = {
    ...access_2.defaultStatements,
    posts: ["create", "read", "update", "delete", "update:own", "delete:own"],
};
exports.ac = (0, access_1.createAccessControl)(statements);
exports.roles = {
    USER: exports.ac.newRole({
        posts: ["create", "read", "update:own", "delete:own"],
    }),
    ADMIN: exports.ac.newRole({
        posts: ["create", "read", "update", "delete", "update:own", "delete:own"],
        ...access_2.adminAc.statements,
    }),
};
//# sourceMappingURL=permissions.js.map