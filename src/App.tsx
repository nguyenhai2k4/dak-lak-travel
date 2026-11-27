import React from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AiChatPopup } from './components/ai/AiChatPopup';
import { FloatingBackpackFab } from './components/backpack/FloatingBackpackFab';
import { TripBackpackDrawer } from './components/backpack/TripBackpackDrawer';
import { BentoOverview } from './components/landing/BentoOverview';
import { EditorialModal } from './components/landing/EditorialModal';
import { FourSeasons } from './components/landing/FourSeasons';
import { HeroSection } from './components/landing/HeroSection';
import { RedEarthStories } from './components/landing/RedEarthStories';
import { DesignSystemDrawer } from './components/layout/DesignSystemDrawer';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { ToastNotification } from './components/layout/ToastNotification';
import { ItineraryCanvasModal } from './components/planner/ItineraryCanvasModal';
import { ItineraryPlanner } from './components/planner/ItineraryPlanner';
import { AppProvider, useAppContext } from './context/AppContext';
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

const GlobalOverlays: React.FC = () => {
  const { isSubmitted } = useAppContext();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <FloatingBackpackFab />}
      {!isAdmin && <TripBackpackDrawer />}
      {!isAdmin && isSubmitted && <ItineraryCanvasModal />}
      {!isAdmin && isSubmitted && <AiChatPopup />}
      <EditorialModal />
      <DesignSystemDrawer />
    </>
  );
};

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
        <GlobalOverlays />
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
