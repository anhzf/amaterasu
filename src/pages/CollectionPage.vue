<script lang="ts" setup>
import { DataSchema } from 'app/src-shared/schemas';
import { ItemOfArray } from 'app/src-shared/utils/type';
import CreateNewCollectionForm from 'components/CreateNewCollectionForm.vue';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import {
  Dialog, Notify, QTable, QTableColumn, QTableProps,
} from 'quasar';
import { tryJSONParse } from 'src/input-rules';
import { FirestoreDataSchema, FirestoreRecordSchema } from 'src/schemas';
import { usePubsubStore } from 'src/stores/pubsub-store';
import { Output, parse } from 'valibot';
import {
  computed, onMounted, ref, watch,
} from 'vue';
import { useRoute } from 'vue-router';

const RESERVED_KEYS = ['id', '_subcollections'];

const { subscribe } = usePubsubStore();

const route = useRoute();

const projectId = computed(() => route.params.projectId as string);
const collectionPath = computed(() => route.params.collectionPath as string);

const theTable = ref<QTable>();

const snapshotListenerUnsubs: (() => void)[] = [];

const pagination = ref<NonNullable<QTableProps['pagination']>>({
  rowsPerPage: 10,
});
const data = ref<Output<typeof DataSchema>[]>([]);

const isLoading = ref(false);

const error = ref();

const cols = computed<QTableColumn<ItemOfArray<typeof data.value>>[]>(() => [
  {
    name: 'id',
    label: 'ID',
    field: 'id',
    align: 'left',
    sortable: true,
    classes: 'text-blue-grey-6 font-mono text-italic',
    style: 'width: 12ch; user-select: all;',
  },
  ...data.value.reduce((acc, item) => {
    Object.keys(item).forEach((key) => {
      if (!RESERVED_KEYS.includes(key) && !acc.find((col) => col.name === key)) {
        acc.push({
          name: key,
          label: key,
          field: key as keyof typeof item,
          align: 'left',
          sortable: true,
        });
      }
    });
    return acc;
  }, [] as QTableColumn<ItemOfArray<typeof data.value>>[]),
  {
    name: 'subcollections',
    label: 'Subcollections',
    field: '_subcollections',
    align: 'left',
    sortable: false,
  },
  {
    name: 'actions',
    label: '',
    field: 'id',
    align: 'right',
    sortable: false,
  },
]);

const selected = ref<typeof data.value>([]);

const activeCreateNewCollectionDocumentPath = ref('');

const isCreateDocumentDialogOpen = ref(false);
const createDocumentField = ref('');

const onViewJSONClick = () => {
  const model = JSON.stringify(selected.value.length === 1 ? selected.value[0] : selected.value, null, 4);

  Dialog.create({
    title: 'View JSON',
    persistent: true,
    cancel: 'Close',
    ok: {
      label: 'Copy',
      color: 'primary',
      icon: 'sym_o_content_copy',
    },
    prompt: {
      model,
      type: 'textarea',
      filled: true,
      autogrow: true,
      readonly: true,
    },
    style: 'width: 100%; max-width: 75vw;',
  })
    .onOk(async () => {
      await navigator.clipboard.writeText(model);
      Notify.create({
        message: 'Copied to clipboard',
        color: 'positive',
        icon: 'sym_o_check',
      });
    });
};

const onFieldEditSave = async (id: string, updates: [FieldPath, FieldValue]) => {
  try {
    isLoading.value = true;

    await FirestoreAdmin.document.update(projectId.value, [collectionPath.value, id].join('/'), JSON.parse(JSON.stringify(updates)));
  } finally {
    isLoading.value = false;
  }
};

const onCreateDocumentSubmit = async () => {
  try {
    isLoading.value = true;

    const raw = JSON.parse(createDocumentField.value);
    const payload = Array.isArray(raw) ? raw.map((el) => parse(FirestoreRecordSchema, el)) : [parse(FirestoreRecordSchema, raw)];
    await FirestoreAdmin.document.create(projectId.value, collectionPath.value, payload);

    isCreateDocumentDialogOpen.value = false;
    createDocumentField.value = '';
  } finally {
    isLoading.value = false;
  }
};

