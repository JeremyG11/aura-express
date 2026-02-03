import { Router } from "express";
import { getServerMembers } from "@/controllers/member";

const router: Router = Router();

router.get("/server/:serverId", getServerMembers);

export default router;
