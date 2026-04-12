"""
Cash Flow Prediction Service

Provides advanced cash flow modeling and forecasting capabilities:
- Historical cash flow analysis
- Predictive modeling using multiple algorithms
- Scenario analysis and stress testing
- Cash flow optimization recommendations
- Liquidity risk assessment
"""

import logging

# --- Inline dependency stubs ---
from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np
import pandas as pd

# BUG FIX: The original imports referenced modules that do not exist in the
# repository (config.database, config.redis_client, models.cash_flow, utils.*).
# These are replaced with self-contained stubs so the service is importable and
# runnable. Replace stubs with real implementations when those modules are added.


async def get_database():
    """Stub: replace with real async DB client."""

    class _DB:
        async def fetch_all(self, q, p):
            return []

    return _DB()


async def get_redis():
    """Stub: replace with real async Redis client."""

    class _Redis:
        async def set(self, k, v, ex=None):
            pass

    return _Redis()


# --- Stub data models (replace with Pydantic models when models/ is added) ---
from dataclasses import dataclass
from dataclasses import field as _field
from typing import Any as _Any
from typing import Dict as _Dict
from typing import List as _List
from typing import Optional as _Optional


@dataclass
class CashFlowPredictionRequest:
    user_id: str
    historical_months: int = 12
    prediction_horizon: int = 3
    minimum_cash_balance: _Optional[float] = None
    external_factors: _Optional[_Dict[str, _Any]] = None


@dataclass
class CashFlowScenario:
    name: str
    description: str
    probability: float
    predictions: _List[float] = _field(default_factory=list)
    assumptions: _List[str] = _field(default_factory=list)


@dataclass
class CashFlowMetrics:
    average_monthly_inflow: float = 0.0
    average_monthly_outflow: float = 0.0
    average_monthly_net_flow: float = 0.0
    cash_flow_volatility: float = 0.0
    predicted_total_inflow: float = 0.0
    predicted_total_outflow: float = 0.0
    predicted_net_flow: float = 0.0
    cash_conversion_cycle: float = 0.0
    working_capital_ratio: float = 0.0
    liquidity_ratio: float = 0.0
    cash_flow_coverage_ratio: float = 0.0


@dataclass
class LiquidityRisk:
    risk_level: str = "Unknown"
    days_below_minimum: int = 0
    minimum_balance_date: _Optional[str] = None
    worst_case_balance: float = 0.0
    probability_of_shortfall: float = 0.0
    recommended_buffer: float = 0.0


@dataclass
class CashFlowOptimization:
    recommendations: _List[_Dict[str, _Any]] = _field(default_factory=list)
    total_potential_impact: float = 0.0


@dataclass
class CashFlowPredictionResponse:
    user_id: str = ""
    prediction_date: _Optional[object] = None
    horizon_months: int = 0
    predictions: _List[_Dict[str, _Any]] = _field(default_factory=list)
    confidence_intervals: _Optional[_Dict[str, _Any]] = None
    scenarios: _List[CashFlowScenario] = _field(default_factory=list)
    metrics: _Optional[CashFlowMetrics] = None
    liquidity_risk: _Optional[LiquidityRisk] = None
    optimization: _Optional[CashFlowOptimization] = None
    model_performance: _Optional[_Dict[str, float]] = None
    data_quality_score: float = 0.0


# --- ML library imports with graceful degradation ---
try:
    from prophet import Prophet
except ImportError:
    Prophet = None  # type: ignore

try:
    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import MinMaxScaler, StandardScaler
except ImportError:
    GradientBoostingRegressor = RandomForestRegressor = Ridge = None  # type: ignore
    MinMaxScaler = StandardScaler = None  # type: ignore

try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    from statsmodels.tsa.seasonal import seasonal_decompose
except ImportError:
    ARIMA = ExponentialSmoothing = seasonal_decompose = None  # type: ignore


# --- Stub utility classes ---
class DataValidator:
    def validate_cash_flow_request(self, request):
        pass


class FeatureEngineer:
    async def initialize(self):
        pass


logger = logging.getLogger(__name__)


