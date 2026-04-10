import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import walletRouter from "./wallet";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(walletRouter);
router.use(dashboardRouter);

export default router;
