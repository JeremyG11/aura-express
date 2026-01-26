"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validator = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    }
    catch (err) {
        console.log(err);
        return res.status(400).send(err.errors);
    }
};
exports.default = validator;
//# sourceMappingURL=validationMiddleware.js.map