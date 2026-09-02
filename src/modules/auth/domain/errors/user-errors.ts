export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`Usuário não encontrado: ${id}`);
  }
}

export class UserEmailAlreadyExistsError extends Error {
  constructor(email: string, options?: ErrorOptions) {
    super(`E-mail já cadastrado: ${email}`, options);
  }
}
