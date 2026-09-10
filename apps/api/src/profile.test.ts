import { describe, it, expect } from 'vitest';
import { updateProfileSchema, userProfileSchema } from '@reprise/shared';

describe('Profile Schemas', () => {
  it('validates a valid profile update with name and avatarUrl', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'Alex Rivers',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Alex Rivers');
      expect(result.data.avatarUrl).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');
    }
  });

  it('validates a profile update with base64 avatar data URI', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
    const result = updateProfileSchema.safeParse({
      displayName: 'Power Lifter',
      avatarUrl: dataUri,
    });
    expect(result.success).toBe(true);
  });

  it('validates a profile update with an emoji preset avatar', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'Beast Mode',
      avatarUrl: '🏋️‍♂️',
    });
    expect(result.success).toBe(true);
  });

  it('allows removing an avatar by setting avatarUrl to null', () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatarUrl).toBeNull();
    }
  });

  it('rejects an empty display name', () => {
    const result = updateProfileSchema.safeParse({
      displayName: '',
    });
    expect(result.success).toBe(false);
  });

  it('validates userProfileSchema with avatarUrl', () => {
    const user = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'athlete@reprise.app',
      displayName: 'Champion',
      avatarUrl: '⚡',
      createdAt: new Date().toISOString(),
    };
    const result = userProfileSchema.safeParse(user);
    expect(result.success).toBe(true);
  });
});
