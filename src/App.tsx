import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import LoginAuth from "./pages/LoginAuth";
import SignupAuth from "./pages/SignupAuth";
import ForgotPassword from "./pages/ForgotPassword";
import MainPage from "./pages/MainPage";
import ServerSettings from "./pages/ServerSettings";
import EditProfile from "./pages/EditProfile";
import ChangeProfiles from "./pages/ChangeProfiles";
import MigrateData from "./pages/MigrateData";
import ClearDatabase from "./pages/ClearDatabase";
import Friends from "./pages/Friends";
import Explore from "./pages/Explore";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", element: <Index /> },
    { path: "/login-auth", element: <LoginAuth /> },
    { path: "/signup-auth", element: <SignupAuth /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/main", element: <ProtectedRoute element={<MainPage />} /> },
    { path: "/server/:serverId/settings", element: <ProtectedRoute element={<ServerSettings />} /> },
    { path: "/edit-profile", element: <ProtectedRoute element={<EditProfile />} /> },
    { path: "/change-profiles", element: <ProtectedRoute element={<ChangeProfiles />} /> },
    { path: "/migrate", element: <ProtectedRoute element={<MigrateData />} /> },
    { path: "/clear-database", element: <ClearDatabase /> },
    { path: "/friends", element: <ProtectedRoute element={<Friends />} /> },
    { path: "/explore", element: <ProtectedRoute element={<Explore />} /> },
    { path: "*", element: <NotFound /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
