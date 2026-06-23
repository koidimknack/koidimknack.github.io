export function pickRandomActiveColorIds(colorOptions, count, random = Math.random) {
  const colorIds = colorOptions.map((color) => color.id);
  for (let i = colorIds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [colorIds[i], colorIds[j]] = [colorIds[j], colorIds[i]];
  }

  return colorIds.slice(0, Math.min(count, colorIds.length));
}

export function toggleActiveColorId(activeColorIds, colorId) {
  if (!activeColorIds.includes(colorId)) {
    return {
      activeColorIds: [...activeColorIds, colorId],
      rejected: false,
    };
  }

  if (activeColorIds.length <= 1) {
    return {
      activeColorIds,
      rejected: true,
    };
  }

  return {
    activeColorIds: activeColorIds.filter((activeColorId) => activeColorId !== colorId),
    rejected: false,
  };
}
