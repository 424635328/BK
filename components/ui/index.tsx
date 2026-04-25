'use client';

import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export function FadeIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({ children, delay = 0, from = 'bottom', className = '' }: { children: ReactNode; delay?: number; from?: 'top' | 'bottom' | 'left' | 'right'; className?: string }) {
  const initial = from === 'top' ? { opacity: 0, y: -30 }
    : from === 'bottom' ? { opacity: 0, y: 30 }
    : from === 'left' ? { opacity: 0, x: -30 }
    : { opacity: 0, x: 30 };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/5',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    outline: 'bg-transparent hover:bg-white/5 text-white border border-white/20',
  };

  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-sm',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>处理中...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
}

export function Input({
  placeholder,
  value,
  onChange,
  error,
  icon,
  className = '',
  type = 'text',
  disabled = false,
  ...props
}: any) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-2 transition-all text-white placeholder-white/30 font-mono ${icon ? 'pl-10' : ''} ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : 'border-white/10 focus:border-amber-500 focus:ring-amber-500/30'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md ${hover ? 'hover:bg-white/10 hover:border-white/20 transition-all' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string }) {
  const variants = {
    default: 'bg-white/10 text-white/70 border border-white/20',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
