import { boot } from 'quasar/wrappers';
import devtools from '@vue/devtools';

export default boot(() => {
  if (process.env.NODE_ENV === 'development') {
    devtools.connect();

    window.addEventListener('error', (event) => {
      ElectronUtils.mainLog('Unhandled rejection: ', event.error);
    });
  }
});
