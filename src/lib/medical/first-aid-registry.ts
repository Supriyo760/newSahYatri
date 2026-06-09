export interface FirstAidProtocol {
  id: string;
  title: string;
  source: string;
  jurisdiction: string;
  effectiveDate: string;
  version: string;
  content: string[];
}

export const FIRST_AID_REGISTRY: FirstAidProtocol[] = [
  {
    id: "cpr-adult",
    title: "CPR (Adults)",
    source: "Red Cross Basic Life Support",
    jurisdiction: "International",
    effectiveDate: "2024-01-01",
    version: "v1.0",
    content: [
      "1. Check the scene for safety, form an initial impression, and use personal protective equipment (PPE).",
      "2. If the person appears unresponsive, check for responsiveness, breathing, life-threatening bleeding or other life-threatening conditions using shout-tap-shout.",
      "3. If the person does not respond and is not breathing or only gasping, CALL emergency services.",
      "4. Place the person on their back on a firm, flat surface.",
      "5. Give 30 chest compressions (Hand position: Two hands centered on the chest. Body position: Shoulders directly over hands; elbows locked. Depth: At least 2 inches. Rate: 100 to 120 per minute. Allow chest to return to normal position after each compression).",
      "6. Give 2 breaths (Open the airway to a past-neutral position using the head-tilt/chin-lift technique. Ensure each breath lasts about 1 second and makes the chest begin to rise).",
      "7. Continue giving sets of 30 chest compressions and 2 breaths. Use an AED as soon as one is available!"
    ]
  },
  {
    id: "choking-adult",
    title: "Choking (Adults)",
    source: "Red Cross Basic Life Support",
    jurisdiction: "International",
    effectiveDate: "2024-01-01",
    version: "v1.0",
    content: [
      "1. Verify that the person is choking and obtain consent.",
      "2. Give 5 back blows. Stand to the side and just behind the person. Place one arm diagonally across the person’s chest for support. Bend the person forward at the waist so that the upper body is as close to parallel to the ground as possible. Firmly strike the person between the shoulder blades with the heel of your other hand.",
      "3. Give 5 abdominal thrusts. Have the person stand up straight. Stand behind the person with one foot in front of the other for balance and wrap your arms around the person’s waist. Find the navel with two fingers from one hand. Make a fist with your other hand and place the thumb side against the middle of the person's abdomen, just above the navel.",
      "4. Continue giving sets of 5 back blows and 5 abdominal thrusts until the object is forced out or the person can cough forcefully, speak or breathe."
    ]
  }
];
