import { AnyZodObject } from "zod";
import { Request, Response, NextFunction } from "express";
import logger from "@/shared/core/logger";

const validator =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err: any) {
      logger.error("[ValidationMiddleware] Validation error:", err);
      return res.status(400).send(err.errors);
    }
  };

export default validator;
