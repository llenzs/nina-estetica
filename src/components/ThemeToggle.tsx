import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggle}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-card/60 hover:bg-card transition-colors ${className || ''}`}
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label="Alternar tema"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 18 }}
      >
        {isDark
          ? <Moon className="w-4 h-4 text-foreground" />
          : <Sun className="w-4 h-4 text-foreground" />
        }
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;
