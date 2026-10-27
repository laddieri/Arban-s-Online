/** Message for a caught value (`catch (err)` is `unknown`), or a fallback */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
