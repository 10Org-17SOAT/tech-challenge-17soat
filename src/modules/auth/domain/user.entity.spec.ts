import { User } from './user.entity';

describe('User entity', () => {
  it('creates the identity shared by profile specializations', () => {
    const user = User.create({
      name: '  Maria Silva  ',
      email: 'MARIA@EMAIL.COM',
      password_hash: 'hashed-password',
      role_id: 2,
    });

    expect(user.user_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(user.name).toBe('Maria Silva');
    expect(user.email).toBe('maria@email.com');
    expect(user.password_hash).toBe('hashed-password');
    expect(user.role_id).toBe(2);
  });

  it('restores the persisted identity without changing its id', () => {
    const user = User.restore({
      user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: '  João Silva  ',
      email: 'JOAO@EMAIL.COM',
      password_hash: 'hashed-password',
      role_id: 3,
    });

    expect(user.user_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(user.name).toBe('João Silva');
    expect(user.email).toBe('joao@email.com');
    expect(user.role_id).toBe(3);
  });

  it('updates common identity fields while preserving the user id', () => {
    const user = User.create({
      name: 'Carlos',
      email: 'carlos@email.com',
      password_hash: 'old-password',
      role_id: 1,
    });
    const userId = user.user_id;

    user.update({
      name: '  Carlos Nova  ',
      email: 'CARLOS.NOVA@EMAIL.COM',
      role_id: 4,
    });

    expect(user.user_id).toBe(userId);
    expect(user.name).toBe('Carlos Nova');
    expect(user.email).toBe('carlos.nova@email.com');
    expect(user.role_id).toBe(4);
    expect(user.password_hash).toBe('old-password');
  });
});
