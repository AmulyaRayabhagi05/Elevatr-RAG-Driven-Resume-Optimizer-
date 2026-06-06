import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useProfile, StudentProfile } from "@/context/ProfileContext";
import { Upload, FileText, ArrowRight, CheckCircle2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const steps = [
  { key: "resume", question: "Upload your resume", type: "file", placeholder: "" },
  { key: "target_job", question: "What is your target job / role?", type: "text", placeholder: "e.g. Software Engineer", skipAllowed: true },
  { key: "gre", question: "What is your GRE score?", type: "number", placeholder: "e.g. 320", skipAllowed: true },
  { key: "sop", question: "Paste your Statement of Purpose", type: "textarea", placeholder: "Your SOP text...", skipAllowed: true },
] as const;

const Onboarding = () => {
  const { profile, saveProfileToServer } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<any>({
    name: profile?.name || "",
    major: profile?.major || "",
    gpa: profile?.gpa?.toString() || "",
    target_job: profile?.target_job || "",
    gre: profile?.gre?.toString() || "",
    sop: profile?.sop || "",
    skills: (profile?.skills || []).join(", ") || "",
    coursework: (profile?.coursework || []).join(", ") || "",
    experience: profile?.experience || "",
    projects: profile?.projects || "",
    resumeText: profile?.resumeText || "",
    resumeFileName: profile?.resumeFileName || null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");

  const current = steps[step] ?? steps[0];

  const handleNext = async () => {
    if (step === steps.length - 1) {
      if (!values.resumeText) {
        setError("Please upload your resume before continuing.");
        return;
      }
      setError("");
      setIsSaving(true);
      try {
        const finalProfile: StudentProfile = {
          name: values.name || "",
          email: profile?.email || "",
          major: values.major || "",
          target_job: values.target_job || "",
          current_role: profile?.current_role || "",
          current_org: profile?.current_org || "",
          gpa: parseFloat(values.gpa) || 0,
          gre: values.gre ? parseInt(values.gre, 10) : null,
          sop: values.sop || "",
          experience: values.experience || "",
          projects: values.projects || "",
          resumeText: values.resumeText || "",
          resumeFileName: values.resumeFileName || null,
          skills: values.skills ? values.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          coursework: values.coursework ? values.coursework.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          location_preference: profile?.location_preference || [],
        };

        await saveProfileToServer(finalProfile);
        navigate("/settings", { replace: true });
      } catch (err) {
        console.error("Failed to save profile:", err);
        setError("Failed to save your profile. Please try again.");
      } finally {
        setIsSaving(false);
      }
    } else {
      setError("");
      setStep((s) => s + 1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsParsing(true);

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
      setValues({
        ...values,
        resumeFileName: parsed.resumeFileName || file.name,
        resumeText: parsed.resumeText || "",
        name: parsed.name || profile?.name || "",
        major: parsed.major || profile?.major || "",
        gpa: parsed.gpa?.toString() || profile?.gpa?.toString() || "",
        target_job: parsed.target_job || values.target_job || profile?.target_job || "",
        gre: parsed.gre?.toString() || values.gre || profile?.gre?.toString() || "",
        sop: parsed.sop || values.sop || profile?.sop || "",
        skills: (parsed.skills || profile?.skills || []).join(", "),
        coursework: (parsed.coursework || profile?.coursework || []).join(", "),
        experience: parsed.experience || profile?.experience || "",
        projects: parsed.projects || profile?.projects || "",
      });
    } catch (err: any) {
      setError(err?.message || "Resume parsing failed.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="flex gap-2 mb-12">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-neon" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-display font-bold text-foreground leading-tight">{current.question}</h2>

            <div className="space-y-4">
              {current.type === "file" ? (
                <label className={`glass-card flex flex-col items-center justify-center p-12 cursor-pointer transition-all border-dashed border-2 ${values.resumeFileName ? 'border-neon bg-neon/5' : 'hover:border-neon/50 border-muted'}`}>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.doc,.docx" />

                  {values.resumeFileName ? (
                    <>
                      <FileText className="w-12 h-12 text-neon mb-4 animate-pulse" />
                      <span className="text-foreground font-bold">{values.resumeFileName}</span>
                      <span className="text-muted-foreground text-sm mt-2">Click to replace file</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-neon mb-4" />
                      <span className="text-foreground font-medium">Click to upload resume</span>
                      <p className="text-muted-foreground text-xs mt-2 text-center">PDF or Text files preferred</p>
                    </>
                  )}
                </label>
              ) : current.type === "textarea" ? (
                <textarea
                  className="glass-input min-h-[200px] py-4 resize-none"
                  placeholder={current.placeholder}
                  value={values[current.key] || ""}
                  onChange={(e) => setValues({ ...values, [current.key]: e.target.value })}
                />
              ) : (
                <input
                  type={current.type}
                  className="glass-input"
                  placeholder={current.placeholder}
                  value={values[current.key] || ""}
                  onChange={(e) => setValues({ ...values, [current.key]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
              )}

              {current.type === "file" && values.resumeFileName && (
                <div className="flex flex-col items-center gap-2 text-neon text-sm justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resume captured successfully!</span>
                  {isParsing && <span className="text-muted-foreground">Parsing resume...</span>}
                  {error && <span className="text-destructive">{error}</span>}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {'skipAllowed' in current && current.skipAllowed && (
                <button
                  onClick={() => {
                    setValues({ ...values, [current.key]: "" });
                    setError("");
                    if (step === steps.length - 1) {
                      handleNext();
                    } else {
                      setStep((s) => s + 1);
                    }
                  }}
                  className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-muted-foreground"
                >
                  Skip
                </button>
              )}
              {step > 0 && (
                <button 
                  onClick={() => setStep(s => s - 1)} 
                  className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-muted-foreground"
                >
                  Back
                </button>
              )}
              <button 
                onClick={handleNext} 
                disabled={isSaving || isParsing} 
                className="glow-button flex-1 flex items-center justify-center gap-2"
              >
                {isSaving || isParsing ? "Working..." : step === steps.length - 1 ? "Launch Your Profile" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;