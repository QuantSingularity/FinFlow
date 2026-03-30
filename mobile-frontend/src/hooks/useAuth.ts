import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const useAuth = () => {
  const { user, token, isLoading, error } = useSelector(
    (state: RootState) => state.auth,
  );

  const isAuthenticated = !!token && !!user;

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
  };
};

export default useAuth;
