import { resolve } from 'node:path';
import { config as loadDotEnv } from 'dotenv';

type HttpMethod = 'GET' | 'POST';

type CookieJarStore = Map<string, Map<string, string>>;

const fail = (scope: string, message: string): never => {
  throw new Error(`[test:smoke:auth] ${scope}: ${message}`);
};

const smokeDebugEnabled = process.env.AUTH_SMOKE_DEBUG === '1';

const debugLog = (message: string): void => {
  if (!smokeDebugEnabled) {
    return;
  }

  console.log(`[test:smoke:auth][debug] ${message}`);
};

const assertPresent = <TValue>(
  value: TValue,
  scope: string,
  message: string,
): NonNullable<TValue> => {
  if (value === null || value === undefined) {
    fail(scope, message);
  }

  return value as NonNullable<TValue>;
};

const getSetCookieValues = (response: Response): string[] => {
  const headersWithSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    return headersWithSetCookie.getSetCookie();
  }

  const rawHeader = response.headers.get('set-cookie');
  if (!rawHeader) {
    return [];
  }

  return rawHeader.split(/,(?=[^;,]+=)/g);
};

const readCookieAttributes = (segments: string[]): Map<string, string> => {
  const attributes = new Map<string, string>();
  for (const segment of segments) {
    const [rawName, ...rawValueParts] = segment.split('=');
    const name = rawName?.trim().toLowerCase();
    if (!name) {
      continue;
    }
    attributes.set(name, rawValueParts.join('=').trim());
  }
  return attributes;
};

const setCookieFromHeader = (
  cookieJar: CookieJarStore,
  requestUrl: string,
  setCookieValue: string,
): void => {
  const [rawNameValue, ...rawAttributeSegments] = setCookieValue.split(';');
  const separatorIndex = rawNameValue.indexOf('=');
  if (separatorIndex <= 0) {
    return;
  }

  const cookieName = rawNameValue.slice(0, separatorIndex).trim();
  const cookieValue = rawNameValue.slice(separatorIndex + 1).trim();
  if (!cookieName) {
    return;
  }

  const requestHost = new URL(requestUrl).hostname.toLowerCase();
  const attributes = readCookieAttributes(rawAttributeSegments);
  const domain = (attributes.get('domain') ?? requestHost).replace(/^\./, '').toLowerCase();
  const maxAgeRaw = attributes.get('max-age');
  const maxAge = maxAgeRaw ? Number.parseInt(maxAgeRaw, 10) : Number.NaN;
  const shouldDelete = cookieValue.length === 0 || Number.isFinite(maxAge) && maxAge <= 0;

  const domainCookies = cookieJar.get(domain) ?? new Map<string, string>();
  if (shouldDelete) {
    domainCookies.delete(cookieName);
  } else {
    domainCookies.set(cookieName, cookieValue);
  }

  if (domainCookies.size === 0) {
    cookieJar.delete(domain);
    return;
  }

  cookieJar.set(domain, domainCookies);
};

const persistResponseCookies = (
  cookieJar: CookieJarStore,
  requestUrl: string,
  response: Response,
): void => {
  const setCookieValues = getSetCookieValues(response);
  for (const setCookieValue of setCookieValues) {
    setCookieFromHeader(cookieJar, requestUrl, setCookieValue);
  }
};

const buildCookieHeaderForUrl = (cookieJar: CookieJarStore, requestUrl: string): string | null => {
  const hostname = new URL(requestUrl).hostname.toLowerCase();
  const pairs: string[] = [];

  for (const [domain, cookies] of cookieJar.entries()) {
    const matchesDomain = hostname === domain || hostname.endsWith(`.${domain}`);
    if (!matchesDomain) {
      continue;
    }

    for (const [cookieName, cookieValue] of cookies.entries()) {
      pairs.push(`${cookieName}=${cookieValue}`);
    }
  }

  if (pairs.length === 0) {
    return null;
  }

  return pairs.join('; ');
};

const hasCookieForUrl = (cookieJar: CookieJarStore, requestUrl: string, cookieName: string): boolean => {
  const hostname = new URL(requestUrl).hostname.toLowerCase();

  for (const [domain, cookies] of cookieJar.entries()) {
    const matchesDomain = hostname === domain || hostname.endsWith(`.${domain}`);
    if (!matchesDomain) {
      continue;
    }

    if (cookies.has(cookieName)) {
      return true;
    }
  }

  return false;
};

