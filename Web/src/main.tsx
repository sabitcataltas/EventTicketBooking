import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import { AuthProvider } from "react-oidc-context";
import { BrowserRouter } from "react-router";
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
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