const onAddColumnClick = async (row: (typeof data.value)[number]) => {
  Dialog.create({
    title: `Add columns to ${row.id}`,
    persistent: true,
    cancel: true,
    prompt: {
      model: '',
      type: 'textarea',
      filled: true,
      rules: [tryJSONParse],
      isValid: (v) => !!tryJSONParse(v),
    },
  })
    .onOk(async (value: string) => {
      try {
        isLoading.value = true;

        const payload = parse(FirestoreRecordSchema, JSON.parse(value));

        await FirestoreAdmin.document.update(
          projectId.value,
          [collectionPath.value, row.id].join('/'),
          Object.entries(payload).flat() as [FieldPath, FieldValue, ...any[]],
        );
      } finally {
        isLoading.value = false;
      }
    });
};

const onRemoveColumnClick = async (row: (typeof data.value)[number]) => {
  Dialog.create({
    title: `Remove columns from ${row.id}`,
    message: 'Select columns to remove',
    persistent: true,
    cancel: true,
    options: {
      type: 'checkbox',
      model: [],
      items: Object.keys(row).filter((el) => !RESERVED_KEYS.includes(el))
        .map((el) => ({
          label: el,
          value: el,
        })),
    },
  })
    .onOk((removedColumns: string[]) => {
      Dialog.create({
        title: `Are you sure to remove these columns from ${row.id}?`,
        message: removedColumns.join(', '),
        persistent: true,
        cancel: true,
      })
        .onOk(async () => {
          try {
            isLoading.value = true;

            const payload = removedColumns
              .map((fieldPath) => [fieldPath, undefined])
              .flat() as [FieldPath, FieldValue, ...any[]];

            await FirestoreAdmin.document.update(
              projectId.value,
              [collectionPath.value, row.id].join('/'),
              payload,
            );
          } finally {
            isLoading.value = false;
          }
        });
    });
};

const onDeleteDocumentsClick = () => {
  Dialog.create({
    title: `Are you sure to delete ${selected.value.length} documents?`,
    message: selected.value.map((item) => item.id).join(', '),
    persistent: true,
    cancel: true,
    options: {
      type: 'checkbox',
      model: [],
      items: [
        {
          label: 'Delete subcollections (recursive)',
          value: 'recursive',
        },
      ],
    },
  }).onOk(async (options) => {
    try {
      isLoading.value = true;

      const isRecursive = options.includes('recursive');

      if (isRecursive) {
        await Promise.all(selected.value.map((item) => FirestoreAdmin
          .recursiveDeletes(projectId.value, [collectionPath.value, item.id].join('/'))));
      } else {
        await FirestoreAdmin.document.deletes(projectId.value, ...selected.value.map((item) => [collectionPath.value, item.id].join('/')));
      }

      selected.value = [];
    } finally {
      isLoading.value = false;
    }
  });
};

const onCreateNewCollectionSuccess = () => {
  activeCreateNewCollectionDocumentPath.value = '';
};

const onTableRequest: QTableProps['onRequest'] = async (req) => {
  isLoading.value = true;

  // eslint-disable-next-line camelcase
  const { getCount, unsubscribe } = await __experimental_FirestoreAdmin__.documentsListen({
    projectId: projectId.value,
    path: collectionPath.value,
    query: {
      orderBy: req.pagination.sortBy ? [
        [req.pagination.sortBy, req.pagination.descending ? 'desc' : 'asc'],
      ] : undefined,
      startAfter: (data.value.at(-1) && req.pagination.sortBy && (data.value.at(-1)![req.pagination.sortBy] !== undefined))
        ? [parse(FirestoreDataSchema, data.value.at(-1)![req.pagination.sortBy])]
        : undefined,
      limit: req.pagination.rowsPerPage,
    },
    onSnapshot: (docs) => {
      isLoading.value = true;

      getCount()
        .then((count) => {
          pagination.value = {
            page: req.pagination.page,
            rowsPerPage: req.pagination.rowsPerPage,
            sortBy: req.pagination.sortBy,
            descending: req.pagination.descending,
            rowsNumber: count,
          };
        })
        .catch((err) => {
          error.value = err;
        })
        .finally(() => {
          data.value = docs;
          isLoading.value = false;
        });
    },
    onError: (err) => {
      error.value = err;
    },
  });

  snapshotListenerUnsubs.forEach((unsub) => unsub());
  snapshotListenerUnsubs.push(unsubscribe);
};

