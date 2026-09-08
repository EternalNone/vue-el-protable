<script setup lang="ts">
import { computed } from 'vue'
import type { ProTableToolbarConfig } from '../types'
import type { UseColumnsReturn } from '../hooks/useColumns'
import type { UseToolbarReturn } from '../hooks/useToolbar'
import ColumnSetting from './ColumnSetting.vue'

const props = defineProps<{
  /** 内置功能开关（均默认开启） */
  config?: ProTableToolbarConfig
  /** useToolbar 返回值（全屏） */
  toolbar: UseToolbarReturn
  /** useColumns 返回值（列设置面板数据与操作） */
  columns: UseColumnsReturn
  /** 刷新：保持当前页与当前条件重新请求 */
  refresh: () => void
}>()

/** 布局约定：左侧 #toolbar 插槽承载自定义业务按钮；右侧固定内置功能（刷新 / 列设置 / 全屏） */
const showRefresh = computed(() => props.config?.refresh !== false)
const showColumnSetting = computed(() => props.config?.columnSetting !== false)
const showFullscreen = computed(() => props.config?.fullscreen !== false)
</script>

<template>
  <div class="cpt-toolbar">
    <div class="cpt-toolbar__left">
      <slot name="toolbar" />
    </div>
    <div class="cpt-toolbar__right">
      <button v-if="showRefresh" type="button" class="cpt-toolbar__btn" title="刷新" @click="refresh">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
      <column-setting v-if="showColumnSetting" :columns="columns" />
      <button
        v-if="showFullscreen"
        type="button"
        class="cpt-toolbar__btn"
        :title="toolbar.isFullscreen.value ? '退出全屏' : '全屏'"
        @click="toolbar.toggleFullscreen()"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <template v-if="toolbar.isFullscreen.value">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </template>
          <template v-else>
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </template>
        </svg>
      </button>
    </div>
  </div>
</template>
