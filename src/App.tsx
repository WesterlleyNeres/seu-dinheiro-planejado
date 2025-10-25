import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold mb-2">Lançamentos</h1>
                      <p className="text-muted-foreground">Em breve</p>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold mb-2">Calendário</h1>
                      <p className="text-muted-foreground">Em breve</p>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/budget"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold mb-2">Orçamento</h1>
                      <p className="text-muted-foreground">Em breve</p>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold mb-2">Metas</h1>
                      <p className="text-muted-foreground">Em breve</p>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold mb-2">Relatórios</h1>
                      <p className="text-muted-foreground">Em breve</p>
                    </div>
                  </AppLayout>
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
