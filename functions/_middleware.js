const PRIVATE_PATH_RE = /^\/(?:data|server|templates|functions|node_modules|\.[^/]+)(?:\/|$)|^\/(?:package(?:-lock)?\.json|README-ADMIN\.md)$/i;

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (PRIVATE_PATH_RE.test(pathname)) {
    return new Response('Not found', { status: 404 });
  }
  return context.next();
}
