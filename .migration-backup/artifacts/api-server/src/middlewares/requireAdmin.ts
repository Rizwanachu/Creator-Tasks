import { Request, Response, NextFunction } from "express";
import { isOwner } from "../lib/owner";

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const user = req.dbUser;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isOwner(user.email)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};
