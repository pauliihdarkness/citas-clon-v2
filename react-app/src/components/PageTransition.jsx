import { motion } from 'framer-motion'

const crtVariants = {
  initial: {
    scaleY: 0,
    scaleX: 0,
    opacity: 0,
    filter: 'brightness(10)',
  },
  animate: {
    scaleY: [0, 0.01, 0.01, 1],
    scaleX: [0, 0, 1, 1],
    opacity: [0, 1, 1, 1],
    filter: ['brightness(10)', 'brightness(5)', 'brightness(2)', 'brightness(1)'],
    transition: {
      duration: 0.4,
      times: [0, 0.3, 0.6, 1],
      ease: 'easeInOut',
    },
  },
  exit: {
    scaleY: [1, 0.01, 0.01, 0],
    scaleX: [1, 1, 0, 0],
    opacity: [1, 1, 1, 0],
    filter: ['brightness(1)', 'brightness(2)', 'brightness(5)', 'brightness(10)'],
    transition: {
      duration: 0.4,
      times: [0, 0.4, 0.7, 1],
      ease: 'easeInOut',
    },
  },
}

export function PageTransition({ children }) {
  return (
    <motion.div
      variants={crtVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="page-transition-wrapper"
      style={{ transformOrigin: 'center' }}
    >
      {children}
    </motion.div>
  )
}
