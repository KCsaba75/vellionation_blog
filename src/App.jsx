import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Layout from '@/components/Layout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { Toaster } from '@/components/ui/toaster';
import CookieConsentPopup from '@/components/CookieConsentPopup';
import TrackingScripts from '@/components/TrackingScripts';

const HomePage = lazy(() => import('@/pages/HomePage'));
const BlogPage = lazy(() => import('@/pages/BlogPage'));
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'));
const CommunityPage = lazy(() => import('@/pages/CommunityPage'));
const SolutionsPage = lazy(() => import('@/pages/SolutionsPage'));
const SolutionDetailPage = lazy(() => import('@/pages/SolutionDetailPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const BlogDashboardPage = lazy(() => import('@/pages/BlogDashboardPage'));
const StaticPage = lazy(() => import('@/pages/StaticPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const UnsubscribePage = lazy(() => import('@/pages/UnsubscribePage'));
const AffiliatDisclosurePage = lazy(() => import('@/pages/AffiliatDisclosurePage'));

function App() {
  return (
    <ThemeProvider>
      <CookieConsentProvider>
        <AuthProvider>
          <Helmet>
            <title>Vellio Nation - Your Health & Wellness Community</title>
            <meta name="description" content="Join Vellio Nation - a modern wellness community focused on healthy living, weight loss, and mindful lifestyle transformation." />
          </Helmet>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="blog/:slug" element={<BlogPostPage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="solutions" element={<SolutionsPage />} />
              <Route path="solutions/:slug" element={<SolutionDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="dashboard/write" element={<BlogDashboardPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="help-center" element={<StaticPage pageKey="page_content_help" />} />
              <Route path="privacy-policy" element={<StaticPage pageKey="page_content_privacy" />} />
              <Route path="terms-of-service" element={<StaticPage pageKey="page_content_terms" />} />
              <Route path="unsubscribe" element={<UnsubscribePage />} />
              <Route path="affiliate-disclosure" element={<AffiliatDisclosurePage />} />
            </Route>
          </Routes>
          <CookieConsentPopup />
          <TrackingScripts />
          <Toaster />
        </AuthProvider>
      </CookieConsentProvider>
    </ThemeProvider>
  );
}

export default App;
