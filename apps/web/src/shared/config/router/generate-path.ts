import { generatePath as routerGeneratePath } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';

type Args<Path extends string> = Parameters<typeof routerGeneratePath<Path>>;

const generatePath = <Path extends string>(
  originalPath: Args<Path>['0'],
  params?: Args<Path>['1'],
) => {
  try {
    return routerGeneratePath(originalPath, params);
  } catch {
    return RoutePath.NotFound;
  }
};

export default generatePath;
