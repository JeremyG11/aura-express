"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const socket_1 = require("../libs/socket");
const message_1 = require("../controllers/message");
const validationMiddleware_1 = __importDefault(require("../middlewares/validationMiddleware"));
const message_schema_1 = require("../schemas/message.schema");
router.post("/channel", (0, validationMiddleware_1.default)(message_schema_1.createChannelMessageSchema), (req, res) => {
    (0, message_1.createChannelMessage)(socket_1.io, req, res);
});
router.post("/direct", (0, validationMiddleware_1.default)(message_schema_1.createDirectMessageSchema), (req, res) => {
    (0, message_1.createDirectMessage)(socket_1.io, req, res);
});
router.patch("/:messageId", (0, validationMiddleware_1.default)(message_schema_1.updateMessageSchema), (req, res) => {
    (0, message_1.updateMessage)(socket_1.io, req, res);
});
router.delete("/:messageId", (0, validationMiddleware_1.default)(message_schema_1.deleteMessageSchema), (req, res) => {
    (0, message_1.deleteMessage)(socket_1.io, req, res);
});
router.get("/conversation", message_1.getConversation);
router.get("/", (req, res) => {
    (0, message_1.getMessages)(socket_1.io, req, res);
});
exports.default = router;
//# sourceMappingURL=socket.js.map