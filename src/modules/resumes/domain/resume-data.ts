export interface ResumeExperience {
  role?: string;
  company?: string;
  period?: string;
  description?: string[];
}

export interface ResumeEducation {
  course?: string;
  status?: string;
  institution?: string;
  period?: string;
}

export interface ResumeLocation {
  city?: string;
  state?: string;
}

export interface ResumeData {
  fullName?: string;
  email?: string;
  phones?: string[];
  summary?: string;
  role?: string;
  skills?: string[];
  qualifications?: string;
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  language?: string[];
  courses?: string[];
  location?: ResumeLocation;
  confidence?: number;
}

export interface ResumeSearchableFields {
  query: string;
  skills: string;
  title: string;
  city: string;
  degree: string;
  languages: string;
}
