import con from 'concurrently';

try {
  await con([
    {
      name: 'vue-devtools',
      command: 'npx vue-devtools',
    },
    {
      name: 'app',
      command: 'npm run dev',
    },
  ], {
    killOthers: ['failure', 'success'],
  }).result;
} finally {
  //
}
