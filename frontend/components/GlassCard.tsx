'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, 'children'> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({ children, className = '', hover = true, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={`glass rounded-3xl p-6 relative overflow-hidden ${className}`}
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {/* Top highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      
      {children}
    </motion.div>
  );
}
