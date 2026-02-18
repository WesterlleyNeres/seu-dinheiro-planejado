import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { TourProvider } from "@/contexts/TourContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Wallets from "./pages/Wallets";
import Calendar from "./pages/Calendar";
import Budget from "./pages/Budget";
import Goals from "./pages/Goals";
import Settings from "./pages/Settings";
import Investments from "./pages/Investments";
import Transfers from "./pages/Transfers";
import Reports from "./pages/Reports";
import Import from "./pages/Import";
import FAQ from "./pages/FAQ";
import JarvisDashboard from "./pages/JarvisDashboard";
import JarvisTasks from "./pages/JarvisTasks";
import JarvisCalendar from "./pages/JarvisCalendar";
import JarvisHabits from "./pages/JarvisHabits";
import JarvisReminders from "./pages/JarvisReminders";
import JarvisSettings from "./pages/JarvisSettings";
import JarvisMemory from "./pages/JarvisMemory";
import JarvisChat from "./pages/JarvisChat";
import JarvisProjects from "./pages/JarvisProjects";

// Component to redirect logged users from landing to dashboard
const LandingOrDashboard = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/jarvis/chat" replace />;
  }
  
  return <Landing />;
};

// Wrapper component for protected routes with unified layout
const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <ErrorBoundary>
      <OnboardingGuard>
        <UnifiedLayout>
          {children}
        </UnifiedLayout>
      </OnboardingGuard>
    </ErrorBoundary>
  </ProtectedRoute>
);

// Wrapper for onboarding-allowed routes (like chat during onboarding)
const ProtectedPageNoGuard = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <ErrorBoundary>
      <UnifiedLayout>
        {children}
      </UnifiedLayout>
    </ErrorBoundary>
  </ProtectedRoute>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <TourProvider>
              <Routes>
              <Route path="/" element={<LandingOrDashboard />} />
              <Route path="/auth" element={<Auth />} />
              
            {/* Finance Routes */}
            <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/transactions" element={<ProtectedPage><Transactions /></ProtectedPage>} />
            <Route path="/categories" element={<ProtectedPage><Categories /></ProtectedPage>} />
            <Route path="/wallets" element={<ProtectedPage><Wallets /></ProtectedPage>} />
            <Route path="/calendar" element={<ProtectedPage><Calendar /></ProtectedPage>} />
            <Route path="/budget" element={<ProtectedPage><Budget /></ProtectedPage>} />
            <Route path="/goals" element={<ProtectedPage><Goals /></ProtectedPage>} />
            <Route path="/investments" element={<ProtectedPage><Investments /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPageNoGuard><Settings /></ProtectedPageNoGuard>} />
            <Route path="/transfers" element={<ProtectedPage><Transfers /></ProtectedPage>} />
            <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
            <Route path="/import" element={<ProtectedPage><Import /></ProtectedPage>} />
            <Route path="/faq" element={<ProtectedPage><FAQ /></ProtectedPage>} />
            
            {/* GUTA Routes */}
            <Route path="/jarvis" element={<ProtectedPage><JarvisDashboard /></ProtectedPage>} />
            <Route path="/jarvis/tasks" element={<ProtectedPage><JarvisTasks /></ProtectedPage>} />
            <Route path="/jarvis/calendar" element={<ProtectedPage><JarvisCalendar /></ProtectedPage>} />
            <Route path="/jarvis/habits" element={<ProtectedPage><JarvisHabits /></ProtectedPage>} />
            <Route path="/jarvis/reminders" element={<ProtectedPage><JarvisReminders /></ProtectedPage>} />
            <Route path="/jarvis/projects" element={<ProtectedPage><JarvisProjects /></ProtectedPage>} />
            <Route path="/jarvis/settings" element={<ProtectedPageNoGuard><JarvisSettings /></ProtectedPageNoGuard>} />
            <Route path="/jarvis/memory" element={<ProtectedPage><JarvisMemory /></ProtectedPage>} />
            {/* Chat is always accessible (for onboarding) */}
            <Route path="/jarvis/chat" element={<ProtectedPageNoGuard><JarvisChat /></ProtectedPageNoGuard>} />
            
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </TourProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
