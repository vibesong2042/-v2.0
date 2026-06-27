# Project AGENTS.md

## Defaults

- Reply in Korean by default unless the user, codebase, or task requires another language.
- Keep changes scoped to the user's request.
- Inspect relevant files and `git status` before substantial edits.
- Do not discard, overwrite, or revert user changes unless explicitly asked.
- Do not create branches, commits, pushes, or PRs unless requested.

## Deep Review Planning Protocol

Use this protocol before emitting a final `<proposed_plan>` when the user explicitly requests repeated critique, subagent critique, or a high-rigor plan review. Also consider it for high-risk plans involving security, personal data, data deletion, migrations, production impact, large refactors, or multiple API/service boundaries. For small or routine plans, default to `fast` or `standard` review instead.

For RoleFit high-risk work, also consult `docs/rolefit-high-risk-review-harness.md` before implementation. Use it as a checklist and handoff template only. Do not install or run `my_harness`, create global skills, overwrite `AGENTS.md` or `CLAUDE.md`, enable external reviewers, or use real resumes, company documents, API keys, or Knox credentials without explicit approval.

### Terms

- `Review target draft` means the internal plan draft prepared before the final user-facing response.
- Do not expose intermediate drafts or full critique logs to the user.
- `Deep review` means exactly two rounds of: three-perspective critique, main-session revalidation, and incorporation of only valid critique.

### Critique Perspectives

Run the same three perspectives in each round:

- Requirements, scope, and success criteria.
- Implementation feasibility, tests, and interfaces.
- User control, safety, and efficiency.

### Round Flow

1. Build the initial review target draft from repo/context exploration and the user's stated intent.
2. If an execution-blocking ambiguity remains, ask the user before starting critique. In Plan Mode, use `request_user_input` without `autoResolutionMs` when available.
3. Round 1 critiques the initial review target draft.
4. Revalidate each critique in the main session against current context, files, tools, and user instructions.
5. Accept only critiques that are technically valid and relevant. Reject or defer the rest.
6. Revise the draft.
7. Round 2 critiques the revised draft plus the Round 1 accepted/rejected decisions. Do not re-critique only the original draft.
8. Revalidate Round 2 critiques the same way and revise again.
9. If critique reveals a new execution-blocking ambiguity, ask before emitting the final plan. If the matter can be handled as an execution approval or input checkpoint, include it in the final plan instead.

### Tool And Safety Rules

- Use subagents only when an explicit subagent/task tool is available and the current mode permits non-mutating critique.
- If subagents are unavailable or their read-only scope cannot be guaranteed, perform the same three-perspective critique in the main session. Do not substitute user-owned thread creation or unrelated parallel tools.
- Critique agents are limited to plan critique and non-mutating inspection.
- Prohibit file edits, branch/commit/PR creation, package installation, server startup, network calls, production writes, and resource mutation inside critique agents.
- Main-session revalidation is mandatory. Never accept a critique solely because a subagent produced it.

### Final Plan Output

- Emit at most one `<proposed_plan>` block.
- Include execution order, scope, success criteria, verification approach, and any user approval/input checkpoints.
- Keep critique disposition short. Add only 2-3 lines under `Assumptions / Defaults`, focusing on decisions that changed the plan or important rejections.
- If the user explicitly asked for exactly two review rounds, do not skip Round 2 merely because Round 1 had few changes.

## Verification

- For code changes, run the narrowest meaningful test, lint, typecheck, build, or browser check.
- For documentation-only changes, verify by reading the changed file and confirming it contains the requested behavior.
- If verification cannot be run, explain why and what remains unchecked.
