import { Router } from "express";
import * as controllers from "./controllers";

const router = Router();

router.get("/users/me", controllers.getCurrentUser);

export default router;
