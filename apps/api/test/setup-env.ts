process.env.NODE_ENV ??= 'test';
process.env.API_HOST ??= '127.0.0.1';
process.env.API_PORT ??= '3002';
process.env.DATABASE_URL ??=
  'postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.OPENSEARCH_URL ??= 'http://localhost:9200';
process.env.MINIO_ENDPOINT ??= 'http://localhost:9000';
process.env.MINIO_ACCESS_KEY ??= 'minio';
process.env.MINIO_SECRET_KEY ??= 'minio123';
process.env.KEYCLOAK_URL ??= 'http://localhost:8080';
process.env.KEYCLOAK_REALM ??= 'adottaungatto';
process.env.KEYCLOAK_CLIENT_ID_WEB ??= 'adottaungatto-web';
process.env.KEYCLOAK_CLIENT_ID_ADMIN ??= 'adottaungatto-admin';
process.env.KEYCLOAK_CLIENT_ID_MOBILE ??= 'adottaungatto-mobile';
process.env.AUTH_DEV_HEADERS_ENABLED ??= 'true';