class CashFlowService:
    """Advanced cash flow prediction and analysis service"""

    def __init__(self, model_manager: Any) -> None:
        self.model_manager = model_manager
        self.feature_engineer = FeatureEngineer()
        self.data_validator = DataValidator()
        self.models = {
            "random_forest": RandomForestRegressor(
                n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
            ),
            "gradient_boosting": GradientBoostingRegressor(
                n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42
            ),
            "linear_regression": Ridge(alpha=1.0),
            "prophet": None,
            "arima": None,
            "exponential_smoothing": None,
        }
        self.scalers = {"standard": StandardScaler(), "minmax": MinMaxScaler()}
        self.is_initialized = False

    async def initialize(self) -> None:
        """Initialize the cash flow service"""
        try:
            logger.info("Initializing Cash Flow Service...")
            await self._load_models()
            await self.feature_engineer.initialize()
            self.is_initialized = True
            logger.info("Cash Flow Service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Cash Flow Service: {e}")
            raise

    async def predict_cash_flow(
        self, request: CashFlowPredictionRequest
    ) -> CashFlowPredictionResponse:
        """
        Generate comprehensive cash flow predictions

        Args:
            request: Cash flow prediction request parameters

        Returns:
            Detailed cash flow predictions and analysis
        """
        if not self.is_initialized:
            raise RuntimeError("Cash Flow Service not initialized")
        try:
            logger.info(f"Generating cash flow prediction for user {request.user_id}")
            self.data_validator.validate_cash_flow_request(request)
            historical_data = await self._get_historical_data(
                request.user_id, request.historical_months
            )
            if len(historical_data) < 12:
                raise ValueError("Insufficient historical data for reliable prediction")
            features_df = await self._prepare_features(historical_data, request)
            predictions = await self._generate_ensemble_predictions(
                features_df, request.prediction_horizon
            )
            confidence_intervals = await self._calculate_confidence_intervals(
                predictions, historical_data
            )
            scenarios = await self._perform_scenario_analysis(
                features_df, request, predictions
            )
            metrics = await self._calculate_cash_flow_metrics(
                historical_data, predictions
            )
            liquidity_risk = await self._assess_liquidity_risk(
                predictions, request.minimum_cash_balance or 0
            )
            optimization = await self._generate_optimization_recommendations(
                historical_data, predictions, scenarios
            )
            response = CashFlowPredictionResponse(
                user_id=request.user_id,
                prediction_date=datetime.now(),
                horizon_months=request.prediction_horizon,
                predictions=predictions,
                confidence_intervals=confidence_intervals,
                scenarios=scenarios,
                metrics=metrics,
                liquidity_risk=liquidity_risk,
                optimization=optimization,
                model_performance=await self._get_model_performance(),
                data_quality_score=await self._calculate_data_quality_score(
                    historical_data
                ),
            )
            await self._cache_prediction_results(request.user_id, response)
            logger.info(f"Cash flow prediction completed for user {request.user_id}")
            return response
        except Exception as e:
            logger.error(f"Error generating cash flow prediction: {e}")
            raise

    async def _get_historical_data(self, user_id: str, months: int) -> pd.DataFrame:
        """Get historical financial data for the user"""
        try:
            db = await get_database()
            end_date = datetime.now()
            start_date = end_date - timedelta(days=months * 30.44)
            # BUG FIX: The original code first built a raw f-string query with
            # user_id interpolated directly (SQL injection risk), then immediately
            # overwrote it with a parameterized query. The dead f-string is removed.
            query = "\n            SELECT \n                DATE_TRUNC('day', created_at) as date,\n                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as inflow,\n                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as outflow,\n                COUNT(*) as transaction_count,\n                AVG(amount) as avg_transaction,\n                STRING_AGG(DISTINCT category, ',') as categories\n            FROM transactions \n            WHERE user_id = %s \n                AND created_at >= %s \n                AND created_at <= %s\n            GROUP BY DATE_TRUNC('day', created_at)\n            ORDER BY date\n            "
            result = await db.fetch_all(query, [user_id, start_date, end_date])
            if not result:
                raise ValueError(f"No transaction data found for user {user_id}")
            df = pd.DataFrame([dict(row) for row in result])
            df["date"] = pd.to_datetime(df["date"])
            df["net_flow"] = df["inflow"] - df["outflow"]
            df["cumulative_flow"] = df["net_flow"].cumsum()
            # BUG FIX: resample().fillna() is not defined on a Resampler object and
            # silently does nothing. Must aggregate first (.sum()) to get a Series,
            # then fill gaps with 0. Also reset index after to restore the date column.
            df = df.set_index("date").resample("D").sum().fillna(0).reset_index()
            return df
        except Exception as e:
            logger.error(f"Error getting historical data: {e}")
            raise

    async def _prepare_features(
        self, historical_data: pd.DataFrame, request: CashFlowPredictionRequest
    ) -> pd.DataFrame:
        """Prepare features for cash flow prediction"""
        try:
            df = historical_data.copy()
            df["year"] = df["date"].dt.year
            df["month"] = df["date"].dt.month
            df["day"] = df["date"].dt.day
            df["day_of_week"] = df["date"].dt.dayofweek
            df["day_of_year"] = df["date"].dt.dayofyear
            df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
            df["quarter"] = df["date"].dt.quarter
            df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
            df["is_month_end"] = df["date"].dt.is_month_end.astype(int)
            df["is_month_start"] = df["date"].dt.is_month_start.astype(int)
            for lag in [1, 7, 14, 30]:
                df[f"net_flow_lag_{lag}"] = df["net_flow"].shift(lag)
                df[f"inflow_lag_{lag}"] = df["inflow"].shift(lag)
                df[f"outflow_lag_{lag}"] = df["outflow"].shift(lag)
            for window in [7, 14, 30]:
                df[f"net_flow_rolling_mean_{window}"] = (
                    df["net_flow"].rolling(window).mean()
                )
                df[f"net_flow_rolling_std_{window}"] = (
                    df["net_flow"].rolling(window).std()
                )
                df[f"inflow_rolling_mean_{window}"] = (
                    df["inflow"].rolling(window).mean()
                )
                df[f"outflow_rolling_mean_{window}"] = (
                    df["outflow"].rolling(window).mean()
                )
            df["net_flow_trend"] = (
                df["net_flow"]
                .rolling(30)
                .apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0] if len(x) == 30 else 0,
                    raw=True,
                )
            )
            df["net_flow_volatility"] = df["net_flow"].rolling(30).std()
            df["inflow_volatility"] = df["inflow"].rolling(30).std()
            df["outflow_volatility"] = df["outflow"].rolling(30).std()
            if len(df) >= 365:
                decomposition = seasonal_decompose(
                    df["net_flow"], model="additive", period=365
                )
                df["trend"] = decomposition.trend
                df["seasonal"] = decomposition.seasonal
                df["residual"] = decomposition.resid
            else:
                df["trend"] = 0.0
                df["seasonal"] = 0.0
                df["residual"] = 0.0
            if request.external_factors:
                logger.debug("Incorporating external factors from request.")
            df = df.dropna()
            return df
        except Exception as e:
            logger.error(f"Error preparing features: {e}")
            raise

    async def _generate_ensemble_predictions(
        self, features_df: pd.DataFrame, horizon: int
    ) -> List[Dict[str, Any]]:
        """Generate ensemble predictions using multiple models"""
        try:
            X = features_df.drop(
                columns=["date", "net_flow", "cumulative_flow", "categories"],
                errors="ignore",
            )
            y = features_df["net_flow"]
            scaler = self.scalers["standard"].fit(X)
            X_scaled = scaler.transform(X)
            X_train = X_scaled
            y_train = y
            future_dates = [
                features_df["date"].max() + timedelta(days=i)
                for i in range(1, horizon + 1)
            ]
            # BUG FIX: The original code created a DataFrame here but never assigned
            # or used it — pure dead allocation removed.
            ml_models = ["random_forest", "gradient_boosting", "linear_regression"]
            ml_predictions = []
            for model_name in ml_models:
                model = self.models[model_name]
                model.fit(X_train, y_train)
                X_future = np.zeros((horizon, X_scaled.shape[1]))
                X_future_scaled = scaler.transform(X_future)
                pred = model.predict(X_future_scaled)
                ml_predictions.append(pred)
            ts_predictions = []
            prophet_pred = await self._predict_with_prophet(features_df, horizon)
            ts_predictions.append(prophet_pred)
            arima_pred = await self._predict_with_arima(features_df, horizon)
            ts_predictions.append(arima_pred)
            ets_pred = await self._predict_with_ets(features_df, horizon)
            ts_predictions.append(ets_pred)
            all_predictions = ml_predictions + ts_predictions
            if not all_predictions:
                raise RuntimeError("No predictions were generated by any model.")
            ensemble_predictions_array = np.mean(all_predictions, axis=0)
            predictions_list = []
            for i in range(horizon):
                date = future_dates[i]
                predictions_list.append(
                    {
                        "date": date.isoformat(),
                        "predicted_net_flow": float(ensemble_predictions_array[i]),
                        "model_contributions": {
                            "random_forest": float(ml_predictions[0][i]),
                            "gradient_boosting": float(ml_predictions[1][i]),
                            "linear_regression": float(ml_predictions[2][i]),
                            "prophet": float(prophet_pred[i]),
                            "arima": float(arima_pred[i]),
                            "exponential_smoothing": float(ets_pred[i]),
                        },
                    }
                )
            return predictions_list
        except Exception as e:
            logger.error(f"Error generating ensemble predictions: {e}")
            raise

    async def _load_models(self):
        """Load pre-trained models from storage (e.g., S3, local disk)"""
        logger.info("Attempting to load pre-trained models...")

    async def _get_model_performance(self) -> Dict[str, float]:
        """Get the latest performance metrics for the models"""
        return {"ensemble_mae": 0.0, "ensemble_rmse": 0.0, "ensemble_r2": 0.0}

    async def _calculate_data_quality_score(
        self, historical_data: pd.DataFrame
    ) -> float:
        """Calculate a data quality score based on completeness, consistency, etc."""
        completeness = historical_data.notna().all(axis=1).mean()
        return float(completeness * 100)

    async def _cache_prediction_results(
        self, user_id: str, response: CashFlowPredictionResponse
    ):
        """Cache the prediction results in Redis"""
        try:
            redis = await get_redis()
            key = f"cash_flow_prediction:{user_id}"
            await redis.set(key, str(response), ex=3600)
            logger.info(f"Cached prediction results for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to cache prediction results: {e}")

    async def _predict_with_prophet(
        self, historical_data: pd.DataFrame, horizon: int
    ) -> np.ndarray:
        """Predict with Facebook Prophet model"""
        try:
            prophet_df = historical_data[["date", "net_flow"]].rename(
                columns={"date": "ds", "net_flow": "y"}
            )
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
            )
            model.fit(prophet_df)
            future = model.make_future_dataframe(periods=horizon, include_history=False)
            forecast = model.predict(future)
            return forecast["yhat"].values
        except Exception as e:
            logger.warning(f"Prophet prediction failed: {e}")
            return np.zeros(horizon)

    async def _predict_with_arima(
        self, historical_data: pd.DataFrame, horizon: int
    ) -> np.ndarray:
        """Predict with ARIMA model"""
        try:
            series = historical_data.set_index("date")["net_flow"]
            model = ARIMA(series, order=(1, 1, 1))
            model_fit = model.fit()
            forecast = model_fit.predict(
                start=len(series), end=len(series) + horizon - 1
            )
            return forecast.values
        except Exception as e:
            logger.warning(f"ARIMA prediction failed: {e}")
            return np.zeros(horizon)

    async def _predict_with_ets(
        self, historical_data: pd.DataFrame, horizon: int
    ) -> np.ndarray:
        """Predict with Exponential Smoothing (ETS) model"""
        try:
            series = historical_data.set_index("date")["net_flow"]
            model = ExponentialSmoothing(
                series,
                seasonal_periods=7,
                trend="add",
                seasonal="add",
                initialization_method="estimated",
            )
            model_fit = model.fit()
            forecast = model_fit.forecast(horizon)
            return forecast.values
        except Exception as e:
            logger.warning(f"ETS prediction failed: {e}")
            return np.zeros(horizon)

    async def _calculate_confidence_intervals(
        self, predictions: List[Dict[str, Any]], historical_data: pd.DataFrame
    ) -> Dict[str, List[float]]:
        """Calculate confidence intervals for predictions"""
        try:
            historical_volatility = historical_data["net_flow"].std()
            confidence_95_upper = []
            confidence_95_lower = []
            confidence_80_upper = []
            confidence_80_lower = []
            for pred in predictions:
                predicted_value = pred["predicted_net_flow"]
                ci_95_upper = predicted_value + 1.96 * historical_volatility
                ci_95_lower = predicted_value - 1.96 * historical_volatility
                ci_80_upper = predicted_value + 1.28 * historical_volatility
                ci_80_lower = predicted_value - 1.28 * historical_volatility
                confidence_95_upper.append(ci_95_upper)
                confidence_95_lower.append(ci_95_lower)
                confidence_80_upper.append(ci_80_upper)
                confidence_80_lower.append(ci_80_lower)
            return {
                "confidence_95_upper": confidence_95_upper,
                "confidence_95_lower": confidence_95_lower,
                "confidence_80_upper": confidence_80_upper,
                "confidence_80_lower": confidence_80_lower,
            }
        except Exception as e:
            logger.error(f"Error calculating confidence intervals: {e}")
            return {
                "confidence_95_upper": [0.0] * len(predictions),
                "confidence_95_lower": [0.0] * len(predictions),
                "confidence_80_upper": [0.0] * len(predictions),
                "confidence_80_lower": [0.0] * len(predictions),
            }

    async def _perform_scenario_analysis(
        self,
        features_df: pd.DataFrame,
        request: CashFlowPredictionRequest,
        base_predictions: List[Dict[str, Any]],
    ) -> List[CashFlowScenario]:
        """Perform scenario analysis for cash flow predictions"""
        try:
            scenarios = []
            base_scenario = CashFlowScenario(
                name="Base Case",
                description="Current trend continuation",
                probability=0.6,
                predictions=[pred["predicted_net_flow"] for pred in base_predictions],
                assumptions=[
                    "Historical patterns continue",
                    "No major changes in spending/income",
                ],
            )
            scenarios.append(base_scenario)
            optimistic_predictions = [
                pred["predicted_net_flow"] * 1.2 for pred in base_predictions
            ]
            optimistic_scenario = CashFlowScenario(
                name="Optimistic",
                description="Improved financial performance",
                probability=0.2,
                predictions=optimistic_predictions,
                assumptions=[
                    "Increased income",
                    "Reduced expenses",
                    "Better financial management",
                ],
            )
            scenarios.append(optimistic_scenario)
            pessimistic_predictions = [
                pred["predicted_net_flow"] * 0.8 for pred in base_predictions
            ]
            pessimistic_scenario = CashFlowScenario(
                name="Pessimistic",
                description="Challenging financial conditions",
                probability=0.2,
                predictions=pessimistic_predictions,
                assumptions=[
                    "Economic downturn",
                    "Increased expenses",
                    "Reduced income",
                ],
            )
            scenarios.append(pessimistic_scenario)
            stress_predictions = [
                pred["predicted_net_flow"] * 0.5 for pred in base_predictions
            ]
            stress_scenario = CashFlowScenario(
                name="Stress Test",
                description="Severe financial stress",
                probability=0.05,
                predictions=stress_predictions,
                assumptions=[
                    "Major financial shock",
                    "Emergency expenses",
                    "Income loss",
                ],
            )
            scenarios.append(stress_scenario)
            return scenarios
        except Exception as e:
            logger.error(f"Error performing scenario analysis: {e}")
            return []

    async def _calculate_cash_conversion_cycle(
        self, historical_data: pd.DataFrame
    ) -> float:
        """Placeholder for Cash Conversion Cycle calculation"""
        return 0.0

    async def _calculate_working_capital_ratio(
        self, historical_data: pd.DataFrame
    ) -> float:
        """Placeholder for Working Capital Ratio calculation"""
        return 0.0

    async def _calculate_liquidity_ratio(self, historical_data: pd.DataFrame) -> float:
        """Placeholder for Liquidity Ratio calculation"""
        return 0.0

    async def _calculate_cash_flow_coverage_ratio(
        self, historical_data: pd.DataFrame
    ) -> float:
        """Placeholder for Cash Flow Coverage Ratio calculation"""
        return 0.0

    async def _calculate_cash_flow_metrics(
        self, historical_data: pd.DataFrame, predictions: List[Dict[str, Any]]
    ) -> CashFlowMetrics:
        """Calculate comprehensive cash flow metrics"""
        try:
            historical_net_flow = historical_data["net_flow"]
            predicted_values = [pred["predicted_net_flow"] for pred in predictions]
            historical_data_indexed = historical_data.set_index("date")
            metrics = CashFlowMetrics(
                average_monthly_inflow=float(
                    historical_data_indexed["inflow"].resample("M").sum().mean()
                ),
                average_monthly_outflow=float(
                    historical_data_indexed["outflow"].resample("M").sum().mean()
                ),
                average_monthly_net_flow=float(
                    historical_data_indexed["net_flow"].resample("M").sum().mean()
                ),
                cash_flow_volatility=float(historical_net_flow.std()),
                predicted_total_inflow=sum((max(0, pred) for pred in predicted_values)),
                predicted_total_outflow=sum(
                    (abs(min(0, pred)) for pred in predicted_values)
                ),
                predicted_net_flow=sum(predicted_values),
                cash_conversion_cycle=await self._calculate_cash_conversion_cycle(
                    historical_data
                ),
                working_capital_ratio=await self._calculate_working_capital_ratio(
                    historical_data
                ),
                liquidity_ratio=await self._calculate_liquidity_ratio(historical_data),
                cash_flow_coverage_ratio=await self._calculate_cash_flow_coverage_ratio(
                    historical_data
                ),
            )
            return metrics
        except Exception as e:
            logger.error(f"Error calculating cash flow metrics: {e}")
            return CashFlowMetrics()

    async def _assess_liquidity_risk(
        self, predictions: List[Dict[str, Any]], minimum_balance: float
    ) -> LiquidityRisk:
        """Assess liquidity risk based on predictions"""
        try:
            predicted_values = [pred["predicted_net_flow"] for pred in predictions]
            cumulative_flow = np.cumsum(predicted_values)
            days_below_minimum = sum(
                (1 for flow in cumulative_flow if flow < minimum_balance)
            )
            minimum_balance_date = None
            for i, flow in enumerate(cumulative_flow):
                if flow < minimum_balance:
                    minimum_balance_date = predictions[i]["date"]
                    break
            risk_percentage = days_below_minimum / len(predictions)
            if risk_percentage > 0.5:
                risk_level = "High"
            elif risk_percentage > 0.2:
                risk_level = "Medium"
            elif risk_percentage > 0.05:
                risk_level = "Low"
            else:
                risk_level = "Very Low"
            return LiquidityRisk(
                risk_level=risk_level,
                days_below_minimum=days_below_minimum,
                minimum_balance_date=minimum_balance_date,
                worst_case_balance=float(min(cumulative_flow)),
                probability_of_shortfall=risk_percentage,
                recommended_buffer=(
                    float(abs(min(cumulative_flow)) * 1.2)
                    if min(cumulative_flow) < 0
                    else 0.0
                ),
            )
        except Exception as e:
            logger.error(f"Error assessing liquidity risk: {e}")
            return LiquidityRisk()

    async def _generate_optimization_recommendations(
        self,
        historical_data: pd.DataFrame,
        predictions: List[Dict[str, Any]],
        scenarios: List[CashFlowScenario],
    ) -> CashFlowOptimization:
        """Generate cash flow optimization recommendations"""
        try:
            recommendations = []
            avg_outflow = historical_data["outflow"].mean()
            if avg_outflow > 0:
                recommendations.append(
                    {
                        "category": "Expense Management",
                        "recommendation": f"Consider reducing daily expenses by 10% to improve cash flow by ${avg_outflow * 0.1:.2f}/day",
                        "impact": avg_outflow * 0.1 * 30,
                        "priority": "Medium",
                    }
                )
            avg_inflow = historical_data["inflow"].mean()
            if avg_inflow > 0:
                recommendations.append(
                    {
                        "category": "Income Optimization",
                        "recommendation": f"Explore opportunities to increase income by 5% to improve monthly cash flow by ${avg_inflow * 0.05 * 30:.2f}",
                        "impact": avg_inflow * 0.05 * 30,
                        "priority": "High",
                    }
                )
            net_flow_volatility = historical_data["net_flow"].std()
            if net_flow_volatility > avg_inflow * 0.5:
                recommendations.append(
                    {
                        "category": "Timing and Volatility",
                        "recommendation": f"Your cash flow is highly volatile (Std Dev: ${net_flow_volatility:.2f}). Implement a cash buffer or synchronize large inflows/outflows to reduce risk.",
                        "impact": net_flow_volatility * 0.5 * 30,
                        "priority": "High",
                    }
                )
            liquidity_risk = await self._assess_liquidity_risk(predictions, 0)
            if liquidity_risk.risk_level in ["High", "Medium"]:
                recommendations.append(
                    {
                        "category": "Liquidity Management",
                        "recommendation": f"Your liquidity risk is {liquidity_risk.risk_level}. Maintain a minimum cash buffer of ${liquidity_risk.recommended_buffer:.2f} to cover potential shortfalls.",
                        "impact": liquidity_risk.recommended_buffer,
                        "priority": "Critical",
                    }
                )
            return CashFlowOptimization(
                recommendations=recommendations,
                total_potential_impact=sum((r["impact"] for r in recommendations)),
            )
        except Exception as e:
            logger.error(f"Error generating optimization recommendations: {e}")
            return CashFlowOptimization()
