const jwt = require('jsonwebtoken');

function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin._id.toString(), role: admin.role, username: admin.username, type: 'admin' },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h' }
  );
}

function verifyAdminToken(token) {
  return jwt.verify(token, process.env.JWT_ADMIN_SECRET);
}

// Student tokens are scoped to a single attempt - they cannot be reused to
// start another quiz or impersonate another attempt.
function signStudentToken(attempt) {
  return jwt.sign(
    {
      sub: attempt.student.toString(),
      attemptId: attempt._id.toString(),
      roundNumber: attempt.roundNumber,
      type: 'student'
    },
    process.env.JWT_STUDENT_SECRET,
    { expiresIn: process.env.JWT_STUDENT_EXPIRES_IN || '3h' }
  );
}

function verifyStudentToken(token) {
  return jwt.verify(token, process.env.JWT_STUDENT_SECRET);
}

module.exports = {
  signAdminToken,
  verifyAdminToken,
  signStudentToken,
  verifyStudentToken
};
