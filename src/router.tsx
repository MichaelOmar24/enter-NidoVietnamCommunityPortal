import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { UserDashboard } from "./pages/UserDashboard";
import { ProfilePage } from "./pages/ProfilePage";
import { MembershipPage } from "./pages/MembershipPage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { ConstitutionPage } from "./pages/ConstitutionPage";
import { GalleryPage } from "./pages/GalleryPage";
import { ActivitiesPage } from "./pages/ActivitiesPage";
import { PassportInfoPage } from "./pages/PassportInfoPage";
import { ContactPage } from "./pages/ContactPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminMembers } from "./pages/admin/AdminMembers";
import { AdminCompanies } from "./pages/admin/AdminCompanies";
import { AdminGallery } from "./pages/admin/AdminGallery";
import { AdminDocuments } from "./pages/admin/AdminDocuments";
import { AdminActivities } from "./pages/admin/AdminActivities";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";

export const routers = [
  { path: "/", name: "home", element: <HomePage /> },
  { path: "/about", name: "about", element: <AboutPage /> },
  { path: "/login", name: "login", element: <LoginPage /> },
  { path: "/register", name: "register", element: <RegisterPage /> },
  {
    path: "/dashboard",
    name: "dashboard",
    element: <ProtectedRoute><UserDashboard /></ProtectedRoute>
  },
  {
    path: "/profile",
    name: "profile",
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>
  },
  {
    path: "/membership",
    name: "membership",
    element: <ProtectedRoute><MembershipPage /></ProtectedRoute>
  },
  {
    path: "/constitution",
    name: "constitution",
    element: <ProtectedRoute><ConstitutionPage /></ProtectedRoute>
  },
  { path: "/directory", name: "directory", element: <DirectoryPage /> },
  { path: "/gallery", name: "gallery", element: <GalleryPage /> },
  { path: "/activities", name: "activities", element: <ActivitiesPage /> },
  { path: "/passport-info", name: "passport-info", element: <PassportInfoPage /> },
  { path: "/contact", name: "contact", element: <ContactPage /> },
  {
    path: "/admin",
    name: "admin",
    element: <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
  },
  {
    path: "/admin/members",
    name: "admin-members",
    element: <ProtectedRoute adminOnly><AdminMembers /></ProtectedRoute>
  },
  {
    path: "/admin/companies",
    name: "admin-companies",
    element: <ProtectedRoute adminOnly><AdminCompanies /></ProtectedRoute>
  },
  {
    path: "/admin/gallery",
    name: "admin-gallery",
    element: <ProtectedRoute adminOnly><AdminGallery /></ProtectedRoute>
  },
  {
    path: "/admin/documents",
    name: "admin-documents",
    element: <ProtectedRoute adminOnly><AdminDocuments /></ProtectedRoute>
  },
  {
    path: "/admin/activities",
    name: "admin-activities",
    element: <ProtectedRoute adminOnly><AdminActivities /></ProtectedRoute>
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  { path: "*", name: "404", element: <NotFound /> },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
