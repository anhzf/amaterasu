const PATH_DELIMITER = '/';

export const concatPath = (...paths: string[]) => paths.flatMap((path) => path.split(PATH_DELIMITER)).filter(Boolean).join(PATH_DELIMITER);
