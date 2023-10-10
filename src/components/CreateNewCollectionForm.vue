<script lang="ts" setup>
import { concatPath } from 'app/src-shared/utils/firestore';
import { tryJSONParse } from 'src/input-rules';
import { FirestoreRecordSchema } from 'src/schemas';
import { parse } from 'valibot';
import {
  reactive, ref,
} from 'vue';

interface Props {
  projectId: string;
  pathPrefix?: string;
}

interface Emits {
  (ev: 'success'): void;
}

const props = withDefaults(defineProps<Props>(), {
  pathPrefix: '',
});
const emit = defineEmits<Emits>();

const isLoading = ref(false);

const fields = reactive({
  collectionName: '',
  document: '',
});

const onSubmit = async () => {
  isLoading.value = true;
  try {
    const path = concatPath(props.pathPrefix, fields.collectionName);
    const raw = JSON.parse(fields.document);
    const payload = Array.isArray(raw)
      ? raw.map((el) => parse(FirestoreRecordSchema, el))
      : [parse(FirestoreRecordSchema, raw)];

    await FirestoreAdmin.document.create(props.projectId, path, payload);
    emit('success');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <q-card
    class="full-width"
    style="max-width: 75vw;"
  >
    <q-form @submit="onSubmit">
      <q-card-section>
        <div class="text-h5 q-my-none">
          Create New Collection
        </div>
      </q-card-section>
      <q-card-section>
        <q-input
          v-model="fields.collectionName"
          label="Collection name"
          outlined
          lazy-rules
          :rules="[val => !!val || 'Please enter a collection name']"
        />
        <q-input
          v-model="fields.document"
          label="Document"
          placeholder="Please create your first JSON document"
          type="textarea"
          filled
          row="20"
          lazy-rules
          :rules="[tryJSONParse]"
        />
      </q-card-section>

      <q-card-actions>
        <q-btn
          v-close-popup
          label="Cancel"
        />
        <div class="col" />
        <q-btn
          type="submit"
          label="Create"
          color="primary"
          :disable="!fields.collectionName || !fields.document"
        />
      </q-card-actions>

      <q-inner-loading :showing="isLoading" />
    </q-form>
  </q-card>
</template>
