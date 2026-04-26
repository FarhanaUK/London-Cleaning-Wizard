import { useRef, useState, useEffect } from "react";

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

export default function Reveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  // Stay visible for first 150ms so IntersectionObserver can fire before
  // we hide anything — prevents above-fold elements flashing invisible.
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 150); return () => clearTimeout(t); }, []);

  const visible = !ready || inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(28px)",
        transition: ready ? `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms` : "none",
      }}
    >
      {children}
    </div>
  );
}
