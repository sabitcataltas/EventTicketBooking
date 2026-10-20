import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App.tsx";
import { config } from "./config.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider
      authority={config.oidc.authority}
      client_id={config.oidc.clientId}
      redirect_uri={config.oidc.redirectUri}
      onSigninCallback={() =>
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        )
      }
    >
      <App />
    </AuthProvider>
  </StrictMode>,
);
