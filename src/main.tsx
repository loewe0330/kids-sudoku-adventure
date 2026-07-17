import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { AppProvider } from "./app/providers/AppProvider";
import "./styles/tokens.css";
import "./styles/sudoku-adventure-tokens.css";
import "./styles/layout.css";
import "./styles/app.css";
import "./styles/responsive.css";
import "./styles/sudoku-adventure-theme.css";
import "./styles/print.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
