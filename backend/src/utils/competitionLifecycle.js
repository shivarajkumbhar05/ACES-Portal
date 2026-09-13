function getCompetitionLifecycleError(competition, now = new Date()) {
  if (!competition) return null;
  if (competition.status !== 'published') return 'This competition is not published yet';
  if (competition.schedule?.isEnded) return 'This competition has ended';
  if (competition.schedule?.isPaused) return competition.schedule.pauseReason || 'This competition is currently paused';

  const startsAt = competition.schedule?.startsAt;
  const endsAt = competition.schedule?.endsAt;
  if (startsAt && now < new Date(startsAt)) return 'This competition has not started yet';
  if (endsAt && now > new Date(endsAt)) return 'This competition has ended';
  return null;
}

module.exports = { getCompetitionLifecycleError };
