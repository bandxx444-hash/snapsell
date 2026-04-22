import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScanProvider } from "@/context/ScanContext";
import ScrollToTop from "@/components/ScrollToTop";
import Footer from "@/components/Footer";
import Index from "./pages/Index.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import UploadPage from "./pages/UploadPage.tsx";
import DiagnosticsPage from "./pages/DiagnosticsPage.tsx";
import LoadingPage from "./pages/LoadingPage.tsx";
import ListingsPreviewPage from "./pages/ListingsPreviewPage.tsx";
import ResultsPage from "./pages/ResultsPage.tsx";
import ListingPage from "./pages/ListingPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScanProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/scan" element={<UploadPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/listings-preview" element={<ListingsPreviewPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/listing" element={<ListingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </ScanProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
