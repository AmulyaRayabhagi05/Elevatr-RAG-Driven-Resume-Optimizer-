import { useNavigate } from "react-router-dom";
import { PageDots } from "./LandingHero";
import { motion } from "framer-motion";

import donghyukImg from "../assets/donghyuk_jang.jpeg";
import amulyaImg from "../assets/amulya_rayabhagi.png";
import tarunImg from "../assets/tarun.png";
import divyaImg from "../assets/divya.png";
import pavanImg from "../assets/pavan.jpg";
import ayeshaImg from "../assets/ayesha.jpg";
import rishiImg from "../assets/rishi.png";
import adyaImg from "../assets/adya.jpg";

const TEAM = [
  // Added initials "DJ" here to prevent potential crashes
  { name: "Tyler", role: "Orchestrator & Backend", initials: "DJ", img: donghyukImg as string | null },
  { name: "Amulya", role: "Resume Builder Module", initials: "T2", img: amulyaImg as string | null },
  { name: "Tarun", role: "Skill Gap Module", initials: "T3", img: tarunImg as string | null },
  { name: "Divya", role: "Job Search Module", initials: "T4", img: divyaImg as string | null },
  { name: "Ayesha", role: "Grad School Prep Module", initials: "T5", img: ayeshaImg as string | null },
  { name: "Rishi", role: "Interview Prep Module", initials: "T6", img: rishiImg as string | null },
];

const MENTORS = [
  { name: "Pavan", initials: "PA", img: pavanImg as string | null },
  { name: "Adya", initials: "AD", img: adyaImg as string | null },
];

function Avatar({ img, initials, size = 72 }: { img: string | null; initials: string; size?: number }) {
  const sharedStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    border: "2px solid hsl(186 100% 50% / 0.35)",
    boxShadow: "0 0 16px hsl(186 100% 50% / 0.15)",
    margin: "0 auto 18px",
    flexShrink: 0,
  };

  if (img) {
    return (
      <div style={{ ...sharedStyle, overflow: "hidden" }}>
        <img src={img} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }

  return (
    <div style={{
      ...sharedStyle,
      background: "hsl(186 100% 50% / 0.08)",
      color: "hsl(186 100% 50%)",
      fontSize: size > 72 ? "20px" : "16px",
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {initials}
    </div>
  );
}

export default function LandingTeam() {
  const navigate = useNavigate();

  return (
    <> {/* <--- Added Fragment Start */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 48px",
        background: "hsl(216 80% 8% / 0.7)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid hsl(0 0% 100% / 0.06)",
      }}>
        <span
          className="neon-text"
          onClick={() => navigate("/")}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "20px", fontWeight: 600, letterSpacing: "-0.5px",
            cursor: "pointer",
          }}
        >
          elevatr
        </span>
        <button className="glow-button" onClick={() => navigate("/auth")}>
          Log in
        </button>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "100px 24px" }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto", width: "100%" }}>

          {/* Header */}
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(186 100% 50%)", margin: "0 0 16px" }}>
            Who we are
          </p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, color: "hsl(190 100% 95%)", lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-1.5px" }}>
            Built by students,<br />for students.
          </h1>
          <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "16px", color: "hsl(210 20% 55%)", lineHeight: 1.75, maxWidth: "520px", margin: "0 0 48px" }}>
            We felt the pain of career prep firsthand. We decided to make everyones' lives easier.
          </p>

          {/* Team grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "56px" }}>
            {TEAM.map((member) => (
              <div key={member.name} className="glass-card" style={{ padding: "32px 24px", textAlign: "center" }}>
                <Avatar img={member.img} initials={member.initials} size={140} />
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 600, color: "hsl(190 100% 95%)", margin: "0 0 6px" }}>{member.name}</h3>
                <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "14px", color: "hsl(186 100% 50%)", margin: "0 0 12px", fontWeight: 500 }}>{member.role}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "40px" }}>
            <div style={{ flex: 1, height: "1px", background: "hsl(0 0% 100% / 0.06)" }} />
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(210 20% 35%)", margin: 0, whiteSpace: "nowrap" }}>
              Mentors
            </p>
            <div style={{ flex: 1, height: "1px", background: "hsl(0 0% 100% / 0.06)" }} />
          </div>

          {/* Mentors row */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
            {MENTORS.map((mentor) => (
              <div key={mentor.name} className="glass-card" style={{ padding: "32px 40px", textAlign: "center", minWidth: "200px" }}>
                <Avatar img={mentor.img} initials={mentor.initials} size={140} />
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 600, color: "hsl(190 100% 95%)", margin: 0 }}>
                  {mentor.name}
                </h3>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "48px" }}>
            <button className="glow-button" onClick={() => navigate("/tech-stack")}>
              Tech Stack →
            </button>
          </div>
        </div>

        <PageDots current={1} navigate={navigate} />
      </motion.div>
    </> // <--- Added Fragment End
  );
}