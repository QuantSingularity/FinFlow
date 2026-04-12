"""
Automated Financial Advisory Service

Provides intelligent financial advice and recommendations:
- Personalized financial planning
- Investment recommendations
- Risk assessment and management
- Goal-based financial advice
- Market insights and analysis
- Portfolio optimization
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


async def get_database():
    return MockDB()


async def get_redis():
    return MockRedis()


class MockDB:

    async def fetch_one(self, query, params):
        return None

    async def fetch_all(self, query, params):
        return []


class MockRedis:

    async def setex(self, key, expiry, value):
        pass


class FinancialAdvisoryRequest:

    def __init__(
        self,
        user_id: str,
        investment_amount: Optional[float] = None,
        financial_goals: Optional[List[Any]] = None,
    ) -> None:
        self.user_id = user_id
        self.investment_amount = investment_amount
        self.financial_goals = financial_goals or []


class FinancialAdvisoryResponse:

    def __init__(self, **kwargs) -> None:
        self.__dict__.update(kwargs)

    def json(self) -> str:
        return json.dumps(self.__dict__, default=str)


class FinancialGoal:

    def __init__(
        self, goal_type: str, target_amount: float, target_date: datetime
    ) -> None:
        self.goal_type = goal_type
        self.target_amount = target_amount
        self.target_date = target_date


class InvestmentRecommendation:

    def __init__(self, **kwargs) -> None:
        self.__dict__.update(kwargs)


class MarketInsight:

    def __init__(self, **kwargs) -> None:
        self.__dict__.update(kwargs)


class PersonalizedAdvice:

    def __init__(self, **kwargs) -> None:
        self.__dict__.update(kwargs)


class PortfolioAllocation:

    def __init__(self, **kwargs) -> None:
        self.__dict__.update(kwargs)


class RiskAssessment:

    def __init__(self, **kwargs) -> None:
        self.__dict__.update(kwargs)


class MockUtil:

    async def initialize(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass


class MarketAnalyzer(MockUtil):
    pass


class PortfolioOptimizer(MockUtil):
    pass


class RiskCalculator(MockUtil):
    pass


class ModelManager:
    pass


logger = logging.getLogger(__name__)


class AdvisoryService:
    """Automated financial advisory and recommendation service"""

    def __init__(self, model_manager: ModelManager) -> None:
        self.model_manager = model_manager
        self.risk_calculator = RiskCalculator()
        self.portfolio_optimizer = PortfolioOptimizer()
        self.market_analyzer = MarketAnalyzer()
        self.risk_profiles = {
            "conservative": {
                "stocks": 0.3,
                "bonds": 0.6,
                "cash": 0.1,
                "risk_tolerance": 0.2,
            },
            "moderate": {
                "stocks": 0.6,
                "bonds": 0.3,
                "cash": 0.1,
                "risk_tolerance": 0.5,
            },
            "aggressive": {
                "stocks": 0.8,
                "bonds": 0.15,
                "cash": 0.05,
                "risk_tolerance": 0.8,
            },
        }
        self.investment_categories = {
            "stocks": ["SPY", "VTI", "QQQ", "IWM"],
            "bonds": ["BND", "TLT", "IEF", "HYG"],
            "international": ["VEA", "VWO", "EFA"],
            "real_estate": ["VNQ", "REIT"],
            "commodities": ["GLD", "SLV", "DBC"],
            "crypto": ["BTC-USD", "ETH-USD"],
        }
        self.is_initialized = False

    async def initialize(self) -> None:
        """Initialize the advisory service"""
        try:
            logger.info("Initializing Financial Advisory Service...")
            await self.risk_calculator.initialize()
            await self.portfolio_optimizer.initialize()
            await self.market_analyzer.initialize()
            await self._load_market_data()
            self.is_initialized = True
            logger.info("Financial Advisory Service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Financial Advisory Service: {e}")
            raise

    async def get_financial_advice(
        self, request: FinancialAdvisoryRequest
    ) -> FinancialAdvisoryResponse:
        """
        Generate comprehensive financial advice

        Args:
            request: Financial advisory request parameters

        Returns:
            Detailed financial advice and recommendations
        """
        if not self.is_initialized:
            raise RuntimeError("Financial Advisory Service not initialized")
        try:
            logger.info(f"Generating financial advice for user {request.user_id}")
            user_profile = await self._get_user_financial_profile(request.user_id)
            risk_assessment = await self._assess_risk_profile(user_profile, request)
            investment_recommendations = (
                await self._generate_investment_recommendations(
                    user_profile, risk_assessment, request
                )
            )
            portfolio_allocation = await self._create_portfolio_allocation(
                user_profile, risk_assessment, request.investment_amount or 0
            )
            goal_analysis = await self._analyze_financial_goals(
                user_profile, request.financial_goals or []
            )
            market_insights = await self._get_market_insights()
            personalized_advice = await self._generate_personalized_advice(
                user_profile, risk_assessment, investment_recommendations, goal_analysis
            )
            response = FinancialAdvisoryResponse(
                user_id=request.user_id,
                advice_date=datetime.now(),
                risk_assessment=risk_assessment,
                investment_recommendations=investment_recommendations,
                portfolio_allocation=portfolio_allocation,
                financial_goals_analysis=goal_analysis,
                market_insights=market_insights,
                personalized_advice=personalized_advice,
                confidence_score=await self._calculate_confidence_score(user_profile),
                next_review_date=datetime.now() + timedelta(days=90),
            )
            await self._cache_advice(request.user_id, response)
            logger.info(f"Financial advice generated for user {request.user_id}")
            return response
        except Exception as e:
            logger.error(f"Error generating financial advice: {e}")
            raise

    async def _get_user_financial_profile(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user financial profile"""
        try:
            db = await get_database()
            user_query = "\n            SELECT age, income, employment_status, dependents, \n                   financial_experience, investment_knowledge\n            FROM users WHERE id = %s\n            "
            user_info = await db.fetch_one(user_query, [user_id])
            transactions_query = "\n            SELECT \n                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,\n                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses,\n                AVG(CASE WHEN amount > 0 THEN amount ELSE 0 END) as avg_income,\n                AVG(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as avg_expense,\n                COUNT(*) as transaction_count\n            FROM transactions \n            WHERE user_id = %s \n                AND created_at >= NOW() - INTERVAL '12 months'\n            "
            financial_data = await db.fetch_one(transactions_query, [user_id])
            assets_query = "\n            SELECT \n                SUM(CASE WHEN type = 'asset' THEN value ELSE 0 END) as total_assets,\n                SUM(CASE WHEN type = 'liability' THEN value ELSE 0 END) as total_liabilities\n            FROM user_financial_data \n            WHERE user_id = %s\n            "
            balance_sheet = await db.fetch_one(assets_query, [user_id])
            investments_query = "\n            SELECT investment_type, SUM(amount) as total_invested,\n                   AVG(return_rate) as avg_return\n            FROM user_investments \n            WHERE user_id = %s\n            GROUP BY investment_type\n            "
            investments = await db.fetch_all(investments_query, [user_id])
            user_info = user_info or {
                "age": 35,
                "income": 75000,
                "employment_status": "employed",
                "dependents": 0,
                "financial_experience": "moderate",
                "investment_knowledge": "moderate",
            }
            financial_data = financial_data or {
                "total_income": 75000,
                "total_expenses": 50000,
                "avg_expense": 4166.67,
            }
            balance_sheet = balance_sheet or {
                "total_assets": 100000,
                "total_liabilities": 20000,
            }
            investments = investments or []
            profile = {
                "user_info": dict(user_info),
                "financial_data": dict(financial_data),
                "balance_sheet": dict(balance_sheet),
                "investments": [dict(inv) for inv in investments],
                "net_worth": (balance_sheet["total_assets"] or 0)
                - (balance_sheet["total_liabilities"] or 0),
                "monthly_savings": (
                    (financial_data["total_income"] or 0)
                    - (financial_data["total_expenses"] or 0)
                )
                / 12,
            }
            return profile
        except Exception as e:
            logger.error(f"Error getting user financial profile: {e}")
            return {
                "user_info": {
                    "age": 35,
                    "income": 75000,
                    "employment_status": "employed",
                },
                "financial_data": {},
                "balance_sheet": {},
                "investments": [],
                "net_worth": 0,
                "monthly_savings": 0,
            }

    async def _assess_risk_profile(
        self, user_profile: Dict[str, Any], request: FinancialAdvisoryRequest
    ) -> RiskAssessment:
        """Assess user's risk profile and tolerance"""
        try:
            risk_factors = []
            age = user_profile.get("user_info", {}).get("age", 35)
            age_score = max(0, min(1, (65 - age) / 30))
            risk_factors.append(("age", age_score, 0.2))
            income = user_profile.get("user_info", {}).get("income", 0)
            employment_status = user_profile.get("user_info", {}).get(
                "employment_status", "employed"
            )
            income_score = 0.5
            if employment_status == "employed" and income > 50000:
                income_score = 0.8
            elif employment_status == "unemployed":
                income_score = 0.2
            risk_factors.append(("income_stability", income_score, 0.2))
            experience = user_profile.get("user_info", {}).get(
                "financial_experience", "moderate"
            )
            knowledge = user_profile.get("user_info", {}).get(
                "investment_knowledge", "moderate"
            )
            exp_map = {"low": 0.3, "moderate": 0.6, "high": 0.9}
            exp_score = (exp_map.get(experience, 0.5) + exp_map.get(knowledge, 0.5)) / 2
            risk_factors.append(("experience", exp_score, 0.15))
            net_worth = user_profile.get("net_worth", 0)
            net_worth_score = min(1.0, net_worth / 500000)
            risk_factors.append(("net_worth", net_worth_score, 0.15))
            time_horizon_years = 20
            if request.financial_goals:
                latest_date = max((g.target_date for g in request.financial_goals))
                time_horizon_years = (latest_date - datetime.now()).days / 365.25
                time_horizon_years = max(5, min(30, time_horizon_years))
            time_horizon_score = min(1.0, time_horizon_years / 30)
            risk_factors.append(("time_horizon", time_horizon_score, 0.3))
            risk_score = sum((score * weight for _, score, weight in risk_factors))
            risk_score = min(1.0, risk_score)
            if risk_score >= 0.7:
                risk_category = "aggressive"
            elif risk_score >= 0.4:
                risk_category = "moderate"
            else:
                risk_category = "conservative"
            return RiskAssessment(
                risk_score=risk_score,
                risk_category=risk_category,
                risk_tolerance=self.risk_profiles[risk_category]["risk_tolerance"],
                time_horizon_years=time_horizon_years,
                rationale="Score based on age, income stability, financial experience, net worth, and time horizon.",
            )
        except Exception as e:
            logger.error(f"Error assessing risk profile: {e}")
            return RiskAssessment(
                risk_score=0.5,
                risk_category="moderate",
                risk_tolerance=0.5,
                time_horizon_years=20,
                rationale="Default moderate risk profile due to calculation error.",
            )

    async def _generate_investment_recommendations(
        self,
        user_profile: Dict[str, Any],
        risk_assessment: RiskAssessment,
        request: FinancialAdvisoryRequest,
    ) -> List[InvestmentRecommendation]:
        """Generate investment recommendations based on risk profile"""
        recommendations = []
        market_data = await self._get_current_market_data()
        recommendations.extend(
            await self._get_stock_recommendations(
                risk_assessment,
                market_data,
                self.risk_profiles[risk_assessment.risk_category]["stocks"],
            )
        )
        recommendations.extend(
            await self._get_bond_recommendations(
                risk_assessment,
                market_data,
                self.risk_profiles[risk_assessment.risk_category]["bonds"],
            )
        )
        if risk_assessment.risk_score > 0.5:
            recommendations.extend(
                await self._get_alternative_recommendations(
                    risk_assessment, market_data
                )
            )
        return recommendations

    async def _get_stock_recommendations(
        self,
        risk_assessment: RiskAssessment,
        market_data: Dict[str, Any],
        allocation_percentage: float,
    ) -> List[InvestmentRecommendation]:
        """Get stock-related investment recommendations"""
        try:
            recommendations = []
            stock_options = [
                {
                    "symbol": "VTI",
                    "name": "Vanguard Total Stock Market ETF",
                    "category": "US Total Market",
                    "expense_ratio": 0.03,
                    "expected_return": 0.09,
                    "risk_level": "medium",
                },
                {
                    "symbol": "VEA",
                    "name": "Vanguard FTSE Developed Markets ETF",
                    "category": "International Developed Markets",
                    "expense_ratio": 0.05,
                    "expected_return": 0.07,
                    "risk_level": "medium",
                },
                {
                    "symbol": "VWO",
                    "name": "Vanguard FTSE Emerging Markets ETF",
                    "category": "International Emerging Markets",
                    "expense_ratio": 0.12,
                    "expected_return": 0.11,
                    "risk_level": "high",
                },
            ]
            if risk_assessment.risk_category == "conservative":
                stock_options = [s for s in stock_options if s["risk_level"] != "high"]
            elif risk_assessment.risk_category == "moderate":
                pass
            elif risk_assessment.risk_category == "aggressive":
                pass
            if not stock_options:
                return []
            per_stock_allocation = allocation_percentage / len(stock_options)
            for stock in stock_options:
                recommendation = InvestmentRecommendation(
                    symbol=stock["symbol"],
                    name=stock["name"],
                    investment_type="ETF",
                    category=stock["category"],
                    recommended_allocation=per_stock_allocation,
                    expected_return=stock["expected_return"],
                    risk_level=stock["risk_level"],
                    reasoning=f"Broad market exposure and diversification through {stock['category']}",
                    time_horizon=risk_assessment.time_horizon_years,
                    minimum_investment=100,
                    liquidity="High",
                    expense_ratio=stock["expense_ratio"],
                )
                recommendations.append(recommendation)
            return recommendations
        except Exception as e:
            logger.error(f"Error getting stock recommendations: {e}")
            return []

    async def _get_bond_recommendations(
        self,
        risk_assessment: RiskAssessment,
        market_data: Dict[str, Any],
        allocation_percentage: float,
    ) -> List[InvestmentRecommendation]:
        """Get bond-related investment recommendations"""
        try:
            recommendations = []
            bond_options = [
                {
                    "symbol": "BND",
                    "name": "Vanguard Total Bond Market ETF",
                    "category": "US Total Bond Market",
                    "expense_ratio": 0.035,
                    "expected_return": 0.04,
                    "risk_level": "low",
                },
                {
                    "symbol": "TLT",
                    "name": "iShares 20+ Year Treasury Bond ETF",
                    "category": "Long-Term Treasury",
                    "expense_ratio": 0.15,
                    "expected_return": 0.03,
                    "risk_level": "medium",
                },
            ]
            if risk_assessment.risk_category == "aggressive":
                bond_options = [b for b in bond_options if b["risk_level"] == "low"]
            elif risk_assessment.risk_category == "conservative":
                pass
            if not bond_options:
                return []
            per_bond_allocation = allocation_percentage / len(bond_options)
            for bond in bond_options:
                recommendation = InvestmentRecommendation(
                    symbol=bond["symbol"],
                    name=bond["name"],
                    investment_type="ETF",
                    category=bond["category"],
                    recommended_allocation=per_bond_allocation,
                    expected_return=bond["expected_return"],
                    risk_level=bond["risk_level"],
                    reasoning=f"Stable income and portfolio diversification through {bond['category']}",
                    time_horizon=risk_assessment.time_horizon_years,
                    minimum_investment=100,
                    liquidity="High",
                    expense_ratio=bond["expense_ratio"],
                )
                recommendations.append(recommendation)
            return recommendations
        except Exception as e:
            logger.error(f"Error getting bond recommendations: {e}")
            return []

    async def _get_alternative_recommendations(
        self, risk_assessment: RiskAssessment, market_data: Dict[str, Any]
    ) -> List[InvestmentRecommendation]:
        """Get alternative investment recommendations for higher risk tolerance"""
        try:
            recommendations = []
            alternatives = [
                {
                    "symbol": "VNQ",
                    "name": "Vanguard Real Estate ETF",
                    "category": "Real Estate",
                    "expense_ratio": 0.12,
                    "expected_return": 0.07,
                    "risk_level": "medium",
                    "allocation": 0.05,
                },
                {
                    "symbol": "GLD",
                    "name": "SPDR Gold Shares",
                    "category": "Commodities",
                    "expense_ratio": 0.4,
                    "expected_return": 0.04,
                    "risk_level": "medium",
                    "allocation": 0.03,
                },
            ]
            if risk_assessment.risk_score > 0.8:
                alternatives.append(
                    {
                        "symbol": "BTC-USD",
                        "name": "Bitcoin",
                        "category": "Cryptocurrency",
                        "expense_ratio": 0.0,
                        "expected_return": 0.15,
                        "risk_level": "very_high",
                        "allocation": 0.02,
                    }
                )
            for alt in alternatives:
                recommendation = InvestmentRecommendation(
                    symbol=alt["symbol"],
                    name=alt["name"],
                    investment_type=(
                        "ETF" if alt["symbol"] != "BTC-USD" else "Cryptocurrency"
                    ),
                    category=alt["category"],
                    recommended_allocation=alt["allocation"],
                    expected_return=alt["expected_return"],
                    risk_level=alt["risk_level"],
                    reasoning=f"Portfolio diversification through {alt['category']} exposure",
                    time_horizon=risk_assessment.time_horizon_years,
                    minimum_investment=100,
                    liquidity=(
                        "Medium" if alt["category"] != "Cryptocurrency" else "High"
                    ),
                    expense_ratio=alt["expense_ratio"],
                )
                recommendations.append(recommendation)
            return recommendations
        except Exception as e:
            logger.error(f"Error getting alternative recommendations: {e}")
            return []

    async def _create_portfolio_allocation(
        self,
        user_profile: Dict[str, Any],
        risk_assessment: RiskAssessment,
        investment_amount: float,
    ) -> PortfolioAllocation:
        """Create optimized portfolio allocation"""
        try:
            base_allocation = self.risk_profiles[risk_assessment.risk_category]
            adjusted_allocation = base_allocation.copy()
            age = user_profile.get("user_info", {}).get("age", 35)
            stock_percentage = min(0.9, max(0.2, (100 - age) / 100))
            adjusted_allocation["stocks"] = (
                adjusted_allocation["stocks"] + stock_percentage
            ) / 2
            adjusted_allocation["bonds"] = (
                1 - adjusted_allocation["stocks"] - adjusted_allocation["cash"]
            )
            stock_amount = investment_amount * adjusted_allocation["stocks"]
            bond_amount = investment_amount * adjusted_allocation["bonds"]
            cash_amount = investment_amount * adjusted_allocation["cash"]
            expected_return = (
                adjusted_allocation["stocks"] * 0.08
                + adjusted_allocation["bonds"] * 0.03
                + adjusted_allocation["cash"] * 0.01
            )
            expected_volatility = (
                adjusted_allocation["stocks"] * 0.15
                + adjusted_allocation["bonds"] * 0.05
                + adjusted_allocation["cash"] * 0.001
            )
            sharpe_ratio = expected_return / max(expected_volatility, 0.01)
            return PortfolioAllocation(
                stocks_percentage=adjusted_allocation["stocks"],
                bonds_percentage=adjusted_allocation["bonds"],
                cash_percentage=adjusted_allocation["cash"],
                alternatives_percentage=0.0,
                stocks_amount=stock_amount,
                bonds_amount=bond_amount,
                cash_amount=cash_amount,
                alternatives_amount=0.0,
                expected_annual_return=expected_return,
                expected_volatility=expected_volatility,
                sharpe_ratio=sharpe_ratio,
                rebalancing_frequency="Quarterly",
                rationale=f"Allocation optimized for {risk_assessment.risk_category} risk profile with {risk_assessment.time_horizon_years}-year horizon",
            )
        except Exception as e:
            logger.error(f"Error creating portfolio allocation: {e}")
            return PortfolioAllocation(
                stocks_percentage=0.0,
                bonds_percentage=0.0,
                cash_percentage=0.0,
                alternatives_percentage=0.0,
                stocks_amount=0.0,
                bonds_amount=0.0,
                cash_amount=0.0,
                alternatives_amount=0.0,
                expected_annual_return=0.0,
                expected_volatility=0.0,
                sharpe_ratio=0.0,
                rebalancing_frequency="N/A",
                rationale="Error in allocation calculation.",
            )

    async def _analyze_financial_goals(
        self, user_profile: Dict[str, Any], financial_goals: List[FinancialGoal]
    ) -> List[Dict[str, Any]]:
        """Analyze and provide guidance on financial goals"""
        try:
            goal_analysis = []
            monthly_savings = user_profile.get("monthly_savings", 0)
            for goal in financial_goals:
                months_to_goal = max(
                    1,
                    goal.target_date.year * 12
                    + goal.target_date.month
                    - datetime.now().year * 12
                    - datetime.now().month,
                )
                required_monthly_savings = goal.target_amount / months_to_goal
                feasibility = (
                    "High"
                    if required_monthly_savings <= monthly_savings * 0.5
                    else (
                        "Medium"
                        if required_monthly_savings <= monthly_savings * 0.8
                        else "Low"
                    )
                )
                assumed_return = 0.06
                monthly_return = assumed_return / 12
                if months_to_goal > 12:
                    if monthly_return == 0:
                        future_value_factor = months_to_goal
                    else:
                        future_value_factor = (
                            (1 + monthly_return) ** months_to_goal - 1
                        ) / monthly_return
                    if future_value_factor == 0:
                        required_monthly_investment = required_monthly_savings
                    else:
                        required_monthly_investment = (
                            goal.target_amount / future_value_factor
                        )
                else:
                    required_monthly_investment = required_monthly_savings
                analysis = {
                    "goal": goal,
                    "months_to_goal": months_to_goal,
                    "required_monthly_savings": required_monthly_savings,
                    "required_monthly_investment": required_monthly_investment,
                    "feasibility": feasibility,
                    "recommendations": [
                        f"Save ${required_monthly_investment:.2f} monthly to reach your {goal.goal_type} goal",
                        f"Consider investing in a {('conservative' if months_to_goal < 24 else 'moderate')} portfolio",
                        "Set up automatic transfers to stay on track",
                    ],
                    "probability_of_success": min(
                        1.0, monthly_savings / max(required_monthly_investment, 1)
                    ),
                }
                goal_analysis.append(analysis)
            return goal_analysis
        except Exception as e:
            logger.error(f"Error analyzing financial goals: {e}")
            return []

    async def _get_market_insights(self) -> List[MarketInsight]:
        """Get current market insights and analysis"""
        try:
            insights = []
            await self._get_current_market_data()
            sp500_trend = await self._analyze_market_trend("SPY")
            insights.append(
                MarketInsight(
                    category="Market Trend",
                    title="S&P 500 Analysis",
                    description=f"Current trend: {sp500_trend['trend']}. {sp500_trend['description']}",
                    impact="Medium",
                    recommendation=sp500_trend["recommendation"],
                    confidence=0.75,
                )
            )
            insights.append(
                MarketInsight(
                    category="Interest Rates",
                    title="Current Rate Environment",
                    description="Federal Reserve policy impacts bond and stock valuations",
                    impact="High",
                    recommendation="Consider duration risk in bond portfolios",
                    confidence=0.8,
                    source="Federal Reserve",
                )
            )
            sector_insight = await self._analyze_sector_rotation()
            insights.append(
                MarketInsight(
                    category="Sector Analysis",
                    title="Sector Rotation Trends",
                    description=sector_insight["description"],
                    impact="Medium",
                    recommendation=sector_insight["recommendation"],
                    confidence=0.7,
                    source="Sector Analysis",
                )
            )
            return insights
        except Exception as e:
            logger.error(f"Error getting market insights: {e}")
            return []

    async def _generate_personalized_advice(
        self,
        user_profile: Dict[str, Any],
        risk_assessment: RiskAssessment,
        investment_recommendations: List[InvestmentRecommendation],
        goal_analysis: List[Dict[str, Any]],
    ) -> List[PersonalizedAdvice]:
        """Generate personalized financial advice"""
        try:
            advice = []
            avg_expense = user_profile.get("financial_data", {}).get("avg_expense", 0)
            monthly_expenses = avg_expense * 30 / 365.25
            net_worth = user_profile.get("net_worth", 0)
            emergency_months = net_worth / max(monthly_expenses, 1)
            if emergency_months < 3:
                advice.append(
                    PersonalizedAdvice(
                        category="Emergency Fund",
                        priority="High",
                        title="Build Emergency Fund",
                        description=f"You currently have {emergency_months:.1f} months of expenses saved. Aim for 3-6 months.",
                        action_items=[
                            "Open a high-yield savings account",
                            f"Save ${monthly_expenses * 3 - net_worth:.2f} for 3-month emergency fund",
                            "Automate monthly transfers to emergency fund",
                        ],
                        expected_benefit="Financial security and peace of mind",
                        timeline="3-6 months",
                    )
                )
            total_liabilities = user_profile.get("balance_sheet", {}).get(
                "total_liabilities", 0
            )
            if total_liabilities > 0:
                advice.append(
                    PersonalizedAdvice(
                        category="Debt Management",
                        priority="High",
                        title="Optimize Debt Repayment",
                        description=f"You have ${total_liabilities:.2f} in liabilities. Consider debt optimization strategies.",
                        action_items=[
                            "List all debts with interest rates",
                            "Consider debt avalanche method (highest interest first)",
                            "Explore refinancing options for lower rates",
                        ],
                        expected_benefit="Reduced interest payments and faster debt freedom",
                        timeline="1-5 years",
                    )
                )
            if risk_assessment.risk_category == "conservative":
                advice.append(
                    PersonalizedAdvice(
                        category="Investment Strategy",
                        priority="Medium",
                        title="Conservative Investment Approach",
                        description="Your risk profile suggests a conservative investment strategy focused on capital preservation.",
                        action_items=[
                            "Start with broad market index funds",
                            "Maintain 60-70% bond allocation",
                            "Consider target-date funds for simplicity",
                        ],
                        expected_benefit="Steady growth with lower volatility",
                        timeline="Long-term",
                    )
                )
            elif risk_assessment.risk_category == "aggressive":
                advice.append(
                    PersonalizedAdvice(
                        category="Investment Strategy",
                        priority="Medium",
                        title="Growth-Oriented Investment Strategy",
                        description="Your risk profile allows for higher growth potential through equity investments.",
                        action_items=[
                            "Increase equity allocation to 70-80%",
                            "Consider growth-oriented ETFs",
                            "Add international diversification",
                        ],
                        expected_benefit="Higher long-term growth potential",
                        timeline="Long-term",
                    )
                )
            income = user_profile.get("user_info", {}).get("income", 0)
            if income > 50000:
                advice.append(
                    PersonalizedAdvice(
                        category="Tax Optimization",
                        priority="Medium",
                        title="Maximize Tax-Advantaged Accounts",
                        description="Take advantage of tax-deferred and tax-free investment accounts.",
                        action_items=[
                            "Maximize 401(k) contributions, especially with employer match",
                            "Consider Roth IRA for tax-free growth",
                            "Use HSA for triple tax advantage if available",
                        ],
                        expected_benefit="Reduced tax burden and increased savings",
                        timeline="Annual",
                    )
                )
            for goal_info in goal_analysis:
                if goal_info["feasibility"] == "Low":
                    advice.append(
                        PersonalizedAdvice(
                            category="Goal Planning",
                            priority="Medium",
                            title=f"Adjust {goal_info['goal'].goal_type} Goal Strategy",
                            description=f"Your current savings rate may not meet your {goal_info['goal'].goal_type} goal timeline.",
                            action_items=[
                                "Consider extending the timeline",
                                "Increase monthly savings rate",
                                "Explore higher-return investment options",
                            ],
                            expected_benefit="Achievable financial goals",
                            timeline=f"{goal_info['months_to_goal']} months",
                        )
                    )
            return advice
        except Exception as e:
            logger.error(f"Error generating personalized advice: {e}")
            return []

    async def _calculate_confidence_score(self, user_profile: Dict[str, Any]) -> float:
        """Calculate confidence score for the advice"""
        try:
            data_completeness = 0.8
            market_stability = 0.7
            model_accuracy = 0.85
            confidence = (
                data_completeness * 0.4 + market_stability * 0.3 + model_accuracy * 0.3
            )
            return confidence
        except Exception as e:
            logger.error(f"Error calculating confidence score: {e}")
            return 0.75

    async def _cache_advice(self, user_id: str, response: FinancialAdvisoryResponse):
        """Cache financial advice in Redis"""
        try:
            redis = await get_redis()
            cache_key = f"financial_advice:{user_id}"
            await redis.setex(cache_key, 604800, response.json())
        except Exception as e:
            logger.warning(f"Failed to cache financial advice: {e}")

    async def _load_market_data(self):
        """Load and cache market data"""
        try:
            logger.info("Loading market data...")
        except Exception as e:
            logger.warning(f"Could not load market data: {e}")

    async def _get_current_market_data(self) -> Dict[str, Any]:
        """Get current market data for analysis"""
        try:
            return {
                "sp500_price": 4500,
                "sp500_change": 0.02,
                "vix": 18.5,
                "10y_treasury": 0.045,
                "dollar_index": 103.2,
            }
        except Exception as e:
            logger.error(f"Error getting market data: {e}")
            return {}

    async def _analyze_market_trend(self, symbol: str) -> Dict[str, str]:
        """Analyze market trend for a given symbol"""
        try:
            return {
                "trend": "Bullish",
                "description": "Market showing upward momentum with strong fundamentals",
                "recommendation": "Maintain equity allocation with focus on quality companies",
            }
        except Exception as e:
            logger.error(f"Error analyzing market trend: {e}")
            return {
                "trend": "Neutral",
                "description": "Market trend unclear",
                "recommendation": "Maintain diversified portfolio",
            }

    async def _analyze_sector_rotation(self) -> Dict[str, str]:
        """Analyze sector rotation trends"""
        try:
            return {
                "description": "Technology and healthcare sectors showing relative strength",
                "recommendation": "Consider overweighting growth sectors while maintaining diversification",
            }
        except Exception as e:
            logger.error(f"Error analyzing sector rotation: {e}")
            return {
                "description": "Sector trends unclear",
                "recommendation": "Maintain broad market exposure",
            }

    async def cleanup(self) -> None:
        """Cleanup resources"""
        try:
            logger.info("Cleaning up Financial Advisory Service...")
            await self.risk_calculator.cleanup()
            await self.portfolio_optimizer.cleanup()
            await self.market_analyzer.cleanup()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# (duplicate import json removed)

if __name__ == "__main__":

    async def run_example():
        service = AdvisoryService(ModelManager())
        await service.initialize()
        goal1 = FinancialGoal(
            goal_type="Retirement",
            target_amount=1000000,
            target_date=datetime.now() + timedelta(days=365 * 30),
        )
        goal2 = FinancialGoal(
            goal_type="House Down Payment",
            target_amount=50000,
            target_date=datetime.now() + timedelta(days=365 * 5),
        )
        request = FinancialAdvisoryRequest(
            user_id="test-user-1",
            investment_amount=10000,
            financial_goals=[goal1, goal2],
        )
        try:
            advice = await service.get_financial_advice(request)
            logger.info("\n--- Financial Advisory Response ---")
            logger.info(advice.json())
        except Exception as e:
            logger.info(f"An error occurred: {e}")
        await service.cleanup()

    try:
        asyncio.run(run_example())
    except RuntimeError as e:
        if "Event loop is closed" in str(e):
            logger.info("Event loop closed, skipping final run.")
        else:
            raise e
