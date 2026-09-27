import { Platform } from "react-native";

export function injectWebStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const styleId = "leetstreak-web-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    /* Smooth fonts & rendering */
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Custom Web Scrollbars */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(150, 150, 150, 0.3);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(150, 150, 150, 0.5);
    }

    /* Web transitions for interactive elements */
    button, a, [role="button"] {
      transition: background-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
    }
  `;
  document.head.appendChild(style);
}
