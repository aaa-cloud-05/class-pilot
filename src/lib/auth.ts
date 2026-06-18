const CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "440587564587-rkc9moajd4oloh6u6vf2orh4scorrugm.apps.googleusercontent.com";

const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
].join(" ");

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let currentToken: string | null = null;
let onTokenChange: ((token: string | null) => void) | null = null;

export function getAccessToken(): string | null {
  return currentToken;
}

export function setTokenChangeListener(cb: (token: string | null) => void) {
  onTokenChange = cb;
}

export function initGis(): Promise<void> {
  return new Promise((resolve) => {
    if (tokenClient) {
      resolve();
      return;
    }
    const check = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(check);
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp) => {
            if (resp.error) {
              currentToken = null;
              onTokenChange?.(null);
              return;
            }
            currentToken = resp.access_token;
            onTokenChange?.(currentToken);
          },
        });
        resolve();
      }
    }, 100);
  });
}

export function requestLogin() {
  tokenClient?.requestAccessToken({ prompt: "consent" });
}

export function requestSilentRefresh() {
  tokenClient?.requestAccessToken({ prompt: "" });
}

export function logout() {
  if (currentToken) {
    google.accounts.oauth2.revoke(currentToken, () => {});
  }
  currentToken = null;
  onTokenChange?.(null);
}