onMounted(() => {
  theTable.value?.requestServerInteraction();
});

subscribe('collection:refresh', (payload: {projectId: string, collectionPath: string}) => {
  if (payload.projectId === projectId.value && payload.collectionPath === collectionPath.value) {
    theTable.value?.requestServerInteraction();
  }
});

watch(() => route.params, () => {
  theTable.value?.requestServerInteraction();
  selected.value = [];
});
</script>

<template>
  <q-page
    padding
    class="column gap-md"
  >
    <q-banner
      v-if="error"
      inline-actions
      class="text-white bg-red"
    >
      {{ error }}
      <template #action>
        <q-btn
          flat
          color="white"
          label="OK"
        />
      </template>
    </q-banner>

    <q-table
      ref="theTable"
      v-model:selected="selected"
      v-model:pagination="pagination"
      :columns="cols"
      :rows="data"
      row-key="id"
      selection="multiple"
      :loading="isLoading"
      dense
      wrap-cells
      card-class="full-width max-h-full"
      @request="onTableRequest"
    >
      <template #top-left>
        <q-breadcrumbs>
          <q-breadcrumbs-el
            v-for="(pathSegment, i) in ($route.params.collectionPath as string).split('/')"
            :key="pathSegment"
            :label="pathSegment"
            :to="i % 2 === 0 ? {name: 'collection', params: {
              projectId: $route.params.projectId,
              collectionPath: ($route.params.collectionPath as string).split('/')
                .slice(0, ($route.params.collectionPath as string).split('/').indexOf(pathSegment) + 1)
                .join('/')
            }} : undefined"
            :icon="i % 2 === 0 ? 'sym_o_folder' : 'sym_o_description'"
          />
        </q-breadcrumbs>
      </template>

      <template #top-right>
        <div class="row items-center gap-xs">
          <q-btn
            v-if="selected.length > 0"
            label="View JSON"
            icon="sym_o_data_object"
            size="sm"
            outline
            :disable="isLoading"
            text-color="primary"
            @click="onViewJSONClick"
          />
          <q-btn
            v-if="selected.length === 1"
            label="Duplicate"
            icon="sym_o_content_copy"
            size="sm"
            outline
            :disable="isLoading"
          />
          <q-btn
            v-if="selected.length > 0"
            label="Delete"
            icon="sym_o_delete"
            size="sm"
            outline
            :disable="isLoading"
            text-color="negative"
            @click="onDeleteDocumentsClick"
          />
          <q-btn
            label="Add Document"
            icon="sym_o_add"
            size="sm"
            outline
            :disable="isLoading"
            @click="isCreateDocumentDialogOpen = true"
          />
          <q-btn
            icon="sym_o_refresh"
            size="sm"
            flat
            round
            :disable="isLoading"
            @click="theTable?.requestServerInteraction()"
          />
        </div>
      </template>

      <template #body-cell="props">
        <q-td
          :props="props"
          style="max-width: 40ch;"
        >
          <div :class="['field-cell', (typeof props.value)]">
            {{ typeof props.value === 'string' ? props.value : JSON.stringify(props.value) }}
          </div>

          <!-- TODO: Using object viewer then edit value on clicked key/value -->
          <!-- <q-popup-proxy>
            <q-card>
              <q-card-section>
                <pre>{{ JSON.stringify(props.value, null, 2) }}</pre>
              </q-card-section>
            </q-card>
          </q-popup-proxy> -->

          <q-popup-edit
            v-slot="scope"
            :model-value="props.value"
            :title="`${props.col.label} in ${[collectionPath, props.row.id].join('/')}`"
            buttons
            label-set="Save"
            @update:model-value="(data[props.rowIndex][props.col.field as keyof ItemOfArray<typeof data>]) = $event"
            @save="(v) => onFieldEditSave(props.row.id, [props.col.field, v])"
          >
            <q-input
              :model-value="JSON.stringify(scope.value, null, 4)"
              type="textarea"
              dense
              autofocus
              counter
              rows="10"
              :rules="[tryJSONParse]"
              @update:model-value="scope.value = JSON.parse($event as string)"
              @keyup.enter="scope.set"
            />
          </q-popup-edit>
        </q-td>
      </template>

      <template #body-cell-id="props">
        <q-td :props="props">
          {{ props.value }}
        </q-td>
      </template>

      <template #body-cell-subcollections="props">
        <q-td :props="props">
          <template v-if="props.value.length > 0">
            <router-link
              v-for="subcollection in props.value"
              :key="subcollection.id"
              :to="{name: 'collection', params: {projectId: $route.params.projectId, collectionPath: subcollection.path}}"
            >
              <q-chip
                :label="subcollection.id"
                icon="sym_o_folder"
                color="blue-grey-4"
                text-color="white"
                size="sm"
                clickable
              />
            </router-link>
          </template>

          <q-chip
            label="New subcollection"
            icon="sym_o_add"
            size="sm"
            color="blue-grey"
            clickable
            outline
            @click="activeCreateNewCollectionDocumentPath = `${collectionPath}/${props.row.id}`"
          />
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props">
          <div class="inline-column">
            <q-btn
              label="Columns"
              icon="sym_o_forms_add_on"
              size="sm"
              flat
              @click="onAddColumnClick(props.row)"
            />
            <q-btn
              label="Columns"
              icon="sym_o_delete_sweep"
              size="sm"
              flat
              color="negative"
              @click="onRemoveColumnClick(props.row)"
            />
          </div>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="isCreateDocumentDialogOpen">
      <q-card style="width: 65ch;">
        <q-form @submit="onCreateDocumentSubmit">
          <q-card-section>
            <div class="text-h5 q-my-none">
              Add a Document
            </div>
            <ul>
              <li>Provide an <q-badge>id</q-badge> field to create a custom ID otherwise it will create automatically.</li>
              <li>Use array as root to create multiple documents</li>
            </ul>
          </q-card-section>
          <q-card-section>
            <q-input
              v-model="createDocumentField"
              type="textarea"
              filled
              autofocus
              row="10"
              lazy-rules
              :rules="[tryJSONParse]"
            />
          </q-card-section>
          <q-card-actions>
            <q-btn
              v-close-popup
              label="Cancel"
              flat
            />
            <div class="col" />
            <q-btn
              label="Create document"
              type="submit"
              color="primary"
            />
          </q-card-actions>
        </q-form>

        <q-inner-loading :showing="isLoading" />
      </q-card>
    </q-dialog>

    <q-dialog
      :model-value="!!activeCreateNewCollectionDocumentPath"
      persistent
      @update:model-value="activeCreateNewCollectionDocumentPath = $event ? activeCreateNewCollectionDocumentPath : ''"
    >
      <create-new-collection-form
        :project-id="projectId"
        :path-prefix="activeCreateNewCollectionDocumentPath"
        @success="onCreateNewCollectionSuccess"
      />
    </q-dialog>
  </q-page>
</template>

<style lang="scss" scoped>
.field-cell {
  width: 100%;
  max-height: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;

  &.object {
    font-family: var(--font-family-mono);
  }

  &.string {
    color: $orange;
  }

  &.number {
    color: $green;
  }
}
</style>
src/stores/pubsub-store
