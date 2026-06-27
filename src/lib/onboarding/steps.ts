// Onboarding step order + the tap-to-add suggestion sets. Plain language, no
// clinical labels — the person never sees the words "AAC" or "profile".

export const STEPS = ['welcome', 'identity', 'people', 'needs', 'favorites', 'review'] as const;
export type Step = (typeof STEPS)[number];

export const PRONOUNS = ['she/her', 'he/him', 'they/them'];

export const RELATIONSHIPS = [
	'Mom',
	'Dad',
	'Wife',
	'Husband',
	'Daughter',
	'Son',
	'Sister',
	'Brother',
	'Friend',
	'Nurse',
	'Aide',
	'Doctor',
	'Teacher',
	'Caregiver'
];

export const NEEDS = [
	'Water',
	'Food / snack',
	'Bathroom',
	'My medicine',
	'Rest / lie down',
	'A blanket',
	'My glasses',
	'Phone',
	'TV / remote',
	'Go outside',
	'Help me up'
];

export const SIGNALS = [
	"It's too loud",
	'Too bright',
	'Too many people',
	'I need a break',
	'I need quiet',
	"I'm in pain"
];

export const FAVORITES = ['Music', 'My dog', 'Outside', 'A hug'];
