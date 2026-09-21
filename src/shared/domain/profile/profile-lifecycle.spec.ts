import { deleteProfile, updateProfile } from './profile-lifecycle';

describe('profile lifecycle', () => {
  const buildProfile = () => ({
    name: 'Profile',
    phone: 'old-phone',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  });

  it('updates only the name when no phone change is provided', () => {
    const profile = buildProfile();
    const previousUpdatedAt = profile.updatedAt;

    updateProfile(profile, { name: 'Updated Profile' }, (phone) => phone);

    expect(profile.name).toBe('Updated Profile');
    expect(profile.phone).toBe('old-phone');
    expect(profile.updatedAt).not.toBe(previousUpdatedAt);
  });

  it('updates only the phone when no name change is provided', () => {
    const profile = buildProfile();

    updateProfile(profile, { phone: 'new-phone' }, (phone) => phone);

    expect(profile.name).toBe('Profile');
    expect(profile.phone).toBe('new-phone');
  });

  it('marks a profile as deleted at one consistent timestamp', () => {
    const profile = buildProfile();

    deleteProfile(profile);

    expect(profile.deletedAt).toBeInstanceOf(Date);
    expect(profile.updatedAt).toBe(profile.deletedAt);
  });
});
