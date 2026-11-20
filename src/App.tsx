import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { BentoOverview } from './components/landing/BentoOverview';
import { DesignSystemDrawer } from './components/layout/DesignSystemDrawer';
import { EditorialModal } from './components/landing/EditorialModal';
import { Footer } from './components/layout/Footer';
import { FourSeasons } from './components/landing/FourSeasons';
import { Header } from './components/layout/Header';
import { HeroSection } from './components/landing/HeroSection';
import { ItineraryPlanner } from './components/planner/ItineraryPlanner';
import { RedEarthStories } from './components/landing/RedEarthStories';
import { ToastNotification } from './components/layout/ToastNotification';
import { AppProvider } from './context/AppContext';
import { BlogPostPage } from './pages/BlogPostPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminPostEditorPage } from './pages/admin/AdminPostEditorPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';

const HomePage: React.FC = () => (
  <>
    <Header />
    <main>
      <HeroSection />
      <BentoOverview />
      <ItineraryPlanner />
      <RedEarthStories />
      <FourSeasons />
    </main>
    <Footer />
  </>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastNotification />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="posts/new" element={<AdminPostEditorPage />} />
            <Route path="posts/:id/edit" element={<AdminPostEditorPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Routes>
        <EditorialModal />
        <DesignSystemDrawer />
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
