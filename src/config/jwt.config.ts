export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required and was not provided. Refusing to start with an insecure default.',
    );
  }

  return secret;
}
