import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import DicePage from "@/pages/dice-page";
import CrashPage from "@/pages/crash-page";
import PokerPage from "@/pages/poker-page";
import GameHistoryPage from "@/pages/game-history-page";
import { AuthProvider } from "@/hooks/use-auth";
import { GameProvider } from "@/hooks/use-game";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/dice" component={DicePage} />
      <ProtectedRoute path="/crash" component={CrashPage} />
      <ProtectedRoute path="/poker" component={PokerPage} />
      <ProtectedRoute path="/history" component={GameHistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GameProvider>
          <Router />
          <Toaster />
        </GameProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
