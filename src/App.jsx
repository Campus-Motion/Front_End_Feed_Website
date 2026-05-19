import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import NewsPage from "./pages/NewsPage.jsx";

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
      <ThemeProvider />
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
