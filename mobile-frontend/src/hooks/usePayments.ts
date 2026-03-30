import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { fetchTransactions } from "../store/slices/paymentsSlice";

export const usePayments = (limit: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const dispatch = useDispatch<AppDispatch>();
  const { transactions, isLoading, error, pagination } = useSelector(
    (state: RootState) => state.payments,
  );

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const loadTransactions = () => {
    dispatch(fetchTransactions({ page: currentPage, limit }));
  };

  const nextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const refresh = () => {
    loadTransactions();
  };

  return {
    transactions,
    isLoading,
    error,
    pagination,
    currentPage,
    nextPage,
    prevPage,
    goToPage,
    refresh,
  };
};

export default usePayments;