const fetchWithJar = async (
  cookieJar: CookieJarStore,
  requestUrl: string,
  init: RequestInit = {},
): Promise<Response> => {
  const headers = new Headers(init.headers);
  const cookieHeader = buildCookieHeaderForUrl(cookieJar, requestUrl);
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  const response = await fetch(requestUrl, {
    ...init,
    headers,
    redirect: 'manual',
  });
  persistResponseCookies(cookieJar, requestUrl, response);
  return response;
};

const isRedirectStatus = (status: number): boolean => {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
};

const getRedirectLocation = (response: Response, baseUrl: string): string | null => {
  const location = response.headers.get('location');
  if (!location) {
    return null;
  }

  try {
    return new URL(location, baseUrl).toString();
  } catch {
    return null;
  }
};

const followRedirectChain = async (
  cookieJar: CookieJarStore,
  startUrl: string,
  init: {
    method?: HttpMethod;
    body?: string;
    headers?: HeadersInit;
  } = {},
): Promise<{ response: Response; finalUrl: string }> => {
  let currentUrl = startUrl;
  let method: HttpMethod = init.method ?? 'GET';
  let body = init.body;
  const headers = new Headers(init.headers);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const requestHeaders = new Headers(headers);
    if (method === 'POST' && body && !requestHeaders.has('content-type')) {
      requestHeaders.set('content-type', 'application/x-www-form-urlencoded');
    }

    const response = await fetchWithJar(cookieJar, currentUrl, {
      method,
      headers: requestHeaders,
      body: method === 'POST' ? body : undefined,
    });

    if (!isRedirectStatus(response.status)) {
      debugLog(`final response ${response.status} at ${currentUrl}`);
      return { response, finalUrl: currentUrl };
    }

    const nextUrl = getRedirectLocation(response, currentUrl);
    if (!nextUrl) {
      fail('redirect', `missing or invalid location header on status ${response.status}`);
    }

    const mustSwitchToGet =
      response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST');
    if (mustSwitchToGet) {
      method = 'GET';
      body = undefined;
      headers.delete('content-type');
    }

    currentUrl = assertPresent(
      nextUrl,
      'redirect',
      `missing or invalid location header on status ${response.status}`,
    );
    debugLog(`redirect ${response.status} -> ${currentUrl}`);
  }

  fail('redirect', 'too many redirects while following auth flow');
  throw new Error('Unreachable');
};

