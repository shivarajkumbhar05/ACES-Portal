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
  EXPIRED: 'expired'
};

const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin'
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const ROUND2_TOP_N_PER_DEPARTMENT = 5;

module.exports = {
  DEPARTMENTS,
  ROUND_STATUS,
  ATTEMPT_STATUS,
  ADMIN_ROLES,
  DIFFICULTIES,
  ROUND2_TOP_N_PER_DEPARTMENT
};
