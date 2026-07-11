export const OPENAI_GPT56_MODELS = {
  sol: "gpt-5.6-sol",
  terra: "gpt-5.6-terra",
  luna: "gpt-5.6-luna"
} as const;

export type OpenAiGpt56Model = (typeof OPENAI_GPT56_MODELS)[keyof typeof OPENAI_GPT56_MODELS];

export type OpenAiGpt56WorkloadRole = "default" | "quality" | "highVolume";

export type OpenAiGpt56ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

export type OpenAiGpt56RequestDefaults = {
  model: OpenAiGpt56Model;
  reasoning: {
    effort: OpenAiGpt56ReasoningEffort;
  };
  text: {
    verbosity: "low" | "medium" | "high";
  };
};

const ROLE_TO_MODEL: Record<OpenAiGpt56WorkloadRole, OpenAiGpt56Model> = {
  default: OPENAI_GPT56_MODELS.terra,
  quality: OPENAI_GPT56_MODELS.sol,
  highVolume: OPENAI_GPT56_MODELS.luna
};

const ROLE_TO_REASONING_EFFORT: Record<OpenAiGpt56WorkloadRole, OpenAiGpt56ReasoningEffort> = {
  default: "low",
  quality: "medium",
  highVolume: "none"
};

export function selectOpenAiGpt56Model(role: OpenAiGpt56WorkloadRole): OpenAiGpt56Model {
  return ROLE_TO_MODEL[role];
}

export function buildOpenAiGpt56RequestDefaults(
  role: OpenAiGpt56WorkloadRole
): OpenAiGpt56RequestDefaults {
  return {
    model: selectOpenAiGpt56Model(role),
    reasoning: {
      effort: ROLE_TO_REASONING_EFFORT[role]
    },
    text: {
      verbosity: "medium"
    }
  };
}
