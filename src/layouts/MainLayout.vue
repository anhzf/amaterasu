<script lang="ts" setup>
import { useAsyncState } from '@vueuse/core';
import { CollectionReferenceSchema } from 'app/src-shared/schemas';
import { Output } from 'valibot';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

interface ProjectCollectionState {
  isLoading: boolean;
  isLoaded: boolean;
  error: unknown;
  data: Output<typeof CollectionReferenceSchema>[];
}

const route = useRoute();

const {
  state: projects, error, isLoading, execute: getProjects,
} = useAsyncState(async () => {
  const result = await GApis.projects.list();
  return (result.data.results || []);
}, []);

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

onMounted(() => {
  if (route.params.projectId) {
    listProjectCollections(route.params.projectId as string);
  }
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
              :label="project.displayName || project.name || project.projectId!"
              icon="sym_o_local_fire_department"
              expand-separator
              dense
              :disable="projectCollections[project.projectId!]?.isLoading"
              :default-opened="$route.params.projectId === project.projectId"
              @show="onProjectExpand(project.projectId!)"
            >
              <q-card>
                <q-card-section>
                  <q-list dense>
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
                        <!-- <q-item-section
                          top
                          side
                        >
                          <q-btn
                            icon="sym_o_refresh"
                            flat
                            round
                            size="sm"
                          />
                        </q-item-section> -->
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
  </q-layout>
</template>