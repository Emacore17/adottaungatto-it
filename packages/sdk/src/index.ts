import type { HealthResponse } from '@adottaungatto/types';

export const getApiHealth = async (baseUrl: string): Promise<HealthResponse> => {
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
};

export interface PasswordGrantInput {
  keycloakBaseUrl: string;
  realm: string;
  clientId: string;
  username: string;
  password: string;
}

export interface PasswordGrantResponse {
  accessToken: string;
  expiresIn: number;
}

export const requestPasswordGrantToken = async (
  input: PasswordGrantInput,
): Promise<PasswordGrantResponse> => {
  const tokenUrl = `${input.keycloakBaseUrl.replace(/\/$/, '')}/realms/${input.realm}/protocol/openid-connect/token`;
  const formData = new URLSearchParams();
  formData.set('grant_type', 'password');
  formData.set('client_id', input.clientId);
  formData.set('username', input.username);
  formData.set('password', input.password);
  formData.set('scope', 'openid profile email');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Password grant failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in,
  };
};
