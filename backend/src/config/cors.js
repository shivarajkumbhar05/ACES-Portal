function getAllowedOrigins() {
  return (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsOptions() {
  const allowedOrigins = getAllowedOrigins();
  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('CLIENT_ORIGIN must be configured in production');
  }

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed'));
    }
  };
}

module.exports = { getAllowedOrigins, getCorsOptions };