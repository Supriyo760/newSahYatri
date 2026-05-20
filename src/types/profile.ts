export interface PersonalityQuizAnswers {
  // Big Five — each answer maps to a trait score
  // Questions are scored 1-5, normalized to 0-1
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  travelStyle: 'adventure' | 'cultural' | 'relaxation' | 'culinary' | 'mixed';
  riskTolerance: number; // 1-5
  budgetLevel: 'minimal' | 'average' | 'premium';
  preferredGroupSize: number; // 3-5
  languagesSpoken: string[];
  foodPreferences: {
    streetFood: boolean;
    fineDining: boolean;
    vegetarian: boolean;
    vegan: boolean;
    halal: boolean;
    glutenFree: boolean;
  };
  interests: string[];
}

export interface OnboardingStep {
  step: number;
  totalSteps: 4;
  // Step 1: Basic info (age, gender, nationality)
  // Step 2: Personality quiz
  // Step 3: Travel & food preferences
  // Step 4: Medical profile (optional but encouraged)
}
