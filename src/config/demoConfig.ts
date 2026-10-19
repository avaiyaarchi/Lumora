/**
 * Lumora Demo & Presentation Mode Configuration
 *
 * This configuration controls presentation mode for live demos, allowing
 * immediate access to the full application with the preserved admin/demo profile
 * without requiring Firebase Authentication to succeed or showing login screens.
 *
 * To restore standard mandatory production authentication after the presentation:
 * Set `enabled: false` below (or set EXPO_PUBLIC_DEMO_MODE=false).
 */

import { ALL_ACCESSORIES, ALL_AVATARS, ALL_THEMES } from '../constants/xp';
import { UserProfile } from '../types';

export const ADMIN_USER_EMAIL = 'admin@lumora.app';
export const ADMIN_USER_PASSWORD = 'adminpass123';

export const ADMIN_USER_PROFILE: UserProfile = {
  uid: 'lumora-admin-uid-001',
  name: 'Aarchi',
  email: ADMIN_USER_EMAIL,
  semester: 'Administrator',
  level: 99,
  xp: 99999,
  streak: 99,
  lastStudyDate: new Date().toISOString().split('T')[0],
  joinedDate: new Date().toLocaleDateString(),
  isAdmin: true,
  unlockedThemes: ALL_THEMES,
  equippedAvatar: 'panda',
  equippedAccessories: ['headphones', 'glasses', 'coffee'],
  unlockedAvatars: ALL_AVATARS,
  unlockedAccessories: ALL_ACCESSORIES,
};

export const DEMO_CONFIG = {
  // Flag to enable presentation demo mode
  // Enabled for this presentation build, easily toggled off for standard auth
  enabled: process.env.EXPO_PUBLIC_DEMO_MODE !== 'false',

  // The single preserved admin/demo user profile UID
  demoUserId: 'lumora-admin-uid-001',
} as const;

export const isDemoMode = (): boolean => DEMO_CONFIG.enabled;

/**
 * Entitlement helper to check whether a user has full demo / admin unlocks.
 * Grants access to the preserved admin/demo identity in demo mode, or real admin accounts in production.
 * Real non-admin accounts in production do NOT get unrestricted access.
 */
export const hasFullEntitlements = (
  user?: { uid?: string; isAdmin?: boolean } | null
): boolean => {
  if (!user) return false;
  if (isDemoMode() && (user.isAdmin || user.uid === DEMO_CONFIG.demoUserId)) {
    return true;
  }
  return !!user.isAdmin;
};
