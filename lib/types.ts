export type ReportType = "paid" | "refused";
export type PaymentMode = "cash" | "upi" | "other";
export type Outcome = "done" | "partial" | "not_done";

export interface Report {
  id: string;
  reportType: ReportType;
  departmentSlug: string;
  department: string;
  service?: string;
  officialRole?: string;
  amount: number; // INR, 0 for refused
  mode?: PaymentMode;
  state: string;
  city: string;
  date: string; // ISO yyyy-mm-dd (date of incident)
  note?: string;
  outcome: Outcome;
  createdAt: string; // ISO timestamp
  helpfulCount: number;
  fakeCount: number;
  status: "published" | "held" | "removed";
  publicId?: string; // CP-XXXX
  tier?: "reported" | "corroborated" | "evidence_backed";
  stateCode?: string;
  clusterSize?: number;
}

export interface Department {
  slug: string;
  name: string;
  short: string;
}

export interface StateStat {
  state: string;
  count: number;
  avgAmount: number;
  refusalRate: number; // 0..1 of reports that are refusals
  topDepartment?: string;
}

export interface CityStat {
  city: string;
  state: string;
  totalAmount: number;
  count: number;
  topDepartment?: string;
}

export interface RefusalStat {
  state: string;
  refused: number;
  gotService: number;
  successRate: number; // 0..1
}

export interface DeptStat {
  slug: string;
  name: string;
  count: number;
  avgAmount: number;
  medianAmount: number;
  refusalRate: number;
  refusalSuccessRate: number;
}

export interface SiteStats {
  totalReports: number;
  citiesCovered: number;
  refusedGotServiceRate: number;
  topDepartments: { slug: string; name: string; count: number }[];
  latest?: Report;
  featured?: Report;
}

export interface ReportQuery {
  state?: string;
  dept?: string;
  city?: string;
  q?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: ReportType;
  page?: number;
  limit?: number;
}

export interface NewReportInput {
  reportType: ReportType;
  departmentSlug: string;
  service?: string;
  officialRole?: string;
  amount: number;
  mode?: PaymentMode;
  state: string;
  city: string;
  date: string;
  note?: string;
  outcome: Outcome;
}
