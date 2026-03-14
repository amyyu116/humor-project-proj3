export type LookupItem = {
  id: number;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  label?: string | null;
};

export type FlavorStep = {
  id: number;
  created_datetime_utc: string;
  humor_flavor_id: number;
  llm_temperature: number | null;
  order_by: number;
  llm_input_type_id: number;
  llm_output_type_id: number;
  llm_model_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
};

export type Flavor = {
  id: number;
  created_datetime_utc: string;
  description: string | null;
  slug: string;
  humor_flavor_steps: FlavorStep[];
};

export type Lookups = {
  llm_models: LookupItem[];
  llm_input_types: LookupItem[];
  llm_output_types: LookupItem[];
  humor_flavor_step_types: LookupItem[];
};

export type TestResult = {
  image_id: string;
  captions?: string[];
  final_output?: string;
  error?: string;
};

export type ImageRecord = {
  id: string;
  url: string | null;
  created_datetime_utc: string;
  additional_context: string | null;
  image_description: string | null;
  is_public: boolean | null;
  is_common_use: boolean | null;
};

export type ThemeMode = "system" | "light" | "dark";

export type HumorAdminProps = {
  initialFlavors: Flavor[];
  initialLookups: Lookups;
  initialImages: ImageRecord[];
  userEmail: string | null;
};
