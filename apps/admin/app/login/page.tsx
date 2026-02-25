import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@adottaungatto/ui';

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}

const getFirstParamValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const mapErrorMessage = (code: string | undefined) => {
  if (code === 'invalid_credentials') {
    return 'Credenziali non valide.';
  }

  if (code === 'missing_credentials') {
    return 'Inserisci username e password.';
  }

  return undefined;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getFirstParamValue(resolvedSearchParams?.next) ?? '/moderation';
  const errorMessage = mapErrorMessage(getFirstParamValue(resolvedSearchParams?.error));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">admin login</Badge>
            <Badge variant="success">M1.3</Badge>
          </div>
          <CardTitle>Accesso moderazione</CardTitle>
          <CardDescription>Login Keycloak per ruoli moderator/admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" className="space-y-4" method="post">
            <input name="next" type="hidden" value={nextPath} />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">
                Username
              </label>
              <Input id="username" name="username" placeholder="moderatore.demo" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                placeholder="demo1234"
                required
                type="password"
              />
            </div>
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <Button className="w-full" type="submit">
              Accedi
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
