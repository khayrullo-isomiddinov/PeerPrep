import { Routes, Route, useLocation } from "react-router-dom"
import { Suspense, lazy } from "react"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import MobileTabBar from "./components/MobileTabBar"
import { PageLoader } from "./components/ui/Feedback"
import ErrorBoundary from "./components/ErrorBoundary"
import { useAuth } from "./features/auth/authContextValue"

const Home = lazy(() => import("./pages/Home"))
const Events = lazy(() => import("./pages/Events"))
const EventDetail = lazy(() => import("./pages/EventDetail"))
const Whiteboard = lazy(() => import("./pages/Whiteboard"))
const CreateEvent = lazy(() => import("./pages/CreateEvent"))
const EditEvent = lazy(() => import("./pages/EditEvent"))
const Profile = lazy(() => import("./pages/Profile"))
const RegisterForm = lazy(() => import("./features/auth/RegisterForm"))
const LoginForm = lazy(() => import("./features/auth/LoginForm"))
const NotFound = lazy(() => import("./pages/NotFound"))
const About = lazy(() => import("./pages/About"))
const Privacy = lazy(() => import("./pages/Privacy"))
const Terms = lazy(() => import("./pages/Terms"))
const Contact = lazy(() => import("./pages/Contact"))

export default function App() {
  const { isLoading, isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const isFullScreen = pathname.endsWith("/whiteboard")
  const isAuthPage = pathname === "/login" || pathname === "/register"
  const showTabBar = isAuthenticated && !isFullScreen

  return (
    <div className={`flex flex-col ${isFullScreen ? "h-dvh overflow-hidden" : "min-h-dvh"}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main"
        key={pathname}
        className={`flex flex-1 flex-col animate-fade-in ${isFullScreen ? "min-h-0" : ""} ${
          showTabBar ? "pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] md:pb-0" : ""
        }`}
      >
        {isLoading ? (
          <PageLoader />
        ) : (
          <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/create" element={<CreateEvent />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/events/:id/edit" element={<EditEvent />} />
              <Route path="/events/:id/whiteboard" element={<Whiteboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        )}
      </main>
      {!isFullScreen && !isAuthPage && (
        <div className={`mt-auto ${showTabBar ? "hidden md:block" : ""}`}>
          <Footer />
        </div>
      )}
      {showTabBar && <MobileTabBar />}
    </div>
  )
}
