import type { ResumeData } from './resume-data';

export interface ResumeAnalysisUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ResumeAnalysis {
  data: ResumeData;
  costBrl: number;
  usage: ResumeAnalysisUsage;
}
