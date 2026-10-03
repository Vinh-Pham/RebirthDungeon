export const authenticationGuide = `Email/password sign-up and sign-in use Better Auth at /api/auth.
Select the Authentication source to explore its generated API reference. Sign up with name, email,
and password (12–128 characters), or sign in with email and password. The response sets a session
cookie. Browser requests include cookies; Expo stores them in SecureStore and forwards them on native requests.
The session lasts a fixed seven days (remembered sessions are enforced). A successful sign-in replaces the user's previous session;
sign-out revokes the current session. Protected application requests always check D1.
There are no JWT access tokens, rotating refresh tokens, verification emails, or password-reset emails in this version.
Sign-up/sign-in are limited to 10 requests per IP per minute, approximately per Cloudflare location.
Use disposable local accounts when testing interactive requests.`;
