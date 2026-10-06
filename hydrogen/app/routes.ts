import {flatRoutes} from '@react-router/fs-routes';
import {
  prefix,
  type RouteConfig,
  type RouteConfigEntry,
} from '@react-router/dev/routes';
import {hydrogenRoutes} from '@shopify/hydrogen';

// Index routes can't keep `index: true` once prefix() gives them a path.
function dropIndexFlag(routes: RouteConfigEntry[]): RouteConfigEntry[] {
  return routes.map((route) => {
    const children = route.children ? dropIndexFlag(route.children) : undefined;
    const next = children ? {...route, children} : route;
    return next.index && next.path ? {...next, index: false} : next;
  });
}

export default hydrogenRoutes(
  dropIndexFlag(prefix(':locale?', await flatRoutes())),
) satisfies RouteConfig;
