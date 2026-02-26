export const isMockModeEnabled = process.env.NEXT_PUBLIC_USE_MOCKS === '1';

export const shouldFallbackToMock = (status: number | null) => {
  if (!isMockModeEnabled) {
    return false;
  }

  if (status === null) {
    return true;
  }

  return status === 404 || status === 501 || status >= 502;
};
