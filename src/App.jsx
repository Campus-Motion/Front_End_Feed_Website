import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import NewsPage from "./pages/NewsPage.jsx";
import SignInPage from "./pages/SignInPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import MyEventsPage from "./pages/MyEventsPage.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { MyEventsProvider } from "./auth/MyEventsContext.jsx";

// Apply saved theme before first paint
function ThemeProvider() {
  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const saved = window.__cmTheme || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", saved);
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MyEventsProvider>
          <ThemeProvider />
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<FeedPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/my-events" element={<MyEventsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </MyEventsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
