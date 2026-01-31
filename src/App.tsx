import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { JarvisLayout } from "@/components/layout/JarvisLayout";
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
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Landing />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <Routes>
            <Route path="/" element={<LandingOrDashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Transactions />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Categories />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallets"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Wallets />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Calendar />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/budget"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Budget />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Goals />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/investments"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Investments />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transfers"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Transfers />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Reports />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/import"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Import />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/faq"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <FAQ />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            {/* JARVIS Routes */}
            <Route
              path="/jarvis"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <JarvisLayout>
                      <JarvisDashboard />
                    </JarvisLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jarvis/tasks"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <JarvisLayout>
                      <JarvisTasks />
                    </JarvisLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jarvis/calendar"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <JarvisLayout>
                      <JarvisCalendar />
                    </JarvisLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jarvis/habits"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <JarvisLayout>
                      <JarvisHabits />
                    </JarvisLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jarvis/reminders"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <JarvisLayout>
                      <JarvisReminders />
                    </JarvisLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jarvis/settings"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <JarvisLayout>
                      <JarvisSettings />
                    </JarvisLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jarvis/memory"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <JarvisLayout>
                      <JarvisMemory />
                    </JarvisLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
