export interface FormState {
  error?: string;
  fields?: Record<string, string>;
  ok?: boolean;
  code?: string;
  notice?: string;
}
