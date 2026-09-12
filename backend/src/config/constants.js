const DEPARTMENTS = [
  'Civil Engineering',
  'Mechanical Engineering',
  'Electronics Engineering',
  'Computer Engineering'
];

const ROUND_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ENDED: 'ended'
};

const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  DISQUALIFIED: 'disqualified'
};

const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  JUDGE: 'judge',
  VOLUNTEER: 'volunteer'
};

const ROUND_TYPES = {
  QUIZ: 'quiz',
  RAPID_FIRE: 'rapid_fire',
  QUESTIONING: 'questioning',
  PROMPT_RUSH: 'prompt_rush'
};

const COMPETITION_TYPES = {
  MCQ: 'mcq',
  PROMPT_RUSH: 'prompt_rush'
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const ROUND2_TOP_N_PER_DEPARTMENT = 5;

module.exports = {
  DEPARTMENTS,
  ROUND_STATUS,
  ATTEMPT_STATUS,
  ADMIN_ROLES,
  ROUND_TYPES,
  COMPETITION_TYPES,
  DIFFICULTIES,
  ROUND2_TOP_N_PER_DEPARTMENT
};
