import { Badge } from './types';

export const BADGES: Badge[] = [
  // XP Milestones
  { id: 'xp-1', name: 'First Steps', description: 'Earn your first 100 XP.', icon: 'trophy', type: 'xp', value: 100 },
  { id: 'xp-2', name: 'Novice Learner', description: 'Reach 1,000 total XP.', icon: 'trophy', type: 'xp', value: 1000 },
  { id: 'xp-3', name: 'Adept Scholar', description: 'Reach 5,000 total XP.', icon: 'trophy', type: 'xp', value: 5000 },
  { id: 'xp-4', name: 'Expert Linguist', description: 'Reach 10,000 total XP.', icon: 'trophy', type: 'xp', value: 10000 },

  // Time Milestones (in seconds)
  { id: 'time-1', name: 'Quick Start', description: 'Study for a total of 15 minutes.', icon: 'clock', type: 'time', value: 900 },
  { id: 'time-2', name: 'Getting Serious', description: 'Study for a total of 1 hour.', icon: 'clock', type: 'time', value: 3600 },
  { id: 'time-3', name: 'Dedicated Student', description: 'Study for a total of 5 hours.', icon: 'clock', type: 'time', value: 18000 },
  { id: 'time-4', name: 'Vmind Veteran', description: 'Study for a total of 20 hours.', icon: 'clock', type: 'time', value: 72000 },
];
