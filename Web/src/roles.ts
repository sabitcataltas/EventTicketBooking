export const hasRealmRole = (
  accessToken: string | undefined,
  role: string,
): boolean => {
  const payload = accessToken?.split(".")[1];
  if (!payload) {
    return false;
  }
  const claims = JSON.parse(
    atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
  ) as { realm_access?: { roles?: string[] } };
  return claims.realm_access?.roles?.includes(role) ?? false;
};
