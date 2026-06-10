import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { AuthProvider } from "./store/auth";
import "./styles.css";

// Register the service worker. `autoUpdate` means new versions activate on the
// next navigation; we reload once the fresh SW takes control so users always
// run the latest build without a manual hard-refresh.
registerSW({
  immediate: true,
  onNeedRefresh() {
    // A new version is available; it will be applied on next load.
  },
  onOfflineReady() {
    // App is cached and ready to work offline.
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
