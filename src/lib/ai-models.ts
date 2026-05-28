export interface AIModel {
  id: string;
  name: string;
  provider: "Groq" | "OpenAI" | "Anthropic" | "Google";
  description: string;
  envKey: string;
}

export const ALL_MODELS: AIModel[] = [
  // Groq
  { id: "groq/llama-3.3-70b-versatile", name: "LLaMA 3.3 70B",   provider: "Groq",      description: "Fast & powerful",     envKey: "GROQ_API_KEY" },
  { id: "groq/llama-3.1-8b-instant",     name: "LLaMA 3.1 8B",    provider: "Groq",      description: "Fastest responses",   envKey: "GROQ_API_KEY" },
  // OpenAI
  { id: "openai/gpt-4o",                 name: "GPT-4o",           provider: "OpenAI",    description: "Most capable",        envKey: "OPENAI_API_KEY" },
  { id: "openai/gpt-4o-mini",            name: "GPT-4o Mini",      provider: "OpenAI",    description: "Fast & efficient",    envKey: "OPENAI_API_KEY" },
  // Anthropic
  { id: "anthropic/claude-opus-4-7",     name: "Claude Opus 4.7",  provider: "Anthropic", description: "Best reasoning",      envKey: "ANTHROPIC_API_KEY" },
  { id: "anthropic/claude-sonnet-4-6",   name: "Claude Sonnet 4.6",provider: "Anthropic", description: "Balanced",            envKey: "ANTHROPIC_API_KEY" },
  { id: "anthropic/claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic", description: "Fastest Claude", envKey: "ANTHROPIC_API_KEY" },
  // Google
  { id: "google/gemini-2.0-flash",       name: "Gemini 2.0 Flash", provider: "Google",    description: "Fast multimodal",     envKey: "GOOGLE_GEMINI_API_KEY" },
  { id: "google/gemini-1.5-pro",         name: "Gemini 1.5 Pro",   provider: "Google",    description: "Advanced reasoning",  envKey: "GOOGLE_GEMINI_API_KEY" },
];

export const PROVIDER_ICONS: Record<string, string> = {
  Groq:      "⚡",
  OpenAI:    "✦",
  Anthropic: "✺",
  Google:    "◆",
};
