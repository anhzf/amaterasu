<script lang="ts" setup>
import { useAsyncState } from '@vueuse/core';
import electronConfig from 'app/src-electron/config';
import { CollectionReferenceSchema } from 'app/src-shared/schemas';
import CreateNewCollectionForm from 'components/CreateNewCollectionForm.vue';
import { Output } from 'valibot';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { type firebase_v1beta1 as firebaseApis } from 'googleapis';
import { usePubsubStore } from 'src/stores/pubsub-store';
import { Dialog, Notify } from 'quasar';

interface ProjectCollectionState {
  isLoading: boolean;
  isLoaded: boolean;
  error: unknown;
  data: Output<typeof CollectionReferenceSchema>[];
}

const pubsub = usePubsubStore();

const route = useRoute();

const emulatorProject: firebaseApis.Schema$FirebaseProject = {
  displayName: 'emulator',
  name: 'emulator',
  projectId: electronConfig.firebase.emulatorAppName,
};

const {
  state: projects, error, isLoading, execute: getProjects,
} = useAsyncState(async () => {
  const result = await GApis.projects.list();
  return [...(result.data.results || []), emulatorProject];
}, [emulatorProject]);

const activeCreateNewCollectionProjectId = ref('');

const projectCollections = ref<Record<string, ProjectCollectionState>>({});

const listProjectCollections = async (projectId: string) => {
  projectCollections.value[projectId] = {
    isLoaded: false,
    isLoading: true,
    error: null,
    data: [],
  };

  try {
    projectCollections.value[projectId].data = await GApis.firestore.collection.list('/', projectId);
  } catch (err) {
    projectCollections.value[projectId].error = err;
  } finally {
    projectCollections.value[projectId].isLoaded = true;
    projectCollections.value[projectId].isLoading = false;
  }
};

const onProjectExpand = (projectId: string) => {
  if (!projectCollections.value[projectId]?.isLoaded) {
    listProjectCollections(projectId);
  }
};

const onDeleteCollectionClick = (projectId: string, collectionPath: string) => {
  Dialog.create({
    title: 'Confirm',
    message: `Are you sure you want to delete collection "${collectionPath}"?`,
    persistent: true,
    ok: {
      label: 'Yes, delete it',
      color: 'negative',
    },
    cancel: {
      label: 'No',
    },
  })
    .onOk(async () => {
      try {
        isLoading.value = true;
        await FirestoreAdmin.recursiveDeletes(projectId, collectionPath);

        await listProjectCollections(projectId);

        Notify.create({
          message: `Collection "${collectionPath}" deleted`,
          color: 'positive',
        });
      } catch (err: any) {
        console.error(err);
        Dialog.create({
          title: 'Error',
          message: err?.message || String(err),
        });
      } finally {
        isLoading.value = false;
      }
    });
};

onMounted(() => {
  if (route.params.projectId) {
    listProjectCollections(route.params.projectId as string);
  }
});

