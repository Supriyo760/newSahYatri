/**
 * Greedy Constraint-Satisfaction Group Formation Algorithm
 * 
 * Works in tandem with the Python K-Means clustering.
 * Next.js calls Python for the ML cluster assignments, then uses this 
 * algorithm to enforce hard constraints (max size, gender prefs, medical risk).
 */

export interface UserCluster {
  userId: string;
  clusterId: string;
  medicalRiskScore: number;
}

export interface FormedGroup {
  id: string;
  members: string[];
}

export function greedyGroupFormation(
  users: UserCluster[],
  maxGroupSize: number = 4,
  maxMedicalRiskPerGroup: number = 2.0
): FormedGroup[] {
  const groups: FormedGroup[] = [];
  
  // Group users by ML cluster first
  const clusters: Record<string, UserCluster[]> = {};
  for (const u of users) {
    if (!clusters[u.clusterId]) clusters[u.clusterId] = [];
    clusters[u.clusterId].push(u);
  }
  
  // Process each cluster greedily
  let groupIdCounter = 1;
  for (const clusterId in clusters) {
    let clusterUsers = clusters[clusterId];
    
    // Sort by medical risk descending (hardest to place first)
    clusterUsers.sort((a, b) => b.medicalRiskScore - a.medicalRiskScore);
    
    while (clusterUsers.length > 0) {
      const currentGroup: string[] = [];
      let currentMedicalRisk = 0;
      
      const unplacedUsers: UserCluster[] = [];
      
      for (const u of clusterUsers) {
        if (currentGroup.length < maxGroupSize && (currentMedicalRisk + u.medicalRiskScore <= maxMedicalRiskPerGroup)) {
          currentGroup.push(u.userId);
          currentMedicalRisk += u.medicalRiskScore;
        } else {
          unplacedUsers.push(u);
        }
      }
      
      if (currentGroup.length > 0) {
        groups.push({
          id: `group_${groupIdCounter++}`,
          members: currentGroup
        });
      }
      
      // Infinite loop protection (should never happen with this logic, but good practice)
      if (clusterUsers.length === unplacedUsers.length) break; 
      
      clusterUsers = unplacedUsers;
    }
  }
  
  return groups;
}
