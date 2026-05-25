/**
 * Budget-filtered dining and Food Safety tracking logic
 */

export interface DiningRecommendation {
  id: string;
  name: string;
  priceLevel: number; // 1-4
  estimatedCostPerPerson: number;
  hygieneScore: number; // 0-100
  isLocalGem: boolean;
  matchScore: number;
}

export function filterDiningByBudget(
  recommendations: DiningRecommendation[], 
  availableBudget: number,
  groupSize: number
): DiningRecommendation[] {
  // If no budget constraints, return all
  if (availableBudget <= 0) return recommendations;
  
  // Calculate max allowable cost per person to not blow the budget
  const maxPerPerson = availableBudget / groupSize;
  
  return recommendations.filter(r => r.estimatedCostPerPerson <= maxPerPerson);
}

export function enforceHygieneStandards(
  recommendations: DiningRecommendation[], 
  minAcceptableScore: number = 70
): DiningRecommendation[] {
  // Filters out restaurants that don't meet basic local hygiene standards
  // In a real system, this would pull from municipal health inspection databases
  return recommendations.filter(r => r.hygieneScore >= minAcceptableScore);
}

export function getTopSafeDiningOptions(
  allRecommendations: DiningRecommendation[],
  availableBudget: number,
  groupSize: number
) {
  let filtered = enforceHygieneStandards(allRecommendations);
  filtered = filterDiningByBudget(filtered, availableBudget, groupSize);
  
  // Sort by match score descending
  return filtered.sort((a, b) => b.matchScore - a.matchScore);
}
