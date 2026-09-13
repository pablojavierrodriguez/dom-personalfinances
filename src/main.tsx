import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runStorageMigration } from "./lib/storage-migration";

// Migración silenciosa de almacenamiento local hacia DOM
runStorageMigration();

createRoot(document.getElementById("root")!).render(<App />);

// Registro seguro del Service Worker para PWA
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.info("[DOM PWA] Service Worker registrado:", reg.scope);
      })
      .catch((err) => {
        console.warn("[DOM PWA] Error al registrar Service Worker:", err);
      });
  });
}
