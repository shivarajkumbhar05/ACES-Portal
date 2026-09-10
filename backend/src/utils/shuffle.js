/** Fisher-Yates shuffle, returns a new array (does not mutate input). */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Pick `count` random items from an array without replacement. */
function sampleRandom(array, count) {
  return shuffle(array).slice(0, Math.min(count, array.length));
}

module.exports = { shuffle, sampleRandom };
