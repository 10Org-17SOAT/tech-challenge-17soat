import { randomUUID } from 'node:crypto';

export interface UserProps {
  user_id: string;
  name: string;
  email: string;
  password_hash: string;
  role_id: number;
}

export interface CreateUserProps {
  name: string;
  email: string;
  password_hash: string;
  role_id: number;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: CreateUserProps): User {
    return new User({
      user_id: randomUUID(),
      name: props.name.trim(),
      email: props.email.toLowerCase(),
      password_hash: props.password_hash,
      role_id: props.role_id,
    });
  }

  static restore(props: UserProps): User {
    return new User({
      ...props,
      name: props.name.trim(),
      email: props.email.toLowerCase(),
    });
  }

  update(changes: {
    name?: string;
    email?: string;
    password_hash?: string;
    role_id?: number;
  }): void {
    if (changes.name !== undefined) this.props.name = changes.name.trim();
    if (changes.email !== undefined)
      this.props.email = changes.email.toLowerCase();
    if (changes.password_hash !== undefined)
      this.props.password_hash = changes.password_hash;
    if (changes.role_id !== undefined) this.props.role_id = changes.role_id;
  }

  get user_id() {
    return this.props.user_id;
  }
  get name() {
    return this.props.name;
  }
  get email() {
    return this.props.email;
  }
  get password_hash() {
    return this.props.password_hash;
  }
  get role_id() {
    return this.props.role_id;
  }
}
