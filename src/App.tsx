import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
