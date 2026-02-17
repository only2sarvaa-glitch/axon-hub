import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Building2, Shield, ArrowRight, CheckCircle, Hexagon, Zap, Users, Award, MessageSquare } from "lucide-react";
import FloatingDots from "@/components/FloatingDots";

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
  { icon: Zap, text: "Unique Axon ID for every student" },
  { icon: Award, text: "Blockchain-verified certificates" },
  { icon: MessageSquare, text: "Real-time event group chats" },
  { icon: Users, text: "Team registration with Axon IDs" },
];

const stats = [
  { value: "Polygon", label: "Blockchain" },
  { value: "SHA256", label: "Verification" },
  { value: "Axon ID", label: "Identity" },
  { value: "Amoy", label: "Testnet" },
];

const Index = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 50, damping: 20 });
  const springY = useSpring(cursorY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative">
      <FloatingDots />

      {/* Cursor glow */}
      <motion.div
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none z-[1]"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          background: "radial-gradient(circle, hsl(0 0% 100% / 0.03) 0%, transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-border/50 relative z-10">
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
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs tracking-wider"
            onClick={() => navigate("/community")}
          >
            COMMUNITY
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs tracking-wider"
            onClick={() => navigate("/verify")}
          >
            VERIFY
          </Button>
        </motion.div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          {/* Animated logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative inline-block mb-8"
          >
            <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-gradient">
              AXON
            </h1>
            {/* Glow behind text */}
            <div className="absolute inset-0 text-7xl md:text-9xl font-bold tracking-tighter text-foreground/5 blur-[40px] select-none pointer-events-none" aria-hidden>
              AXON
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-lg mx-auto mb-10"
          >
            Unified Student Hackathon & Polygon Blockchain Certificate Verification Platform
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-8 mb-12"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="text-center"
              >
                <p className="text-xl md:text-2xl font-bold font-mono tracking-tight">{s.value}</p>
                <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-card/80 border border-border/60 px-4 py-2 rounded-full backdrop-blur-sm"
              >
                <f.icon className="w-3 h-3 text-foreground/50" />
                {f.text}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Role Selection */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="w-full max-w-3xl mx-auto"
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
                transition={{ delay: 0.9 + i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <button
                  onClick={() => navigate(role.path)}
                  className="w-full py-10 px-6 flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-foreground/20 hover:bg-card/80 transition-all group relative overflow-hidden"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-foreground/[0.03] to-transparent" />
                  <role.icon className="w-7 h-7 text-muted-foreground group-hover:text-foreground transition-colors relative z-10" strokeWidth={1.5} />
                  <span className="text-sm font-semibold tracking-wide relative z-10">{role.label}</span>
                  <span className="text-[11px] text-muted-foreground font-normal text-center leading-relaxed relative z-10">
                    {role.description}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all relative z-10" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-8 py-6 text-center relative z-10">
        <p className="text-[10px] font-mono text-muted-foreground/60 tracking-[0.3em]">
          AXON © 2026 — POWERED BY POLYGON BLOCKCHAIN
        </p>
      </footer>
    </div>
  );
};

export default Index;
