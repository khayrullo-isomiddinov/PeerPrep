// Fonts are bundled with the app rather than loaded from Google, so visitors' IPs aren't sent to a third party
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@fontsource/instrument-serif/400.css"
import "@fontsource/instrument-serif/400-italic.css"
import "./index.css"
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter} from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { AuthProvider } from "./features/auth/AuthContext"
import ToastProvider from "./components/ui/ToastProvider"
import ThemeProvider from "./theme/ThemeProvider"
import { queryClient } from "./lib/queryClient"
import { installErrorReporting } from "./lib/monitoring"
import { warmUpServer } from "./utils/api"
import ErrorBoundary from "./components/ErrorBoundary"

installErrorReporting()
warmUpServer()

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
