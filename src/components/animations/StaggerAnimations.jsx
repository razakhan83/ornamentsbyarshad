'use client';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring', stiffness: 300, damping: 24 } 
  },
};

export function StaggerContainer({ children, className = '', once = true, delay = 0, as = 'div' }) {
  const customContainerVariants = {
    ...containerVariants,
    show: {
      ...containerVariants.show,
      transition: {
        ...containerVariants.show.transition,
        delayChildren: delay,
      }
    }
  };

  const Component = motion[as] || motion.div;

  return (
    <Component
      variants={customContainerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-50px" }}
      className={className}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className = '', as = 'div', ...props }) {
  const Component = motion[as] || motion.div;
  return (
    <Component variants={itemVariants} className={className} {...props}>
      {children}
    </Component>
  );
}
