import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "sb-access-token";
const REFRESH_TOKEN_KEY = "sb-refresh-token";

export const authHelper = {
    /* บันทึก Tokens */
  saveTokens: (accessToken: string, refreshToken: string) => {
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 7, secure: true });
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 7, secure: true });
  },

    /* ดึง Access Token */
  getAccessToken: (): string | undefined => {
    return Cookies.get(ACCESS_TOKEN_KEY);
  },

    /* ดึง Refresh Token */
  getRefreshToken: (): string | undefined => {
    return Cookies.get(REFRESH_TOKEN_KEY);
  },

    /* ลบ Tokens */
  clearTokens: () => {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  }
};