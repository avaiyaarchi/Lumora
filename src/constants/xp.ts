import { ThemeName } from '../theme/colors';
import { AvatarType, AccessoryType } from '../components/avatars/AvatarLayer';

export const XP_VALUES = {
  FOCUS_SESSION: 25,
  CORRECT_QUIZ_ANSWER: 5,
  PERFECT_QUIZ: 20,
  DAILY_GOAL_COMPLETED: 50,
  SEVEN_DAY_STREAK: 100,
};

export const ALL_THEMES: ThemeName[] = [
  'lavender',
  'pink',
  'cream',
  'sky',
  'sage',
  'galaxy',
  'ocean',
  'peach',
  'cherryBlossom',
  'milktea',
  'matcha',
  'sunset',
  'moonlight',
  'frost',
];

export const ALL_AVATARS: AvatarType[] = [
  'cat',
  'rabbit',
  'fox',
  'panda',
  'penguin',
  'sloth',
];

export const ALL_ACCESSORIES: AccessoryType[] = [
  'books',
  'headphones',
  'coffee',
  'scarf',
  'flower',
  'glasses',
];

// Calculate total cumulative XP required to reach a specific level
// Level 1: 0 XP
// Level 2: 200 XP
// Level 3: 500 XP (300 XP delta)
// Level 4: 900 XP (400 XP delta)
// Level 5: 1400 XP (500 XP delta)
// Formula: Cumulative XP = sum_{i=1}^{L-1} (i * 100 + 100)
export const getCumulativeXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += i * 100 + 100;
  }
  return total;
};

// Incremental XP needed to complete the CURRENT level and reach the next one
export const getXPNeededForNextLevel = (currentLevel: number): number => {
  return currentLevel * 100 + 100; // Level 1 needs 200 XP, Level 2 needs 300 XP, etc.
};

// Check if adding XP triggers any level-ups or new unlocks
export interface XPUpdateResult {
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  unlockedThemes: ThemeName[];
  unlockedAvatars: AvatarType[];
  unlockedAccessories: AccessoryType[];
}

export const processXPAdd = (
  currentXP: number,
  currentLevel: number,
  xpToAdd: number,
  unlockedThemes: ThemeName[] = [],
  unlockedAvatars: AvatarType[] = [],
  unlockedAccessories: AccessoryType[] = []
): XPUpdateResult => {
  let newXP = currentXP + xpToAdd;
  let newLevel = currentLevel;
  let leveledUp = false;

  // Level up loop
  while (true) {
    const xpNeeded = getXPNeededForNextLevel(newLevel);
    if (newXP >= xpNeeded) {
      newXP -= xpNeeded;
      newLevel += 1;
      leveledUp = true;
    } else {
      break;
    }
  }

  // Calculate unlock updates based on the updated cumulative level/XP
  const updatedThemes = [...unlockedThemes];
  const updatedAvatars = [...unlockedAvatars];
  const updatedAccessories = [...unlockedAccessories];

  // XP/Level Milestones Unlocks:
  // Themes
  const themeMilestones: { theme: ThemeName; level: number }[] = [
    { theme: 'galaxy', level: 2 },
    { theme: 'ocean', level: 3 },
    { theme: 'peach', level: 4 },
    { theme: 'cherryBlossom', level: 5 },
    { theme: 'milktea', level: 6 },
    { theme: 'matcha', level: 7 },
    { theme: 'sunset', level: 8 },
    { theme: 'moonlight', level: 9 },
    { theme: 'frost', level: 10 },
  ];

  themeMilestones.forEach(({ theme, level }) => {
    if (newLevel >= level && !updatedThemes.includes(theme)) {
      updatedThemes.push(theme);
    }
  });

  // Avatars (base animal types)
  const avatarMilestones: { avatar: AvatarType; level: number }[] = [
    { avatar: 'fox', level: 2 },
    { avatar: 'panda', level: 4 },
    { avatar: 'penguin', level: 6 },
    { avatar: 'sloth', level: 8 },
  ];

  avatarMilestones.forEach(({ avatar, level }) => {
    if (newLevel >= level && !updatedAvatars.includes(avatar)) {
      updatedAvatars.push(avatar);
    }
  });

  // Accessories
  const accessoryMilestones: { accessory: AccessoryType; level: number }[] = [
    { accessory: 'headphones', level: 2 },
    { accessory: 'flower', level: 3 },
    { accessory: 'coffee', level: 5 },
    { accessory: 'scarf', level: 7 },
    { accessory: 'books', level: 9 },
  ];

  accessoryMilestones.forEach(({ accessory, level }) => {
    if (newLevel >= level && !updatedAccessories.includes(accessory)) {
      updatedAccessories.push(accessory);
    }
  });

  return {
    newXP,
    newLevel,
    leveledUp,
    unlockedThemes: updatedThemes,
    unlockedAvatars: updatedAvatars,
    unlockedAccessories: updatedAccessories,
  };
};
