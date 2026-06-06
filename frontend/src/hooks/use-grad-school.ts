import { useState } from "react";

export interface GradProgram {
  university: string;
  program: string;
  fit_score: number;
  requirements: {
    gpa: number;
    gre: number;
    deadline: string;
  };
  sop: string;
}

export const useGradSchool = () => {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<GradProgram[]>([]);

  const searchPrograms = async (profile?: any) => {
    setLoading(true);

    await new Promise((r) => setTimeout(r, 800));

    const gpa = profile?.gpa ?? 3.73;
    const gre = profile?.gre ?? 310;

    const response: { programs: GradProgram[] } = {
      programs: [
        {
          university: "Georgia Tech",
          program: "MS Computer Science (Machine Learning / Systems)",
          fit_score: 0.94,
          requirements: {
            gpa: 3.2,
            gre: 305,
            deadline: "2027-01-01",
          },
          sop:
            "Strong alignment with distributed systems, multi-agent AI architectures, and scalable backend engineering using FastAPI and cloud-native systems. Experience in ML classification pipelines and production-level system design makes this an excellent fit.",
        },
        {
          university: "UIUC",
          program: "MS Computer Science",
          fit_score: 0.92,
          requirements: {
            gpa: 3.5,
            gre: 315,
            deadline: "2026-11-30",
          },
          sop:
            "Strong foundation in algorithms, machine learning, and database systems complemented by hands-on experience in AI orchestration and full-stack distributed systems.",
        },
        {
          university: "UT Austin",
          program: "MS Computer Science",
          fit_score: 0.90,
          requirements: {
            gpa: 3.3,
            gre: 310,
            deadline: "2026-12-15",
          },
          sop:
            "Solid software engineering and backend systems experience with strong exposure to identity access management, secure systems, and scalable full-stack architectures.",
        },
        {
          university: "UCLA",
          program: "MS Computer Science",
          fit_score: 0.88,
          requirements: {
            gpa: 3.4,
            gre: 312,
            deadline: "2026-12-10",
          },
          sop:
            "Experience in AI-driven systems, cloud-native pipelines, and full-stack development aligns well with UCLA’s focus on applied computer science and intelligent systems.",
        },
        {
          university: "NYU",
          program: "MS Computer Science",
          fit_score: 0.85,
          requirements: {
            gpa: 3.3,
            gre: 308,
            deadline: "2026-12-20",
          },
          sop:
            "Strong applied engineering background in machine learning systems, distributed workflows, and scalable web architectures makes this a competitive match.",
        },
      ],
    };

    // adjust scores slightly based on profile
    response.programs = response.programs.map((p) => {
      let boost = 0;

      if (gpa >= 3.7) boost += 0.02;
      if (gre >= 310) boost += 0.02;
      if (p.university === "Georgia Tech") boost += 0.01;

      return {
        ...p,
        fit_score: Math.min(0.99, p.fit_score + boost),
      };
    });

    setPrograms(response.programs);
    setLoading(false);

    return response.programs;
  };

  return {
    programs,
    loading,
    searchPrograms,
  };
};