const extractLoginFormAction = (html: string, baseUrl: string): string => {
  const formMatch = html.match(/<form[^>]*id=["']kc-form-login["'][^>]*action=["']([^"']+)["']/i);
  if (!formMatch?.[1]) {
    fail('keycloak-login', 'cannot find Keycloak login form action');
  }
  const formAction = formMatch?.[1];

  try {
    return new URL(assertPresent(formAction, 'keycloak-login', 'missing form action'), baseUrl).toString();
  } catch {
    fail('keycloak-login', 'invalid Keycloak login form action URL');
    throw new Error('Unreachable');
  }
};

const extractHiddenFormFields = (html: string): URLSearchParams => {
  const fields = new URLSearchParams();
  const hiddenInputPattern =
    /<input[^>]*type=["']hidden["'][^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi;

  let match = hiddenInputPattern.exec(html);
  while (match) {
    const fieldName = match[1]?.trim();
    if (fieldName) {
      fields.set(fieldName, match[2] ?? '');
    }
    match = hiddenInputPattern.exec(html);
  }

  return fields;
};

const parseLocationPath = (location: string | null, baseUrl: string): string => {
  if (!location) {
    return '';
  }

  try {
    return new URL(location, baseUrl).pathname;
  } catch {
    return '';
  }
};

const assertApiHealth = async (apiBaseUrl: string): Promise<void> => {
  let response: Response | null = null;
  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    fail('preflight', `API not reachable at ${apiBaseUrl}. Start API before running smoke auth.`);
  }

  if (!response?.ok) {
    fail(
      'preflight',
      `API health check failed at ${apiBaseUrl}/health (status ${response?.status ?? 'unknown'}).`,
    );
  }
};

const run = async () => {
  loadDotEnv({ path: resolve(process.cwd(), '.env.local') });
  loadDotEnv({ path: resolve(process.cwd(), '../../.env.local') });
  loadDotEnv();

  const webUrl = (
    process.env.WEB_SMOKE_URL ??
    process.env.NEXT_PUBLIC_WEB_URL ??
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
  const webOrigin = new URL(webUrl).origin;
  const apiUrl = process.env.API_SMOKE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3002';
  const username = process.env.AUTH_SMOKE_USERNAME ?? 'utente.demo';
  const password = process.env.AUTH_SMOKE_PASSWORD ?? 'demo1234';
  const cookieName = process.env.WEB_SESSION_COOKIE_NAME ?? 'adottaungatto_web_token';
  const cookieJar: CookieJarStore = new Map();

  await assertApiHealth(apiUrl);

  const loginStartUrl = `${webUrl}/api/auth/login?next=%2Faccount`;
  const loginStartResponse = await fetchWithJar(cookieJar, loginStartUrl, { method: 'GET' });
  if (loginStartResponse.status !== 303) {
    fail('login-start', `expected 303, received ${loginStartResponse.status}`);
  }

  const keycloakAuthorizationUrl = getRedirectLocation(loginStartResponse, loginStartUrl);
  if (!keycloakAuthorizationUrl) {
    fail('login-start', 'missing redirect location to OIDC provider');
  }

  const authPageResult = await followRedirectChain(
    cookieJar,
    assertPresent(keycloakAuthorizationUrl, 'login-start', 'missing redirect location to OIDC provider'),
  );
  if (authPageResult.response.status !== 200) {
    fail(
      'keycloak-login-page',
      `expected 200 login page, received ${authPageResult.response.status}`,
    );
  }

  const loginPageHtml = await authPageResult.response.text();
  const loginActionUrl = extractLoginFormAction(loginPageHtml, authPageResult.finalUrl);
  const loginForm = extractHiddenFormFields(loginPageHtml);
  loginForm.set('username', username);
  loginForm.set('password', password);

  const loginSubmitResult = await followRedirectChain(cookieJar, loginActionUrl, {
    method: 'POST',
    body: loginForm.toString(),
  });
  debugLog(`login submit final URL: ${loginSubmitResult.finalUrl}`);

  if (!hasCookieForUrl(cookieJar, webUrl, cookieName)) {
    fail('callback', `expected session cookie "${cookieName}" after OIDC callback`);
  }

  if (new URL(loginSubmitResult.finalUrl).origin !== webOrigin) {
    fail('callback', `expected return to web origin, got ${loginSubmitResult.finalUrl}`);
  }

  const accountResponse = await fetchWithJar(cookieJar, `${webUrl}/account`, { method: 'GET' });
  if (accountResponse.status === 200) {
    const accountMarkup = await accountResponse.text();
    if (!accountMarkup.includes('Il tuo account')) {
      fail('account', 'account page does not contain expected heading');
    }
  } else if (isRedirectStatus(accountResponse.status)) {
    const redirectPath = parseLocationPath(accountResponse.headers.get('location'), webUrl);
    if (redirectPath !== '/verifica-account') {
      fail(
        'account',
        `expected /account to resolve to 200 or redirect /verifica-account, got ${redirectPath || '<empty>'}`,
      );
    }

    const verifyAccountResponse = await fetchWithJar(cookieJar, `${webUrl}/verifica-account`, {
      method: 'GET',
    });
    if (verifyAccountResponse.status !== 200) {
      fail(
        'account',
        `expected /verifica-account status 200 after redirect, received ${verifyAccountResponse.status}`,
      );
    }
  } else {
    fail('account', `expected status 200 or redirect, received ${accountResponse.status}`);
  }

  const logoutResponse = await fetchWithJar(cookieJar, `${webUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      origin: webOrigin,
      referer: `${webUrl}/account`,
      'x-auth-mode': 'spa',
    },
  });

  if (logoutResponse.status !== 200) {
    fail('logout', `expected status 200, received ${logoutResponse.status}`);
  }

  const logoutPayload = (await logoutResponse.json().catch(() => null)) as
    | {
        redirectTo?: string;
      }
    | null;
  if (!logoutPayload?.redirectTo || typeof logoutPayload.redirectTo !== 'string') {
    fail('logout', 'expected JSON payload with redirectTo');
  }

  const accountAfterLogoutResponse = await fetchWithJar(cookieJar, `${webUrl}/account`, {
    method: 'GET',
  });
  if (!isRedirectStatus(accountAfterLogoutResponse.status)) {
    fail(
      'post-logout',
      `expected redirect status (301/302/303/307/308), received ${accountAfterLogoutResponse.status}`,
    );
  }

  const postLogoutRedirectPath = parseLocationPath(
    accountAfterLogoutResponse.headers.get('location'),
    webUrl,
  );
  if (postLogoutRedirectPath !== '/login') {
    fail(
      'post-logout',
      `expected redirect to /login, received ${postLogoutRedirectPath || '<empty>'}`,
    );
  }

  console.log('[test:smoke:auth] OIDC web auth smoke passed (login -> callback -> account -> logout).');
};

run().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
