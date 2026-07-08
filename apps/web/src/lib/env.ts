import 'server-only';

function readApiUrl(): string {
  const value = process.env.API_URL;

  if (!value) {
    throw new Error('API_URL environment variable is not set');
  }

  return value;
}

export const env = {
  get API_URL() {
    return readApiUrl();
  },
};
