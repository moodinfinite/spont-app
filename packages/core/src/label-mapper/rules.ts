const RULES: { pattern: string; category: string }[] = [
  { pattern: 'gym', category: 'Health/Fitness' },
  { pattern: 'workout', category: 'Health/Fitness' },
  { pattern: 'yoga', category: 'Health/Fitness' },
  { pattern: 'run', category: 'Health/Fitness' },
  { pattern: 'client call', category: 'Work' },
  { pattern: 'meeting', category: 'Work' },
  { pattern: 'standup', category: 'Work' },
  { pattern: '1:1', category: 'Work' },
  { pattern: 'date night', category: 'Personal' },
  { pattern: 'date', category: 'Personal' },
  { pattern: 'family dinner', category: 'Family' },
  { pattern: 'family', category: 'Family' },
  { pattern: 'errands', category: 'Errands' },
  { pattern: 'groceries', category: 'Errands' },
  { pattern: 'dentist', category: 'Errands' },
  { pattern: 'doctor', category: 'Errands' },
  { pattern: 'happy hour', category: 'Social' },
  { pattern: 'party', category: 'Social' },
  { pattern: 'hangout', category: 'Social' },
  { pattern: 'brunch', category: 'Social' },
]

export function mapLabelByRule(rawLabel: string): string | null {
  const lower = rawLabel.toLowerCase()
  for (const rule of RULES) {
    if (lower.includes(rule.pattern)) {
      return rule.category
    }
  }
  return null
}
