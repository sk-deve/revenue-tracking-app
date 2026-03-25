const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

function parseRange(req) {
  const now = new Date();

  const fromQ = req.query.from ? new Date(req.query.from) : startOfMonth(now);
  const toQ = req.query.to ? new Date(req.query.to) : startOfNextMonth(now);

  if (Number.isNaN(fromQ.getTime()) || Number.isNaN(toQ.getTime())) {
    return { error: "Invalid date range." };
  }

  // previous period = same duration
  const durationMs = toQ.getTime() - fromQ.getTime();
  const prevTo = new Date(fromQ);
  const prevFrom = new Date(fromQ.getTime() - durationMs);

  return {
    from: fromQ,
    to: toQ,
    prevFrom,
    prevTo,
  };
}

// IMPORTANT: your Job model is inconsistent in code:
// some places use `userId`, some use `user`.
// We'll match BOTH so you never get "0" again.
function jobUserMatch(userId) {
  return {
    $or: [{ user: userId }, { userId: userId }],
  };
}

// Some of your jobs use `date`, others rely on `createdAt`.
// We'll match BOTH.
function jobDateMatch(from, to) {
  return {
    $or: [
      { createdAt: { $gte: from, $lt: to } },
      { date: { $gte: from, $lt: to } },
    ],
  };
}

module.exports = { parseRange, jobUserMatch, jobDateMatch };
