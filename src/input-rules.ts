import { ValidationRule } from 'quasar';

export const tryJSONParse: ValidationRule = (str: string) => {
  try {
    return JSON.parse(str) && true;
  } catch (err) {
    return 'Invalid JSON';
  }
};
