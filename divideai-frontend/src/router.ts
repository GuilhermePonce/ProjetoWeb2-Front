export type RouteHandler = (params: Record<string, string>) => void | Promise<void>;

interface Route {
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

const routes: Route[] = [];

export function addRoute(path: string, handler: RouteHandler): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:[^/]+/g, (match) => {
      keys.push(match.slice(1));
      return "([^/]+)";
    })}$`,
  );
  routes.push({ pattern, keys, handler });
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function startRouter(): void {
  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();
}

export function renderCurrentRoute(): void {
  const path = window.location.hash.replace("#", "") || "/login";
  const match = routes.find((route) => route.pattern.test(path));
  if (!match) {
    navigate("/dashboard");
    return;
  }

  const values = path.match(match.pattern)?.slice(1) || [];
  const params = match.keys.reduce<Record<string, string>>((acc, key, index) => {
    acc[key] = values[index];
    return acc;
  }, {});
  void match.handler(params);
}
