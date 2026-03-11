import { Router, type IRouter } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import sourcesRouter from "./sources";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use(sourcesRouter);

export default router;
