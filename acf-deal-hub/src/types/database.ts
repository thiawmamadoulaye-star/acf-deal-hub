// Types TypeScript reflétant le schéma Supabase (ACF DEAL HUB)

export type AppRole = 'super_admin' | 'partner' | 'manager' | 'analyst' | 'client' | 'investor'
export type CompanyType = 'client' | 'target' | 'partner' | 'other'
export type InvestorType = 'bank' | 'private_equity' | 'dfi' | 'family_office' | 'insurer' | 'sovereign_fund' | 'venture_capital' | 'other'
export type MandateType = 'debt_raising' | 'equity_raising' | 'project_finance' | 'restructuring' | 'ma_advisory' | 'strategy_advisory' | 'other'
export type MandateStatus = 'draft' | 'active' | 'due_diligence' | 'negotiation' | 'closing' | 'closed_won' | 'closed_lost' | 'on_hold'
export type DealStage = 'origination' | 'qualification' | 'mandate_signed' | 'analysis' | 'structuring' | 'due_diligence' | 'negotiation' | 'term_sheet' | 'closing' | 'post_closing' | 'lost'
export type DocumentCategory = 'financial_statements' | 'business_plan' | 'contracts' | 'legal' | 'tax' | 'esg' | 'due_diligence' | 'term_sheet' | 'nda' | 'other'
export type SolicitationStatus = 'identified' | 'contacted' | 'nda_signed' | 'interested' | 'declined' | 'committed' | 'funded'

export interface Profile {
  id: string
  organization_id: string | null
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: AppRole
  avatar_url: string | null
  is_active: boolean
  investor_id: string | null
  is_group_admin: boolean
  created_at: string
}

export interface Company {
  id: string
  organization_id: string
  name: string
  company_type: CompanyType
  sector: string | null
  country: string | null
  city: string | null
  website: string | null
  phone: string | null
  email: string | null
  annual_revenue: number | null
  currency: string
  status: string
  notes: string | null
  created_at: string
}

export interface Contact {
  id: string
  organization_id: string
  company_id: string | null
  first_name: string
  last_name: string
  position: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
}

export interface Investor {
  id: string
  organization_id: string
  name: string
  investor_type: InvestorType
  country: string | null
  sector_focus: string[] | null
  ticket_min: number | null
  ticket_max: number | null
  currency: string
  contact_name: string | null
  contact_email: string | null
  is_active: boolean
}

export interface Mandate {
  id: string
  organization_id: string
  reference: string
  title: string
  client_id: string
  mandate_type: MandateType
  amount_requested: number | null
  currency: string
  success_fee_rate: number | null
  start_date: string
  target_close_date: string | null
  actual_close_date: string | null
  status: MandateStatus
  description: string | null
  sector: string | null
  owner_id: string | null
  created_at: string
  client?: Company
  owner?: Profile
}

export interface Deal {
  id: string
  organization_id: string
  mandate_id: string
  deal_name: string
  deal_value: number | null
  currency: string
  stage: DealStage
  probability: number
  expected_close_date: string | null
  owner_id: string | null
  position_in_stage: number
  created_at: string
  mandate?: Mandate
}

export interface DocumentRow {
  id: string
  organization_id: string
  mandate_id: string | null
  deal_id: string | null
  category: DocumentCategory
  filename: string
  file_path: string
  file_size_kb: number | null
  version: number
  is_confidential: boolean
  is_investor_visible: boolean
  uploaded_by: string | null
  uploaded_at: string
}

// ---------------------- PHASE 2 ----------------------
export type InvoiceType = 'retainer' | 'success_fee' | 'expense' | 'other'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  organization_id: string
  mandate_id: string
  invoice_number: string
  invoice_type: InvoiceType
  amount: number
  currency: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  paid_date: string | null
  notes: string | null
  created_at: string
  mandate?: Mandate
}

export interface FinancialAnalysis {
  id: string
  mandate_id: string
  company_id: string | null
  fiscal_year: number
  revenue: number | null
  ebitda: number | null
  net_income: number | null
  total_debt: number | null
  total_equity: number | null
  cash_flow_operations: number | null
  dscr: number | null
  leverage_ratio: number | null
  roe: number | null
  roa: number | null
  created_at: string
}

export type DDCategory = 'financial' | 'legal' | 'tax' | 'esg' | 'operational'
export type DDItemStatus = 'pending' | 'in_progress' | 'completed' | 'flagged' | 'not_applicable'

export interface DueDiligenceChecklist {
  id: string
  organization_id: string
  mandate_id: string
  name: string
  created_at: string
}

