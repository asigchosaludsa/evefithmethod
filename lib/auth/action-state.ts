/** Shared shape for useActionState-driven auth forms. */
export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = {};
