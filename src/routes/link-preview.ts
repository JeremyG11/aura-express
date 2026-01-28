import { Router } from "express";
import { getLinkPreview } from "@/controllers/link-preview";

const router: Router = Router();

router.get("/", getLinkPreview);

export default router;
