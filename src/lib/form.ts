export interface FormState {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  ok?: boolean;
  code?: string;
  notice?: string;
}
