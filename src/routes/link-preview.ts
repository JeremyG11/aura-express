import { Router } from "express";
import { getLinkPreview } from "../controllers/link-preview-controller";

const router = Router();

router.get("/", getLinkPreview);

export default router;
