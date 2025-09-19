// Export all templates
export { DefaultTemplate, default as Default } from "./default.js";
export { LegalTemplate, default as Legal } from "./legal.js";
export { AcademicTemplate, default as Academic } from "./academic.js";

// Template registry for dynamic loading
export const templates = {
  default: () => import("./default.js").then(m => m.default),
  legal: () => import("./legal.js").then(m => m.default),
  academic: () => import("./academic.js").then(m => m.default),
};

export type TemplateType = keyof typeof templates;