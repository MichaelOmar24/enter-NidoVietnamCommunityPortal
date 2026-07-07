export type OccupationType = 'student' | 'teacher' | 'self_employed' | 'business' | 'employee' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type SpouseNationality = 'vietnamese' | 'nigerian' | 'other';
export type MembershipType = 'regular' | 'premium';
export type MembershipStatus = 'active' | 'pending' | 'expired';
export type Gender = 'male' | 'female' | 'other';

export type QualificationType =
  'secondary_school' | 'diploma' | 'undergraduate' | 'graduate_bachelor' |
  'postgraduate_diploma' | 'masters' | 'phd_doctorate' | 'professional_qualification' | 'other';

export type ReligionType =
  'christianity' | 'islam' | 'traditional' | 'other' | 'prefer_not_to_say';

export type PurposeOfVisitType =
  'tourism' | 'business_visit' | 'business_investment' | 'business_partnership' |
  'study_education' | 'work_employment' | 'family_visit' | 'medical_treatment' |
  'official_government' | 'conference_event' | 'research' | 'relocation' | 'transit' | 'other';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: Gender;
  occupation_type?: OccupationType;
  marital_status?: MaritalStatus;
  vietnam_city?: string;
  vietnam_address?: string;
  nigerian_state_of_origin?: string;
  profile_picture_url?: string;
  membership_type: MembershipType;
  membership_status: MembershipStatus;
  is_admin: boolean;
  is_super_admin: boolean;
  is_embassy_staff: boolean;
  created_at: string;
  updated_at: string;
  // Spouse & family fields
  spouse_first_name?: string;
  spouse_last_name?: string;
  spouse_nationality?: SpouseNationality;
  spouse_nationality_other?: string;
  number_of_kids?: number;
  spouse_passport_url?: string;
  // Extended profile fields
  occupation_institution_name?: string;
  occupation_institution_address?: string;
  occupation_country_state?: string;
  next_of_kin_name?: string;
  next_of_kin_relationship?: string;
  next_of_kin_phone?: string;
  next_of_kin_address?: string;
  highest_qualification?: string;
  religion?: string;
  purpose_of_visit?: string;
}

export interface Passport {
  id: string;
  user_id: string;
  passport_number?: string;
  issue_date?: string;
  expiry_date?: string;
  place_of_issue?: string;
  passport_image_url?: string;
  is_biometric: boolean;
  admin_notes?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Company {
  id: string;
  owner_id?: string;
  company_name: string;
  description?: string;
  business_type?: string;
  industry?: string;
  address_in_vietnam?: string;
  website?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  cover_image_url?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface CompanyPrivateInfo {
  id?: string;
  company_id: string;
  registration_number?: string;
  tax_code?: string;
  annual_revenue_vnd?: number | null;
  monthly_revenue_vnd?: number | null;
  trade_volume_notes?: string;
  registration_doc_url?: string;
  tax_code_doc_url?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  // Listing fee payment tracking
  listing_fee_status?: 'unpaid' | 'paid' | 'expired';
  listing_fee_amount_paid?: number | null;
  listing_fee_paid_date?: string | null;
  listing_fee_valid_until?: string | null;
  listing_fund_transaction_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyFeeConfig {
  id: string;
  annual_fee_vnd: number;
  updated_by?: string;
  updated_at: string;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  event_date?: string;
  created_at: string;
  photos?: GalleryPhoto[];
}

export interface GalleryPhoto {
  id: string;
  album_id?: string;
  image_url: string;
  caption?: string;
  created_at: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  content?: string;
  event_date?: string;
  location?: string;
  cover_image_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  document_url?: string;
  document_type: 'constitution' | 'circular' | 'announcement';
  is_active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  plan_type: MembershipType;
  amount?: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'expired';
  valid_from?: string;
  valid_until?: string;
  stripe_session_id?: string;
  created_at: string;
}

export interface MemberStats {
  total: number;
  byOccupation: Record<OccupationType, number>;
  byMaritalStatus: Record<MaritalStatus, number>;
  byCity: Record<string, number>;
  byGender: Record<Gender, number>;
  active: number;
  pending: number;
}

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export const VIETNAM_CITIES = [
  'Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hai Phong', 'Can Tho',
  'Bien Hoa', 'Hue', 'Nha Trang', 'Buon Ma Thuot', 'Vinh', 'Da Lat',
  'Quy Nhon', 'Thai Nguyen', 'Thanh Hoa', 'Phan Thiet', 'Other'
];

export const OCCUPATION_LABELS: Record<OccupationType, string> = {
  student: 'Student',
  teacher: 'Teacher / Academic',
  self_employed: 'Self-Employed',
  business: 'Business Owner',
  employee: 'Employed',
  other: 'Other'
};

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  single: 'Single',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed'
};

export const QUALIFICATION_LABELS: Record<QualificationType, string> = {
  secondary_school: 'Secondary School / High School',
  diploma: 'Diploma',
  undergraduate: 'Undergraduate',
  graduate_bachelor: 'Graduate / Bachelor Degree',
  postgraduate_diploma: 'Postgraduate Diploma',
  masters: 'Masters Degree',
  phd_doctorate: 'PhD / Doctorate',
  professional_qualification: 'Professional Qualification',
  other: 'Other',
};

export const RELIGION_LABELS: Record<ReligionType, string> = {
  christianity: 'Christianity',
  islam: 'Islam',
  traditional: 'Traditional Religion',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export const PURPOSE_OF_VISIT_LABELS: Record<PurposeOfVisitType, string> = {
  tourism: 'Tourism',
  business_visit: 'Business Visit',
  business_investment: 'Business Investment',
  business_partnership: 'Business Partnership',
  study_education: 'Study / Education',
  work_employment: 'Work / Employment',
  family_visit: 'Family Visit',
  medical_treatment: 'Medical Treatment',
  official_government: 'Official Government Visit',
  conference_event: 'Conference / Event',
  research: 'Research',
  relocation: 'Relocation',
  transit: 'Transit',
  other: 'Other',
};
