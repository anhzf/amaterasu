export const tryJSONParse = (str: string) => {
  try {
    return JSON.parse(str) && true;
  } catch (err) {
    return 'Invalid JSON';
  }
};
