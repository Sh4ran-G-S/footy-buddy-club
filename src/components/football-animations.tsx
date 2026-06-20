import React from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Target } from "lucide-react";

export const FloatingFootball = () => {
  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        rotate: [0, 360],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="fixed bottom-10 right-10 z-50 pointer-events-none opacity-20"
    >
      <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center">
        <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center border-2 border-foreground">
          <div className="w-4 h-4 bg-foreground rotate-45" />
        </div>
      </div>
    </motion.div>
  );
};

export const GoalCelebration = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
    >
      <div className="bg-primary text-primary-foreground px-8 py-4 rounded-full shadow-2xl flex items-center gap-4">
        <Trophy className="size-8 animate-bounce" />
        <h1 className="text-4xl font-black italic tracking-tighter">GOAAAAAL!</h1>
        <Star className="size-8 animate-spin" />
      </div>
    </motion.div>
  );
};

export const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

export const ScoreTracker = ({ score }: { score: number }) => (
  <motion.div
    key={score}
    initial={{ scale: 1.5, color: "var(--primary)" }}
    animate={{ scale: 1, color: "inherit" }}
    className="inline-block font-bold"
  >
    {score}
  </motion.div>
);
