export async function resolve(specifier, context, next) {
  if (specifier === '@vercel/kv') {
    return { url: new URL('./kv-mock.mjs', import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
