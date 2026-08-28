import { Router, type IRouter } from "express";
import healthRouter from "./health";
import healthChatRouter from "./health-chat";
import healthInsightsRouter from "./health-insights";
import visionAnalysisRouter from "./vision-analysis";
import medicalCopilotRouter from "./medical-copilot";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(healthChatRouter);
router.use(healthInsightsRouter);
router.use(visionAnalysisRouter);
router.use(medicalCopilotRouter);

export default router;
