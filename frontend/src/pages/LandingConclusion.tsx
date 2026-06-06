import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageDots } from "./LandingHero";

export default function LandingConclusion() {
  const navigate = useNavigate();

  return (
    <>
      <PageDots current={4} navigate={navigate} />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.45 }}
        className="min-h-screen flex items-center px-6 bg-background text-foreground"
      >
        <div className="max-w-3xl mx-auto text-center py-20">

          <p className="uppercase text-sm tracking-widest text-primary mb-4">The future</p>

          <h1 className="neon-text font-display font-extrabold text-5xl md:text-6xl mb-6">We're just getting started.</h1>

          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "18px", lineHeight: 1.7 }}>
            Browse verified openings, generate tailored resumes and cover letters from any job description, get instant interview prep and feedback, then apply with one click. Next: deploy campus-wide at UTD and license Elevatr to universities nationwide.
          </p>

        </div>
      </motion.section>
    </>
  );
}
