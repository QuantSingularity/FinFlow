import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { fetchCreditScore, fetchLoans } from "../store/slices/creditSlice";

export const useCredit = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { creditScore, loans, currentLoan, isLoading, error } = useSelector(
    (state: RootState) => state.credit,
  );

  useEffect(() => {
    loadCreditData();
  }, [loadCreditData]);

  const loadCreditData = () => {
    dispatch(fetchCreditScore());
    dispatch(fetchLoans());
  };

  return {
    creditScore,
    loans,
    currentLoan,
    isLoading,
    error,
    refresh: loadCreditData,
  };
};

export default useCredit;
