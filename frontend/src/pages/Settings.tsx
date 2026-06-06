import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useProfile, StudentProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Save, Upload, FileText, Trash2, LogOut } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const Settings = () => {
  const { profile, saveProfileToServer, clearProfile } = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // State initialized with profile data or defaults
  const [name, setName] = useState(profile?.name || "");
  const [major, setMajor] = useState(profile?.major || "");
  const [targetJob, setTargetJob] = useState(profile?.target_job || "");
  const [currentRole, setCurrentRole] = useState(profile?.current_role || "");
  const [currentOrg, setCurrentOrg] = useState(profile?.current_org || "");
  const [gpa, setGpa] = useState(profile?.gpa?.toString() || "");
  const [gre, setGre] = useState(profile?.gre?.toString() || "");
  const [sop, setSop] = useState(profile?.sop || "");
  const [experience, setExperience] = useState(profile?.experience || "");
  const [projects, setProjects] = useState(profile?.projects || "");
  const [skills, setSkills] = useState(profile?.skills?.join(", ") || "");
  const [coursework, setCoursework] = useState(profile?.coursework?.join(", ") || "");
  const [locationPref, setLocationPref] = useState(profile?.location_preference?.join(", ") || "");
  const [resumeFileName, setResumeFileName] = useState(profile?.resumeFileName || null);
  const [resumeText, setResumeText] = useState(profile?.resumeText || "");
  
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsSaving(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token missing.");

      const res = await fetch(`${API_BASE}/profile/parse_resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.detail || "Unable to parse resume. Please try another file.");
      }

      const parsed = await res.json();
      setResumeFileName(parsed.resumeFileName || file.name);
      setResumeText(parsed.resumeText || "");
      setName(parsed.name || name);
      setMajor(parsed.major || major);
      setGpa(parsed.gpa?.toString() || gpa);
      setSkills((parsed.skills || []).join(", ") || skills);
      setCoursework((parsed.coursework || []).join(", ") || coursework);
      setExperience(parsed.experience || experience);
      setProjects(parsed.projects || projects);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message ?? "Unable to parse resume file.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResume = () => {
    setResumeFileName(null);
    setResumeText("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    const updates: StudentProfile = {
      name,
      email: profile?.email || "",
      major,
      target_job: targetJob,
      current_role: currentRole,
      current_org: currentOrg,
      gpa: parseFloat(gpa) || 0,
      gre: gre ? parseInt(gre) : null,
      sop,
      experience,
      projects,
      resumeFileName,
      resumeText,
      // Convert comma-separated strings back to Arrays
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      coursework: coursework.split(",").map((s) => s.trim()).filter(Boolean),
      location_preference: locationPref.split(",").map((s) => s.trim()).filter(Boolean),
    };

    try {
      // Pass updates DIRECTLY to avoid stale state issues
      await saveProfileToServer(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message ?? "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

const handleLogout = async () => {
  clearProfile();
  signOut();
  navigate("/auth", { replace: true });
};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <button 
            onClick={() => navigate("/dashboard")} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-destructive hover:opacity-80 transition-opacity font-body text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </header>

        <div className="glass-card p-8 space-y-10">
          <section className="space-y-6">
            <h2 className="text-xl font-display font-bold text-foreground border-b border-white/10 pb-2">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Major</label>
                <input value={major} onChange={(e) => setMajor(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">GPA</label>
                <input type="number" value={gpa} onChange={(e) => setGpa(e.target.value)} className="glass-input" step="0.01" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">GRE Score</label>
                <input type="number" value={gre} onChange={(e) => setGre(e.target.value)} className="glass-input" />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-display font-bold text-foreground border-b border-white/10 pb-2">Career & Background</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Target Job</label>
                <input value={targetJob} onChange={(e) => setTargetJob(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Role</label>
                <input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Org</label>
                <input value={currentOrg} onChange={(e) => setCurrentOrg(e.target.value)} className="glass-input" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Skills (comma separated)</label>
              <input value={skills} onChange={(e) => setSkills(e.target.value)} className="glass-input" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Location Preferences (comma separated)</label>
              <input value={locationPref} onChange={(e) => setLocationPref(e.target.value)} className="glass-input" />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Experience</label>
              <textarea value={experience} onChange={(e) => setExperience(e.target.value)} className="glass-input min-h-[120px] py-3" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Projects</label>
              <textarea value={projects} onChange={(e) => setProjects(e.target.value)} className="glass-input min-h-[120px] py-3" />
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-display font-bold text-foreground border-b border-white/10 pb-2">Documents</h2>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Statement of Purpose</label>
              <textarea value={sop} onChange={(e) => setSop(e.target.value)} className="glass-input min-h-[200px] py-3 font-body text-sm leading-relaxed" />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">Resume</label>
              {resumeFileName ? (
                <div className="flex items-center justify-between p-4 glass-card bg-white/5 border-neon/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neon/10 text-neon"><FileText className="w-5 h-5" /></div>
                    <span className="text-sm font-medium">{resumeFileName}</span>
                  </div>
                  <button onClick={handleDeleteResume} className="p-2 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="glass-card flex flex-col items-center justify-center p-8 border-dashed border-2 cursor-pointer hover:border-neon/40 transition-all">
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground">Upload New Resume</p>
                </label>
              )}
            </div>
          </section>

          {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

          <div className="flex items-center gap-4 pt-6">
            <button onClick={handleSave} disabled={isSaving} className="glow-button flex items-center gap-2 px-8">
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save All Changes"}
            </button>
            {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neon text-sm font-medium">✓ Changes saved successfully</motion.span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;