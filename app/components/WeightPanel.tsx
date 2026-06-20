"use client";

import { ScoringWeightSet, validateWeightSet } from "../../lib/matching";

const labelByCode = {
  jobDescription: "핵심지표",
  teamStrategy: "팀별 전략자료",
  mbo: "보직장 MBO",
  custom: "기타 주관식 의견"
};

export function WeightPanel({
  weights,
  onChange
}: {
  weights: ScoringWeightSet;
  onChange: (weights: ScoringWeightSet) => void;
}) {
  const validation = validateWeightSet(weights);

  return (
    <section className="weightPanel">
      <div className="panelHeader">
        <div>
          <h2>가중치 설정</h2>
          <p>활성화된 항목의 합계가 100%일 때만 분석을 실행할 수 있습니다.</p>
        </div>
        <strong className={validation.valid ? "ok" : "error"}>합계 {validation.total}%</strong>
      </div>
      <div className="weightGrid">
        {weights.items.map((item) => (
          <div className="weightItem" key={item.code}>
            <label className="toggle">
              <input
                checked={item.enabled}
                onChange={() =>
                  onChange({
                    ...weights,
                    isDefault: false,
                    items: weights.items.map((current) =>
                      current.code === item.code ? { ...current, enabled: !current.enabled } : current
                    )
                  })
                }
                type="checkbox"
              />
              {labelByCode[item.code]}
            </label>
            <input
              min="0"
              max="100"
              onChange={(event) =>
                onChange({
                  ...weights,
                  isDefault: false,
                  items: weights.items.map((current) =>
                    current.code === item.code
                      ? { ...current, weight: Number(event.target.value) }
                      : current
                  )
                })
              }
              type="number"
              value={item.weight}
            />
            <span>%</span>
          </div>
        ))}
      </div>
      {!validation.valid ? <p className="parseError">{validation.message}</p> : null}
    </section>
  );
}
