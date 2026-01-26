import { hash, verify, type Options } from "@node-rs/argon2";

const opts: Options = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  const result = await hash(password, opts);
  return result;
}

export async function verifyPassword(data: {
  password: string;
  hash: string;
}): Promise<boolean> {
  const { password, hash: hashedPassword } = data;

  const result = await verify(hashedPassword, password, opts);
  return result;
}
