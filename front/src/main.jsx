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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
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
  </React.StrictMode>
)
