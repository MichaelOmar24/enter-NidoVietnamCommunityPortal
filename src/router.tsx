import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
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
import { WelfarePage } from "./pages/WelfarePage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminMembers } from "./pages/admin/AdminMembers";
import { AdminCompanies } from "./pages/admin/AdminCompanies";
import { AdminGallery } from "./pages/admin/AdminGallery";
import { AdminDocuments } from "./pages/admin/AdminDocuments";
import { AdminActivities } from "./pages/admin/AdminActivities";
import { AdminWelfare } from "./pages/admin/AdminWelfare";
import { AdminDeceased } from "./pages/admin/AdminDeceased";
import { AdminMemberships } from "./pages/admin/AdminMemberships";
import { EmbassyOverview } from "./pages/embassy/EmbassyOverview";
import { EmbassyMembers } from "./pages/embassy/EmbassyMembers";
import { EmbassyPassports } from "./pages/embassy/EmbassyPassports";
import { EmbassyQuery } from "./pages/embassy/EmbassyQuery";
import { EmbassyActivity } from "./pages/embassy/EmbassyActivity";
import { EmbassyWelfare } from "./pages/embassy/EmbassyWelfare";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";

export const routers = [
  { path: "/", name: "home", element: <HomePage /> },
  { path: "/about", name: "about", element: <AboutPage /> },
  { path: "/login", name: "login", element: <LoginPage /> },
  { path: "/reset-password", name: "reset-password", element: <ResetPasswordPage /> },
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
  {
    path: "/welfare",
    name: "welfare",
    element: <ProtectedRoute><WelfarePage /></ProtectedRoute>
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
  {
    path: "/admin/welfare",
    name: "admin-welfare",
    element: <ProtectedRoute adminOnly><AdminWelfare /></ProtectedRoute>
  },
  {
    path: "/admin/deceased",
    name: "admin-deceased",
    element: <ProtectedRoute adminOnly><AdminDeceased /></ProtectedRoute>
  },
  {
    path: "/admin/memberships",
    name: "admin-memberships",
    element: <ProtectedRoute adminOnly><AdminMemberships /></ProtectedRoute>
  },
  {
    path: "/embassy",
    name: "embassy",
    element: <ProtectedRoute embassyOnly><EmbassyOverview /></ProtectedRoute>
  },
  {
    path: "/embassy/members",
    name: "embassy-members",
    element: <ProtectedRoute embassyOnly><EmbassyMembers /></ProtectedRoute>
  },
  {
    path: "/embassy/passports",
    name: "embassy-passports",
    element: <ProtectedRoute embassyOnly><EmbassyPassports /></ProtectedRoute>
  },
  {
    path: "/embassy/query",
    name: "embassy-query",
    element: <ProtectedRoute embassyOnly><EmbassyQuery /></ProtectedRoute>
  },
  {
    path: "/embassy/activity",
    name: "embassy-activity",
    element: <ProtectedRoute embassyOnly><EmbassyActivity /></ProtectedRoute>
  },
  {
    path: "/embassy/welfare",
    name: "embassy-welfare",
    element: <ProtectedRoute embassyOnly><EmbassyWelfare /></ProtectedRoute>
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
