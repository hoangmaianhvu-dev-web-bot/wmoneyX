export const getLevelInfo = (exp: number) => {
  const level = Math.floor(Math.sqrt(exp / 10)) + 1;
  const currentLevelExp = (level - 1) * (level - 1) * 10;
  const nextLevelExp = level * level * 10;
  const progress = ((exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
  
  let vip = 1;
  if (level >= 5 && level < 15) vip = 2;
  else if (level >= 15 && level < 30) vip = 3;
  else if (level >= 30 && level < 50) vip = 4;
  else if (level >= 50) vip = 5 + Math.floor((level - 50) / 15);

  return { level, currentLevelExp, nextLevelExp, progress, vip };
};
