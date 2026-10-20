import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { config } from "../config.ts";
import { errorMessage } from "../errorMessage.ts";

export type User = {
  id: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
};

export function useCurrentUser() {
  const auth = useAuth();
  const accessToken = auth.user?.access_token;
  const [user, setUser] = useState<User>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const controller = new AbortController();
    const request = (method: "GET" | "POST") =>
      fetch(`${config.apiUrl}/users/me`, {
        method,
        headers: { authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
    request("GET")
      .then((response) =>
        response.status === 404 ? request("POST") : response,
      )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await errorMessage(response, "Failed to load user"));
        }
        return response.json() as Promise<User>;
      })
      .then((data) => {
        setUser(data);
        setError(undefined);
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") {
          setError(reason.message);
        }
      });
    return () => controller.abort();
  }, [accessToken]);

  return { user, error };
}
