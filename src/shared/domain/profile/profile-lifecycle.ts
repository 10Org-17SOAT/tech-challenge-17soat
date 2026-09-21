interface ProfileState<TPhone> {
  name: string;
  phone: TPhone;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function updateProfile<TPhone>(
  profile: ProfileState<TPhone>,
  changes: { name?: string; phone?: string },
  createPhone: (value: string) => TPhone,
): void {
  if (changes.name !== undefined) {
    profile.name = changes.name;
  }
  if (changes.phone !== undefined) {
    profile.phone = createPhone(changes.phone);
  }
  profile.updatedAt = new Date();
}

export function deleteProfile(profile: ProfileState<unknown>): void {
  const deletedAt = new Date();
  profile.deletedAt = deletedAt;
  profile.updatedAt = deletedAt;
}
