"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUserSchema = exports.signupUserSchema = void 0;
const zod_1 = require("zod");
/*
  validating the user sign up fields
  on server side
*/
exports.signupUserSchema = (0, zod_1.object)({
    body: (0, zod_1.object)({
        name: (0, zod_1.string)({
            required_error: "User name field is required",
        }),
        email: (0, zod_1.string)({
            required_error: "User email field is required",
        }).email("Invalid email"),
        password: (0, zod_1.string)({
            required_error: "User password field is required",
        }).min(8, "Password is too short! It should be atleast 8 characters"),
        imageUrl: (0, zod_1.string)().optional(),
    }),
});
/*
  validating the user sign in fields
  on server side
*/
exports.loginUserSchema = (0, zod_1.object)({
    body: (0, zod_1.object)({
        email: (0, zod_1.string)({
            required_error: "User email field is required",
        }).email("Invalid email"),
        password: (0, zod_1.string)({
            required_error: "User password field is required",
        }),
    }),
});
//# sourceMappingURL=user.schema.js.map