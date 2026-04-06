import express from "express";
import forecastController from "./forecast.controller";

const router = express.Router();

router.post("/", forecastController.createForecast.bind(forecastController));
router.get("/:id", forecastController.getForecastById.bind(forecastController));
router.get(
  "/",
  forecastController.getForecastsByUserId.bind(forecastController),
);
router.put("/:id", forecastController.updateForecast.bind(forecastController));
router.delete(
  "/:id",
  forecastController.deleteForecast.bind(forecastController),
);

export default router;
