import { Platform } from "react-native";

export function injectWebStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const styleId = "leetstreak-web-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    /* LeetCode-inspired utility interface: compact, neutral, and crisp. */
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: #f5f5f5;
      color: #262626;
    }

    ::selection {
      background: rgba(255, 161, 22, 0.24);
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
      background: #c7c7c7;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #a7a7a7;
    }

    /* Web transitions for interactive elements */
    button, a, [role="button"] {
      transition: background-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
    }

    button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {
      outline: 2px solid #ffa116;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}
