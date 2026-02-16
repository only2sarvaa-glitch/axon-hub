import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentAuth from "./pages/StudentAuth";
import OrganizerAuth from "./pages/OrganizerAuth";
import AdminAuth from "./pages/AdminAuth";
import StudentDashboard from "./pages/StudentDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CertificateVerify from "./pages/CertificateVerify";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Community from "./pages/Community";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/student" element={<StudentAuth />} />
          <Route path="/auth/organizer" element={<OrganizerAuth />} />
          <Route path="/auth/admin" element={<AdminAuth />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/verify" element={<CertificateVerify />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/community" element={<Community />} />
          <Route path="*" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
