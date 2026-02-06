import jwt, { SignOptions } from "jsonwebtoken";

export function signJwt(data: Object, options?: SignOptions | undefined) {
  return jwt.sign(data, process.env.JWT_SECRET, {
    ...(options && options),
  });
}

export function verifyJwt(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      valid: true,
      expired: false,
      decoded,
    };
  } catch (e: any) {
    console.error(e);
    return {
      valid: false,
      expired: e.message === "jwt expired",
      decoded: null,
    };
  }
}
