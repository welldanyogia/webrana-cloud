"use client";

import { Variants, Easing } from "framer-motion";

/**
 * Standard Motion Configuration
 * Consistent timing and easing for the entire application
 */
export const motionConfig = {
  transition: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  },
  transitionSlow: {
    duration: 0.5,
    ease: "easeInOut" as Easing,
  },
  transitionFast: {
    duration: 0.2,
    ease: "easeInOut" as Easing,
  },
};

/**
 * Common Animation Variants
 */

// Fade In Up - Standard entrance animation
export const fadeInUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: motionConfig.transitionSlow
  },
};

// Stagger Container - For lists and grids
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Scale In - For modals, cards, and focus elements
export const scaleIn: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: motionConfig.transition
  },
};

// Slide In Right - For drawers and sidebars
export const slideInRight: Variants = {
  hidden: { 
    x: "100%",
    opacity: 0
  },
  visible: { 
    x: 0,
    opacity: 1,
    transition: motionConfig.transitionSlow
  },
};

// Hover Effects
export const hoverScale = {
  scale: 1.02,
  transition: motionConfig.transitionFast
};

export const hoverLift = {
  y: -4,
  transition: motionConfig.transitionFast
};
