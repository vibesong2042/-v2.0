# OpenAI GPT-5.6 setup for RoleFit

> **Status: Evaluation draft / inactive / no API connection**
>
> This document is only a comparison draft for a possible future OpenAI
> evaluation. It is not imported by the runtime application, does not configure
> an adapter, endpoint, credential, or environment variable, and must not be
> treated as an active production setting.

Source docs checked on 2026-07-11:

- https://developers.openai.com/api/docs/guides/latest-model.md
- https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol.md
- https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6.md

## Model roles

Use explicit model IDs instead of the `gpt-5.6` family alias so analytics,
billing, allowlists, and rate-limit configuration stay unambiguous.

| RoleFit role | Model | Reasoning | Use for |
| --- | --- | --- | --- |
| `default` | `gpt-5.6-terra` | `low` | Normal rubric and evidence suggestions where cost and latency matter. |
| `quality` | `gpt-5.6-sol` | `medium` | Hard reviews, ambiguous evidence, or manual QA workflows. |
| `highVolume` | `gpt-5.6-luna` | `none` | Large batches, classification, routing, or simple extraction. |

For this inactive GPT-5.6 comparison experiment only, the evaluation defaults
are recorded in `lib/matching/openaiModelConfig.ts`. That file is not the source
of truth for the RoleFit runtime or for a future company AI gateway.

## Responses API request defaults

Prefer the Responses API for any future OpenAI adapter that needs reasoning,
tools, or multi-turn state.

```json
{
  "model": "gpt-5.6-terra",
  "reasoning": {
    "effort": "low"
  },
  "text": {
    "verbosity": "medium"
  }
}
```

Do not enable Pro mode, persisted reasoning, explicit prompt caching,
Programmatic Tool Calling, or multi-agent behavior during the baseline adapter
implementation. Add each feature only after a representative eval shows a
measurable quality, latency, or cost benefit.

## Chat Completions compatibility

If a future adapter uses Chat Completions with function tools, set effective
reasoning to `none`:

```json
{
  "model": "gpt-5.6-luna",
  "reasoning_effort": "none"
}
```

For reasoning plus tools, migrate that flow to the Responses API instead of
removing tools or weakening the workflow.

## Prompt guidance

Keep the adapter prompt lean:

- State the outcome: suggest rubric candidates, evidence matches, risk flags,
  and confidence only.
- Preserve the existing boundary: never produce final scores, hiring decisions,
  or send-ready recommendations.
- Require evidence sentences to come from the candidate document.
- Keep output schema and refusal/fallback behavior explicit.
- Remove repeated examples or broad style rules unless they fix a measured
  failure.

## Validation before enabling real calls

Before a real OpenAI adapter is enabled:

1. Confirm company approval to send resume and company document content to the
   selected OpenAI endpoint.
2. Confirm credential storage and logging rules for `OPENAI_API_KEY`.
3. Run existing adapter boundary tests.
4. Compare representative cases across:
   - old mock/rule behavior;
   - `gpt-5.6-terra` with `low`;
   - `gpt-5.6-terra` with `none`;
   - `gpt-5.6-sol` with `medium` for hard cases.
5. Track task success, schema validity, fabricated evidence rate, latency,
   input/output/reasoning tokens, cached tokens, cache-write tokens, and cost
   per successful task.