export interface DueDiligenceItem {
  id: string
  checklist_id: string
  category: DDCategory
  label: string
  status: DDItemStatus
  risk_flag: boolean
  comments: string | null
  updated_at: string
}

export interface RiskAssessment {
  id: string
  mandate_id: string
  credit_risk_score: number | null
  operational_risk_score: number | null
  regulatory_risk_score: number | null
  country_risk_score: number | null
  overall_risk_level: string | null
  comments: string | null
  assessed_at: string
}

export interface InvestmentMemo {
  id: string
  organization_id: string
  mandate_id: string
  title: string
  executive_summary: string | null
  content: Record<string, string> | null
  status: string
  generated_by_ai: boolean
  created_at: string
  updated_at: string
  mandate?: Mandate
}

// ---------------------- PHASE 3 ----------------------
export interface MandateMessage {
  id: string
  organization_id: string
  mandate_id: string
  sender_id: string
  sender_role: AppRole
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
}

export type SignatureStatus = 'pending' | 'signed' | 'declined' | 'expired' | 'cancelled'

export interface SignatureRequest {
  id: string
  organization_id: string
  mandate_id: string | null
  document_id: string | null
  title: string
  document_type: string
  signatory_name: string
  signatory_email: string
  signatory_company: string | null
  status: SignatureStatus
  access_token: string
  signature_data_url: string | null
  signed_at: string | null
  signer_ip: string | null
  decline_reason: string | null
  expires_at: string
  provider: 'native' | 'yousign' | 'docusign'
  provider_request_id: string | null
  provider_metadata: Record<string, unknown> | null
  created_at: string
  mandate?: Mandate
}

export interface AiConversationMessage {
  id: string
  organization_id: string
  mandate_id: string | null
  profile_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ---------------------- PHASE 4 ----------------------
export type NotificationType = 'new_message' | 'signature_request' | 'signature_signed' | 'signature_declined' | 'invoice_overdue' | 'dd_deadline' | 'deal_stage_change' | 'mandate_update' | 'other'

export interface AppNotification {
  id: string
  organization_id: string
  profile_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export interface OrganizationGroup {
  id: string
  name: string
  created_at: string
}

export interface ConsolidatedGroupStat {
  organization_id: string
  organization_name: string
  active_mandates: number
  total_pipeline_value: number
  total_invoiced: number
  total_collected: number
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company> }
      contacts: { Row: Contact; Insert: Partial<Contact>; Update: Partial<Contact> }
      investors: { Row: Investor; Insert: Partial<Investor>; Update: Partial<Investor> }
      mandates: { Row: Mandate; Insert: Partial<Mandate>; Update: Partial<Mandate> }
      deals: { Row: Deal; Insert: Partial<Deal>; Update: Partial<Deal> }
      documents: { Row: DocumentRow; Insert: Partial<DocumentRow>; Update: Partial<DocumentRow> }
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> }
      financial_analyses: { Row: FinancialAnalysis; Insert: Partial<FinancialAnalysis>; Update: Partial<FinancialAnalysis> }
      due_diligence_checklists: { Row: DueDiligenceChecklist; Insert: Partial<DueDiligenceChecklist>; Update: Partial<DueDiligenceChecklist> }
      due_diligence_items: { Row: DueDiligenceItem; Insert: Partial<DueDiligenceItem>; Update: Partial<DueDiligenceItem> }
      risk_assessments: { Row: RiskAssessment; Insert: Partial<RiskAssessment>; Update: Partial<RiskAssessment> }
      investment_memos: { Row: InvestmentMemo; Insert: Partial<InvestmentMemo>; Update: Partial<InvestmentMemo> }
      mandate_messages: { Row: MandateMessage; Insert: Partial<MandateMessage>; Update: Partial<MandateMessage> }
      signature_requests: { Row: SignatureRequest; Insert: Partial<SignatureRequest>; Update: Partial<SignatureRequest> }
      ai_conversations: { Row: AiConversationMessage; Insert: Partial<AiConversationMessage>; Update: Partial<AiConversationMessage> }
      notifications: { Row: AppNotification; Insert: Partial<AppNotification>; Update: Partial<AppNotification> }
      organization_groups: { Row: OrganizationGroup; Insert: Partial<OrganizationGroup>; Update: Partial<OrganizationGroup> }
    }
    Functions: {
      generate_standard_dd_checklist: {
        Args: { p_mandate_id: string; p_org_id: string | undefined; p_created_by: string | undefined }
        Returns: string
      }
      get_consolidated_group_stats: {
        Args: { p_group_id: string }
        Returns: ConsolidatedGroupStat[]
      }
    }
  }
}
