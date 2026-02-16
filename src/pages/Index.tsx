import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Building2, Shield, ArrowRight, CheckCircle } from "lucide-react";

const roles = [
  {
    key: "student",
    label: "Student",
    icon: GraduationCap,
    description: "Register, join hackathons, earn certificates",
    path: "/auth/student",
  },
  {
    key: "organizer",
    label: "Organizer",
    icon: Building2,
    description: "Host hackathons, manage teams, issue certificates",
    path: "/auth/organizer",
  },
  {
    key: "admin",
    label: "Admin",
    icon: Shield,
    description: "Platform management & approvals",
    path: "/auth/admin",
  },
];

const features = [
  "Unique Axon ID for every student",
  "Blockchain-verified certificates",
  "Real-time event group chats",
  "Team registration with Axon IDs",
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-border/50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-mono text-xl font-bold tracking-[0.3em] text-foreground"
        >
          AXON
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-4"
        >
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs tracking-wider"
            onClick={() => navigate("/verify")}
          >
            VERIFY CERTIFICATE
          </Button>
        </motion.div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gradient">
            AXON
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-xl mx-auto">
            Unified Student Hackathon & Blockchain Certificate Verification Platform
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-10">
            {features.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full"
              >
                <CheckCircle className="w-3 h-3 text-foreground" />
                {f}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Role Selection */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="w-full max-w-3xl mx-auto"
        >
          <p className="text-center text-xs font-mono text-muted-foreground tracking-[0.2em] uppercase mb-8">
            Choose your role to continue
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((role, i) => (
              <motion.div
                key={role.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <Button
                  variant="role"
                  className="w-full h-auto py-8 flex flex-col items-center gap-4 group"
                  onClick={() => navigate(role.path)}
                >
                  <role.icon className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-sm font-semibold tracking-wide">{role.label}</span>
                  <span className="text-xs text-muted-foreground font-normal tracking-normal">
                    {role.description}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-8 py-6 text-center">
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          AXON © 2026 — BLOCKCHAIN VERIFIED
        </p>
      </footer>
    </div>
  );
};

export default Index;
