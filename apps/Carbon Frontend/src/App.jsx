// ============================================================
//  src/App.jsx — Carbon site routes
// ============================================================

import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import Home from './pages/Home';
import Create from './pages/Create';
import VideoResult from './pages/VideoResult';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import { PrivacyPolicy, Terms } from './pages/Legal';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './lib/auth';
import RequireAuth from './components/site/RequireAuth';
import RoastPage from './components/RoastPage';
// Go deeper pulls in the diagram libraries (mermaid, 3D graph): load it on demand.
const GoDeeper = lazy(() => import('./pages/GoDeeper'));
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './index.css';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<RequireAuth><Create /></RequireAuth>} />
            <Route path="/v/:id" element={<VideoResult />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/app" element={<Suspense fallback={<div className="cx" />}><GoDeeper /></Suspense>} />
            <Route path="/roast" element={<RoastPage />} />
            <Route path="/roast/:id" element={<RoastPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Analytics />
        <SpeedInsights />
      </AuthProvider>
    </ErrorBoundary>
  );
}
