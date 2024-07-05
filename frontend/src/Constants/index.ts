const env = process.env.NODE_ENV || "development";

const isProduction = env !== "development";
const publicUrls: Record<string, string> = {
  development: "https://localhost:3000/RedirectPage.html",
  staging: "/RedirectPage.html",
  production: "/RedirectPage.html",
};

const constants = {
  API_URL: isProduction ? "https://api.quickdata.ai" : "https://api.quickdata.ai",
  OCR_ENDPOINT: "/ocr",
  DOMAIN_URL: isProduction ? "https://addin.frontend.quickdata.ai" : "https://localhost:3000",
  REDIRECT_URL: isProduction
    ? "https://addin.frontend.quickdata.ai/RedirectPage.html"
    : "https://localhost:3000/RedirectPage.html",
  CLIENT_ID: "SNz9z1pIvFrwI6MLYDCajFCHqBAD1Hdi",
  AUTH_URL: "https://dev-36xhv0vfokcum8cl.us.auth0.com",
  LOGOUT_URL: `https://dev-36xhv0vfokcum8cl.us.auth0.com/oidc/logout?post_logout_redirect_uri=https://localhost:3000/RedirectPage.html`,
  TOKEN_URL: "https://dev-36xhv0vfokcum8cl.us.auth0.com/oauth/token",
};

export default constants;
