import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { fetchDashboardMetrics } from "../store/slices/analyticsSlice";

export const useAnalytics = (
  _period: "daily" | "weekly" | "monthly" | "yearly" = "monthly",
) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    dashboardMetrics,
    revenueAnalytics,
    transactionAnalytics,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.analytics);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadDashboardData = () => {
    dispatch(fetchDashboardMetrics());
  };

  return {
    dashboardMetrics,
    revenueAnalytics,
    transactionAnalytics,
    isLoading,
    error,
    refresh: loadDashboardData,
  };
};

export default useAnalytics;
