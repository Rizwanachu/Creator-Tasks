import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import walletRouter from "./wallet";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";
import ratingsRouter from "./ratings";
import profilesRouter from "./profiles";
import statsRouter from "./stats";
import disputesRouter from "./disputes";
import referralsRouter from "./referrals";
import applicationsRouter from "./applications";
import userInvitesRouter from "./user-invites";
import bookmarksRouter from "./bookmarks";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(storageRouter);
router.use(notificationsRouter);
router.use(ratingsRouter);
router.use(profilesRouter);
router.use(disputesRouter);
router.use(referralsRouter);
router.use(applicationsRouter);
router.use(userInvitesRouter);
router.use(bookmarksRouter);
router.use(tasksRouter);
router.use(walletRouter);
router.use(dashboardRouter);

export default router;
