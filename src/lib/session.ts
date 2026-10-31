/** Cookie giữ mã đăng ký gần nhất trên thiết bị này. */
export const RESULT_COOKIE = "dktt_dk";

export const RESULT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 60,
};
