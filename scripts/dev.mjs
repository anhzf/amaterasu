import con from 'concurrently';

try {
  await con([
    {
      name: 'vue-devtools',
      command: 'pnpm vue-devtools',
    },
    {
      name: 'app',
      command: 'quasar dev -m electron',
    },
  ], {
    killOthers: ['failure', 'success'],
  }).result;
} finally {
  //
}