pubsub.subscribe('project:refresh', async (projectId: string) => {
  await listProjectCollections(projectId);
});
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          Amaterasu
        </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer
      show-if-above
      elevated
      class="column"
    >
      <q-scroll-area class="col">
        <q-list>
          <q-item-label
            header
            class="row items-center gap-xs"
          >
            <span>Projects</span>
            <q-btn
              icon="sym_o_refresh"
              flat
              round
              size="sm"
              :disable="isLoading"
              @click="getProjects()"
            />
          </q-item-label>

          <template v-if="isLoading">
            <q-item
              v-for="i in 7"
              :key="i"
              dense
            >
              <q-item-section>
                <q-skeleton type="rect" />
              </q-item-section>
            </q-item>
          </template>

          <template v-else-if="projects.length > 0">
            <q-expansion-item
              v-for="project in projects"
              :key="project.projectId!"
              expand-separator
              dense
              :disable="projectCollections[project.projectId!]?.isLoading"
              :default-opened="$route.params.projectId === project.projectId"
              @show="onProjectExpand(project.projectId!)"
            >
              <template #header>
                <q-item-section avatar>
                  <q-icon name="sym_o_local_fire_department" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ project.displayName || project.name || project.projectId! }}</q-item-label>
                </q-item-section>

                <q-menu
                  touch-position
                  context-menu
                  transition-show="slide-down"
                >
                  <q-list
                    dense
                    style="min-width: 100px"
                  >
                    <q-item
                      v-close-popup
                      clickable
                      @click="pubsub.publish('project:refresh', project.projectId)"
                    >
                      <q-item-section>Refresh project</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </template>

              <q-card>
                <q-card-section>
                  <q-list dense>
                    <q-item
                      clickable
                      @click="activeCreateNewCollectionProjectId = project.projectId!"
                    >
                      <q-item-section avatar>
                        <q-icon name="sym_o_add" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>Create new collection</q-item-label>
                      </q-item-section>
                    </q-item>

                    <template v-if="projectCollections[project.projectId!]?.isLoading">
                      <q-item
                        v-for="i in 5"
                        :key="i"
                      >
                        <q-item-section>
                          <q-skeleton type="rect" />
                        </q-item-section>
                      </q-item>
                    </template>

                    <template v-else-if="projectCollections[project.projectId!]?.data.length > 0">
                      <q-item
                        v-for="collection in projectCollections[project.projectId!].data"
                        :key="collection.path"
                        :to="{name: 'collection', params: {projectId: project.projectId, collectionPath: collection.path}}"
                      >
                        <q-item-section avatar>
                          <q-icon name="sym_o_folder" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ collection.id }}</q-item-label>
                        </q-item-section>

                        <q-menu
                          touch-position
                          context-menu
                          transition-show="slide-down"
                        >
                          <q-list
                            dense
                            style="min-width: 100px"
                          >
                            <q-item
                              v-close-popup
                              clickable
                              @click="pubsub.publish('collection:refresh', {projectId: project.projectId, collectionPath: collection.path})"
                            >
                              <q-item-section
                                side
                              >
                                <q-icon
                                  name="sym_o_refresh"
                                  size="xs"
                                />
                              </q-item-section>
                              <q-item-section>Refresh collection</q-item-section>
                            </q-item>
                            <q-item
                              v-close-popup
                              clickable
                              @click="onDeleteCollectionClick(project.projectId!, collection.path)"
                            >
                              <q-item-section
                                side
                              >
                                <q-icon
                                  color="negative"
                                  name="sym_o_delete"
                                  size="xs"
                                />
                              </q-item-section>
                              <q-item-section class="text-negative">
                                Delete collection
                              </q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-item>
                    </template>

                    <template v-else-if="projectCollections[project.projectId!]?.error">
                      <q-item>
                        <q-item-section>
                          <q-item-label>Error</q-item-label>
                          <q-item-label caption>
                            {{ projectCollections[project.projectId!]?.error }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-list>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </template>

          <template v-else-if="error">
            <q-item>
              <q-item-section>
                <q-item-label>Error</q-item-label>
                <q-item-label caption>
                  {{ error }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-btn
              label="Refresh"
              icon="sym_o_refresh"
              @click="getProjects()"
            />
          </template>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container class="bg-grey-12">
      <router-view
        ref="pageRef"
        :style="{maxWidth: '100%'}"
        :style-fn="(offset: number, height: number) => ({height: height - offset + 'px'})"
      />
    </q-page-container>

    <q-dialog
      :model-value="!!activeCreateNewCollectionProjectId"
      persistent
      @update:model-value="activeCreateNewCollectionProjectId = $event ? activeCreateNewCollectionProjectId : ''"
    >
      <create-new-collection-form
        :project-id="activeCreateNewCollectionProjectId"
        @success="activeCreateNewCollectionProjectId = ''"
      />
    </q-dialog>
  </q-layout>
</template>
