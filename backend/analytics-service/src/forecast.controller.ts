import { Request, Response, NextFunction } from "express";
import forecastService from "./forecast.service";
import { ForecastRequest } from "./forecast.types";

class ForecastController {
  // Generate forecast for a user
  async generateForecast(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user.sub; // Get user ID from JWT token
      const { months } = req.body;

      // Create forecast request
      const forecastRequest: ForecastRequest = {
        userId,
        months: months || 3,
      };

      // Generate forecast
      const forecast = await forecastService.generateForecast(
        forecastRequest.userId,
        forecastRequest.months,
      );

      res.status(200).json(forecast);
    } catch (error) {
      next(error);
    }
  }

  // Get forecasts by user ID
  async getForecastsByUserId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user.sub; // Get user ID from JWT token

      // Get forecasts by user ID
      const forecasts = await forecastService.getForecastsByUserId(userId);

      res.status(200).json(forecasts);
    } catch (error) {
      next(error);
    }
  }
}

export default new ForecastController();
