/**
 * Greedy Constraint-Satisfaction Algorithm for Optimal Group Formation
 * As outlined in the SahYatri Methodology Report.
 */

export interface CandidateUser {
  id: string;
  budgetLevel: number;
  travelStyle: string;
  medicalConditions: string[];
}

export interface FormationConstraint {
  maxSize: number;
  minSize: number;
  requireMedicalCompatibility: boolean;
  maxBudgetVariance: number;
}

export function formOptimalGroups(
  pool: CandidateUser[], 
  constraints: FormationConstraint = { maxSize: 5, minSize: 3, requireMedicalCompatibility: true, maxBudgetVariance: 1 }
): CandidateUser[][] {
  const groups: CandidateUser[][] = [];
  const remainingPool = [...pool];

  // Sort pool arbitrarily to start greedy search (e.g. by budget to naturally group similar users)
  remainingPool.sort((a, b) => a.budgetLevel - b.budgetLevel);

  while (remainingPool.length >= constraints.minSize) {
    const currentGroup: CandidateUser[] = [remainingPool.shift()!];
    
    // Greedily find compatible members
    let i = 0;
    while (i < remainingPool.length && currentGroup.length < constraints.maxSize) {
      const candidate = remainingPool[i];
      let isCompatible = true;
      
      for (const member of currentGroup) {
        // Constraint 1: Budget Variance
        if (Math.abs(member.budgetLevel - candidate.budgetLevel) > constraints.maxBudgetVariance) {
          isCompatible = false;
          break;
        }
        
        // Constraint 2: Travel Style
        // For MVP, require exact travel style match in the core group
        if (member.travelStyle !== candidate.travelStyle) {
          isCompatible = false;
          break;
        }
        
        // Constraint 3: Medical Conflicts (Mock logic)
        if (constraints.requireMedicalCompatibility) {
          const bothHaveAsthma = member.medicalConditions.includes('asthma') && candidate.medicalConditions.includes('asthma');
          if (bothHaveAsthma && member.travelStyle === 'adventure') {
            // Highly specific mock constraint: Don't group multiple high-risk asthmatics on an adventure trip to avoid over-taxing resources
            isCompatible = false;
            break;
          }
        }
      }
      
      if (isCompatible) {
        currentGroup.push(candidate);
        remainingPool.splice(i, 1);
      } else {
        i++;
      }
    }
    
    // If the group meets minimum size, finalize it
    if (currentGroup.length >= constraints.minSize) {
      groups.push(currentGroup);
    } else {
      // Failed to form a viable group, return them to the remaining pool 
      // (in a full implementation, they would go to a waitlist or constraints would be relaxed)
      remainingPool.push(...currentGroup);
      break; // Exit to prevent infinite loop in this MVP version
    }
  }

  return groups;
}
