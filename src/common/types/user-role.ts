export const USER_ROLES = ['admin', 'mod', 'recruiter'] as const;

export type UserRole = (typeof USER_ROLES)[number];
