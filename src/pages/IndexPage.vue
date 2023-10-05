<script lang="ts" setup>
import { QPage } from 'quasar';

const onBtnClick = () => {
  GApis.firestore.document.listenList('projects', '', 'test', console.log);
};
</script>

<template>
  <q-page padding>
    <q-btn
      label="asdasd"
      @click="onBtnClick"
    />
  </q-page>
</template>
