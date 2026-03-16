interface OutfitCandidate {
  candidate_id: string;
  label: string;
  front_image_b64: string;
  width: number;
  height: number;
}

interface OutfitCandidateGridProps {
  candidates: OutfitCandidate[];
  selectedCandidateId: string | null;
  onSelect: (candidateId: string) => void;
}

export default function OutfitCandidateGrid({
  candidates,
  selectedCandidateId,
  onSelect,
}: OutfitCandidateGridProps) {
  if (!candidates.length) return null;

  return (
    <div className="up-candidate-wrap">
      <p className="up-candidate-title">Detected clothing candidates</p>
      <div className="up-candidate-grid">
        {candidates.map((candidate) => {
          const isActive = candidate.candidate_id === selectedCandidateId;
          return (
            <button
              key={candidate.candidate_id}
              type="button"
              className={`up-candidate-card${isActive ? " up-candidate-card--active" : ""}`}
              onClick={() => onSelect(candidate.candidate_id)}
            >
              <img
                src={candidate.front_image_b64}
                alt={candidate.label}
                className="up-candidate-image"
              />
              <span className="up-candidate-label">
                {candidate.label.replace("_", " ")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
