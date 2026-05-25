import axios from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import useSWR from "swr";

interface UseAuthProps {
  middleware?: "guest" | "auth";
  redirectIfAuthenticated?: string;
}

export const useAuth = ({
  middleware,
  redirectIfAuthenticated = "/store",
}: UseAuthProps) => {
  const router = useRouter();

  const {
    data: user,
    error,
    mutate,
  } = useSWR("/api/user", () =>
    axios
      .get("/api/user")
      .then((res) => res.data)
      .catch((error) => {
        // 409 means email not verified — surface it, don't swallow
        if (error.response?.status !== 409) throw error;
      })
  );

  const csrf = useCallback(() => axios.get("/sanctum/csrf-cookie"), []);

  const login = useCallback(
    async ({ setErrors, ...props }: { setErrors: (e: any) => void; [key: string]: any }) => {
      await csrf();
      setErrors([]);
      try {
        await axios.post("/login", props);
        await mutate();
      } catch (error: any) {
        if (error.response?.status === 422) {
          setErrors(error.response.data.errors);
          return;
        }
        throw error;
      }
    },
    [csrf, mutate]
  );

  const register = useCallback(
    async ({ setErrors, ...props }: { setErrors: (e: any) => void; [key: string]: any }) => {
      await csrf();
      setErrors([]);
      try {
        await axios.post("/register", props);
        await mutate();
      } catch (error: any) {
        if (error.response?.status === 422) {
          setErrors(error.response.data.errors);
          return;
        }
        throw error;
      }
    },
    [csrf, mutate]
  );

  const logout = useCallback(async () => {
    if (!error) {
      await axios.post("/logout");
    }
    // Immediately clear the SWR cache — don't wait for a re-fetch.
    // This causes any component using useAuth to instantly re-render
    // with user = undefined (showing Sign in / Register in the header).
    await mutate(undefined, { revalidate: false });
    router.push("/store/login");
  }, [error, mutate, router]);

  useEffect(() => {
    // Guest middleware: redirect already-authenticated users away from auth pages
    if (middleware === "guest" && redirectIfAuthenticated && user) {
      router.push(redirectIfAuthenticated);
    }
    // Auth middleware: force unauthenticated users to login
    if (middleware === "auth" && error) {
      logout();
    }
  }, [user, error, middleware, redirectIfAuthenticated, router, logout]);

  return {
    user,
    login,
    register,
    logout,
    isLoading: !user && !error,
  };
};