import type { Instrumentation } from 'next'
export const onRequestError: Instrumentation.onRequestError = (_error, _request, context) => {
  // The route pattern has no query string or applicant-provided field values.
  console.error('Unhandled request error', { route: context.routePath, routeType: context.routeType })
}
