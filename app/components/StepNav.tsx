"use client";

import { getStepState } from "../../lib/workflow";

export type StepItem = {
  title: string;
  description: string;
};

export function StepNav({
  steps,
  activeStep,
  onSelect
}: {
  steps: StepItem[];
  activeStep: number;
  onSelect: (step: number) => void;
}) {
  return (
    <nav className="stepNav" aria-label="진행 단계">
      {steps.map((step, index) => {
        const state = getStepState(index, activeStep);

        return (
          <button
            aria-current={state === "active" ? "step" : undefined}
            className={`stepButton ${state}`}
            key={step.title}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span className="stepIndex">{index + 1}</span>
            <span>
              <strong>{step.title}</strong>
              <small>{step.description}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
