/**
 * Dynamic First-Aid Decision Trees
 * Instead of static arrays, this allows interactive step-by-step guidance.
 */

export interface DecisionNode {
  id: string;
  question: string;
  options: {
    label: string;
    nextNodeId?: string; // If undefined, it's a leaf/terminal action
    action?: string;
    isEmergency?: boolean;
  }[];
}

export const FIRST_AID_TREES: Record<string, DecisionNode[]> = {
  diabetes: [
    {
      id: 'start',
      question: 'Is the person conscious and able to swallow?',
      options: [
        { label: 'Yes, conscious', nextNodeId: 'conscious_action' },
        { label: 'No, unconscious or seizing', nextNodeId: 'unconscious_action', isEmergency: true }
      ]
    },
    {
      id: 'conscious_action',
      question: 'Give 15g of fast-acting carbs (juice, regular soda, glucose tabs). Wait 15 minutes. Did symptoms improve?',
      options: [
        { label: 'Yes, improving', action: 'Have them eat a small snack/meal with complex carbs to stabilize.' },
        { label: 'No, not improving', nextNodeId: 'conscious_action', action: 'Give another 15g of fast-acting carbs.' },
        { label: 'Worsening / lost consciousness', nextNodeId: 'unconscious_action', isEmergency: true }
      ]
    },
    {
      id: 'unconscious_action',
      question: 'Emergency. DO NOT give anything by mouth. Is a Glucagon kit available and are you trained to use it?',
      options: [
        { label: 'Yes', action: 'Administer Glucagon. Turn person on their side. Call emergency services.', isEmergency: true },
        { label: 'No', action: 'Turn person on their side (recovery position). Call emergency services IMMEDIATELY.', isEmergency: true }
      ]
    }
  ],
  'severe-nut-allergy': [
    {
      id: 'start',
      question: 'Is the person having difficulty breathing or showing signs of anaphylaxis?',
      options: [
        { label: 'Yes', nextNodeId: 'anaphylaxis_action', isEmergency: true },
        { label: 'No, mild reaction (hives)', action: 'Administer oral antihistamine if available. Monitor closely.' }
      ]
    },
    {
      id: 'anaphylaxis_action',
      question: 'Administer EpiPen immediately (outer thigh). Did you administer it?',
      options: [
        { label: 'Yes', nextNodeId: 'post_epi_action' },
        { label: 'No EpiPen available', action: 'Call emergency services IMMEDIATELY. Have person sit upright.', isEmergency: true }
      ]
    },
    {
      id: 'post_epi_action',
      question: 'Call emergency services even if they feel better. Are symptoms improving after 5-15 minutes?',
      options: [
        { label: 'Yes', action: 'Monitor closely until ambulance arrives.' },
        { label: 'No/Worsening', action: 'Administer a second EpiPen if available.', isEmergency: true }
      ]
    }
  ]
};

export function getDecisionTree(condition: string): DecisionNode[] | null {
  return FIRST_AID_TREES[condition] || null;
}
