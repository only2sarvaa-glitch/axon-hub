import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Building2, Shield, ArrowRight, CheckCircle, Hexagon } from "lucide-react";

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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-border/50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Hexagon className="w-6 h-6 text-foreground" strokeWidth={1.5} />
          <span className="font-mono text-xl font-bold tracking-[0.3em] text-foreground">AXON</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
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
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-20 relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-foreground/[0.02] blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center max-w-3xl mx-auto mb-20 relative z-10"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 text-gradient">
              AXON
            </h1>
          </motion.div>
          <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-lg mx-auto mb-12">
            Unified Student Hackathon & Blockchain Certificate Verification Platform
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-card border border-border px-4 py-2 rounded-full"
              >
                <CheckCircle className="w-3 h-3 text-foreground/60" />
                {f}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Role Selection */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="w-full max-w-3xl mx-auto relative z-10"
        >
          <p className="text-center text-[10px] font-mono text-muted-foreground tracking-[0.3em] uppercase mb-8">
            Select your role
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((role, i) => (
              <motion.div
                key={role.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <button
                  onClick={() => navigate(role.path)}
                  className="w-full py-10 px-6 flex flex-col items-center gap-4 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-card/80 transition-all group"
                >
                  <role.icon className="w-7 h-7 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                  <span className="text-sm font-semibold tracking-wide">{role.label}</span>
                  <span className="text-[11px] text-muted-foreground font-normal text-center leading-relaxed">
                    {role.description}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-8 py-6 text-center">
        <p className="text-[10px] font-mono text-muted-foreground/60 tracking-[0.3em]">
          AXON © 2026 — POLYGON BLOCKCHAIN VERIFIED
        </p>
      </footer>
    </div>
  );
};

export default Index;
