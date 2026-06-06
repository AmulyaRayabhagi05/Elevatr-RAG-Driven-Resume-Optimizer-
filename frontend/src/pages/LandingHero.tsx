import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function LandingHero() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    let t = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / 56);
      const rows = Math.ceil(canvas.height / 56);
      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * 56, y = j * 56;
          const dist = Math.sqrt((x - canvas.width / 2) ** 2 + (y - canvas.height * 0.4) ** 2);
          const wave = Math.sin(dist / 90 - t) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,229,255,${wave * 0.07})`;
          ctx.fill();
        }
      }
      t += 0.01;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <>
      {/* Fixed elements — outside motion.div so they don't animate */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 48px",
        background: "hsl(216 80% 8% / 0.7)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid hsl(0 0% 100% / 0.06)",
      }}>
        <span className="neon-text" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: 600, letterSpacing: "-0.5px" }}>
          elevatr
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="glow-button" onClick={() => navigate("/auth")}>
            Log in
          </button>
        </div>
      </nav>

      <PageDots current={0} navigate={navigate} />

      {/* Only the content animates */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <main style={{
          position: "relative", zIndex: 10,
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "120px 24px 80px",
          gap: "28px",
        }}>
          {/* Badge */}
          <div style={{
            display: "inline-block",
            padding: "6px 18px",
            borderRadius: "100px",
            background: "hsl(186 100% 50% / 0.08)",
            border: "1px solid hsl(186 100% 50% / 0.2)",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "hsl(186 100% 50%)",
          }}>
            AI-Powered Career Platform
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(52px, 9vw, 96px)",
            fontWeight: 700,
            color: "hsl(190 100% 95%)",
            lineHeight: 1.04,
            margin: 0,
            letterSpacing: "-3px",
          }}>
            <span className="neon-text">Elevate</span><br />
            your career.
          </h1>

          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: "clamp(15px, 2vw, 17px)",
            color: "hsl(210 20% 55%)",
            maxWidth: "500px",
            lineHeight: 1.75,
            margin: 0,
          }}>
            Career prep can be chaotic and scattered. Students switch between LinkedIn, Coursera,
            resume templates, and Reddit — trying to come up with a plan. Elevatr changes that.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="glow-button"
              style={{ padding: "12px 32px", fontSize: "14px" }}
              onClick={() => navigate("/auth")}
            >
              Get started
            </button>
            <button
              onClick={() => navigate("/team")}
              style={{
                background: "transparent",
                border: "1px solid hsl(0 0% 100% / 0.08)",
                color: "hsl(210 20% 55%)",
                padding: "12px 28px",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Meet the team →
            </button>
          </div>

          {/* Module pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
            {["Skill Gap Analysis", "Resume Builder", "Job Search", "Grad School", "Interview Prep"].map((m) => (
              <span key={m} style={{
                padding: "4px 12px",
                borderRadius: "100px",
                background: "hsl(216 40% 16% / 0.6)",
                border: "1px solid hsl(0 0% 100% / 0.06)",
                fontSize: "12px",
                color: "hsl(210 20% 55%)",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>{m}</span>
            ))}
          </div>
        </main>
      </motion.div>
    </>
  );
}

export function PageDots({ current, navigate }: { current: number; navigate: ReturnType<typeof useNavigate> }) {
  const pages = ["/", "/team", "/tech-stack", "/difference", "/conclusion"];
  return (
    <div style={{
      position: "fixed", right: "32px", top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: "10px", zIndex: 50,
    }}>
      {pages.map((p, i) => (
        <button
          key={p}
          onClick={() => navigate(p)}
          style={{
            width: i === current ? "8px" : "6px",
            height: i === current ? "24px" : "6px",
            borderRadius: "100px",
            border: "none",
            cursor: "pointer",
            background: i === current ? "hsl(186 100% 50%)" : "hsl(0 0% 100% / 0.15)",
            transition: "all 0.3s ease",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}