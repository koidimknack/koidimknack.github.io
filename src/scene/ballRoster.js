export function pickRandomActiveColorIds(colorOptions, count, random = Math.random) {
  const colorIds = colorOptions.map((color) => color.id);
  for (let i = colorIds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [colorIds[i], colorIds[j]] = [colorIds[j], colorIds[i]];
  }

  return colorIds.slice(0, Math.min(count, colorIds.length));
}

export function toggleActiveRosterId(activeRosterIds, rosterId) {
  if (!activeRosterIds.includes(rosterId)) {
    return {
      activeRosterIds: [...activeRosterIds, rosterId],
      rejected: false,
    };
  }

  if (activeRosterIds.length <= 1) {
    return {
      activeRosterIds,
      rejected: true,
    };
  }

  return {
    activeRosterIds: activeRosterIds.filter((activeRosterId) => activeRosterId !== rosterId),
    rejected: false,
  };
}

export function toggleActiveColorId(activeColorIds, colorId) {
  const result = toggleActiveRosterId(activeColorIds, colorId);

  return {
    activeColorIds: result.activeRosterIds,
    rejected: result.rejected,
  };
}
