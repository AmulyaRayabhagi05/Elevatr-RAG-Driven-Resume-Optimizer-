import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider } from "@/context/ProfileContext";
import { AuthProvider } from "@/context/AuthContext";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import OrchestratorPage from "./pages/OrchestratorPage";
import SimulatorPage from "./pages/SimulatorPage";
import JobSearchPage from "./pages/JobSearchPage";
import GradPage from "./pages/GradPage";
import AboutPage from "./pages/AboutPage";
import TechStackPage from "./pages/TechStackPage";
import NotFound from "./pages/NotFound";
import LandingHero from "./pages/LandingHero";
import LandingTeam from "./pages/LandingTeam";
import LandingDifference from "./pages/LandingDifference";
import LandingConclusion from "./pages/LandingConclusion";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingHero />} />
        <Route path="/team" element={<LandingTeam />} />
        <Route path="/difference" element={<LandingDifference />} />
        <Route path="/conclusion" element={<LandingConclusion />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/orchestrator" element={<OrchestratorPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/jobs" element={<JobSearchPage />} />
        <Route path="/grad" element={<GradPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/tech-stack" element={<TechStackPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
