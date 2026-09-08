<script setup lang="ts">
import { computed, onMounted, ref, useAttrs, useSlots, watch } from 'vue'
import { ElConfigProvider, ElLoading, ElPagination, ElRadio, ElTable, ElTableColumn } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import type { ColumnConfig, ProTableFetchSuccessPayload, ProTableOptions } from './types'
import { useColumns } from './hooks/useColumns'
import { useFetch, type UseFetchReturn } from './hooks/useFetch'
import { useSearchForm } from './hooks/useSearchForm'
import { useSelection } from './hooks/useSelection'
import { useToolbar } from './hooks/useToolbar'
import SearchForm from './components/SearchForm.vue'
import Toolbar from './components/Toolbar.vue'
import ColumnNode from './components/ColumnNode.vue'
// 样式随组件引入，库构建时汇总输出 dist/style.css（src/index.ts 不导入样式）
import '../styles/index.css'

defineOptions({ name: 'ProTable', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 列配置（必填） */
    columns: ColumnConfig[]
    /** 全局配置（必填） */
    options: ProTableOptions
    /** 外部查询条件（v-model:query 双向同步） */
    query?: Record<string, any>
    /** 外部选中行（v-model:selection 双向同步） */
    selection?: Record<string, any>[]
  }>(),
  {
    query: () => ({}),
    selection: () => []
  }
)

const emit = defineEmits<{
  'fetch-success': [payload: ProTableFetchSuccessPayload]
  'fetch-error': [error: unknown]
  search: [query: Record<string, any>]
  reset: [query: Record<string, any>]
  'query-change': [query: Record<string, any>]
  'selection-change': [rows: Record<string, any>[]]
  'single-change': [row: Record<string, any> | null]
  'page-change': [payload: { page: number; pageSize: number }]
  'update:query': [query: Record<string, any>]
  'update:selection': [rows: Record<string, any>[]]
}>()

/** hooks 内部统一的事件出口（宽松签名） */
const emitAny = emit as unknown as (event: string, ...args: any[]) => void

/** loading 局部指令：库构建不依赖 Element Plus 全局注册 */
const vLoading = ElLoading.directive

const attrs = useAttrs()
/** 显式标注插槽字典：生成声明文件时避免 useSlots 返回值的循环类型推断 */
const slots: Record<string, ((...args: any[]) => any) | undefined> = useSlots()
const tableRef = ref<any>()
const rootEl = ref<HTMLElement>()

/** ProTableOptions 的已知键；白名单外的键视为 el-table 原生属性透传 */
const KNOWN_OPTION_KEYS = new Set([
  'rowKey',
  'api',
  'fieldNames',
  'paginationProps',
  'beforeFetch',
  'afterFetch',
  'autoFetch',
  'selection',
  'selectable',
  'showIndex',
  'showExpand',
  'showPagination',
  'searchVisible',
  'searchCollapsed',
  'collapsedSize',
  'labelWidth',
  'labelPosition',
  'searchOnEnter',
  'showSearchButtons',
  'toolbarConfig',
  'persistKey',
  'defaultPageSize'
])

/** 根节点只承接 class / style；其余 attrs 与 options 白名单外键透传给 el-table */
const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
const tableAttrs = computed(() => {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style') continue
    result[key] = value
  }
  for (const [key, value] of Object.entries(props.options)) {
    if (!KNOWN_OPTION_KEYS.has(key)) result[key] = value
  }
  return result
})

const rowKey = computed(() => props.options.rowKey ?? 'id')

// ---------- hooks 接线 ----------
const columnsApi = useColumns(() => props.columns, props.options.persistKey)
const toolbar = useToolbar(rootEl)
const selectionApi = useSelection({ options: props.options, tableRef, emit: emitAny })

/** useFetch ↔ useSearchForm 循环依赖：先声明后赋值，回调内闭包互指 */
let fetcher: UseFetchReturn

const formCtx = useSearchForm({
  columnTree: columnsApi.columnTree,
  options: props.options,
  emit: emitAny,
  onSearch: () => void fetcher.reload(),
  onReset: () => {
    fetcher.clearSort()
    tableRef.value?.clearSort?.()
    void fetcher.reload()
  }
})

fetcher = useFetch({
  options: props.options,
  buildQueryParams: () => formCtx.buildQueryParams(),
  emit: emitAny
})

// ---------- 查询条件初始化与 v-model:query ----------
formCtx.initQuery()
if (Object.keys(props.query ?? {}).length) formCtx.setQuery(props.query ?? {})

/** 最近一次已同步的查询条件指纹（JSON 比较，防止双向同步死循环） */
let lastQueryJson = JSON.stringify(formCtx.query)

watch(
  () => props.query,
  (next) => {
    if (JSON.stringify(next ?? {}) === JSON.stringify(formCtx.query)) return
    formCtx.setQuery(next ?? {})
    lastQueryJson = JSON.stringify(formCtx.query)
  },
  { deep: true }
)
watch(
  formCtx.query,
  () => {
    const json = JSON.stringify(formCtx.query)
    if (json === lastQueryJson) return
    lastQueryJson = json
    emit('update:query', { ...formCtx.query })
  },
  { deep: true }
)

// ---------- v-model:selection ----------
let lastSelectionJson = JSON.stringify(selectionApi.getSelection())

watch(
  () => props.selection,
  (rows) => {
    const json = JSON.stringify(rows ?? [])
    if (json === lastSelectionJson) return
    selectionApi.setSelection(rows ?? [])
    lastSelectionJson = JSON.stringify(selectionApi.getSelection())
  },
  { deep: true, immediate: true }
)
watch(
  [selectionApi.multipleSelection, selectionApi.singleRow],
  () => {
    const rows = selectionApi.getSelection()
    const json = JSON.stringify(rows)
    if (json === lastSelectionJson) return
    lastSelectionJson = json
    emit('update:selection', rows)
  },
  { deep: true }
)

/** 单选列当前选中值（按 rowKey 比较，跨页保持高亮） */
const singleKey = computed(() => selectionApi.singleRow.value?.[rowKey.value])

// ---------- 插槽分发 ----------
/** 保留插槽名：不属于列单元格 / 表头插槽 */
const RESERVED_SLOT_NAMES = new Set(['default', 'toolbar', 'expand', 'empty', 'search-actions'])

/** 列单元格 / 表头插槽：经 ColumnNode 逐级转发 */
const columnSlots = computed<Record<string, unknown>>(() => {
  const result: Record<string, unknown> = {}
  for (const [name, fn] of Object.entries(slots)) {
    if (RESERVED_SLOT_NAMES.has(name) || name.startsWith('search-')) continue
    result[name] = fn
  }
  return result
})

/** 筛选区插槽：search-{key} 与 search-actions */
const searchSlots = computed<Record<string, unknown>>(() => {
  const result: Record<string, unknown> = {}
  for (const [name, fn] of Object.entries(slots)) {
    if (name.startsWith('search-')) result[name] = fn
  }
  return result
})

// ---------- 排序 / 首次拉取 ----------
/**
 * el-table 的 sort-change 载荷仅含 { column, prop, order }，
 * useFetch 依赖 sortable === 'custom' 识别服务端排序列，这里从 column 上补取
 */
function onSortChange(payload: { column?: any; prop?: string | null; order?: string | null }): void {
  fetcher.handleSortChange({
    prop: payload.prop ?? undefined,
    order: payload.order,
    sortable: payload.column?.sortable
  })
}

onMounted(() => {
  if (props.options.autoFetch !== false) void fetcher.fetchData()
})

// ---------- 实例方法 ----------
defineExpose({
  reload: () => void fetcher.reload(),
  refresh: () => void fetcher.refresh(),
  getQuery: () => formCtx.getQuery(),
  setQuery: (patch: Record<string, any>) => formCtx.setQuery(patch),
  resetQuery: () => formCtx.handleReset(),
  getSelection: () => selectionApi.getSelection(),
  setSelection: (rows: Record<string, any>[]) => selectionApi.setSelection(rows),
  clearSelection: () => selectionApi.clearSelection(),
  getTableRef: () => tableRef.value
})
</script>

<template>
  <!-- 组件层注入中文语言包：分页 / 空状态等 Element Plus 内置文案统一为中文（首期仅中文，见需求文档） -->
  <el-config-provider :locale="zhCn">
    <div ref="rootEl" class="cpt-protable" :class="{ 'is-fullscreen': toolbar.isFullscreen.value }" v-bind="rootAttrs">
      <!-- 筛选区：有可见筛选项时才渲染 -->
      <search-form
        v-if="options.searchVisible !== false && formCtx.searchItems.value.length > 0"
        :form="formCtx"
        :options="options"
        :reload="() => void fetcher.refresh()"
      >
        <template v-for="(_, name) in searchSlots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
      </search-form>

      <!-- 工具栏 -->
      <toolbar
        :config="options.toolbarConfig"
        :toolbar="toolbar"
        :columns="columnsApi"
        :refresh="() => void fetcher.refresh()"
      >
        <template v-if="slots.toolbar" #toolbar>
          <slot name="toolbar" />
        </template>
      </toolbar>

      <!-- 表格区 -->
      <el-table
        ref="tableRef"
        v-loading="fetcher.loading.value"
        class="cpt-protable__table"
        v-bind="tableAttrs"
        :data="fetcher.tableData.value"
        :row-key="rowKey"
        @selection-change="selectionApi.handleSelectionChange"
        @sort-change="onSortChange"
      >
        <!-- 选择列：多选走原生 selection；单选自绘 el-radio 列 -->
        <el-table-column
          v-if="options.selection === 'multiple'"
          type="selection"
          width="48"
          :selectable="options.selectable"
        />
        <el-table-column v-else-if="options.selection === 'single'" label="选择" width="60" align="center">
          <template #default="scope">
            <el-radio
              :model-value="singleKey"
              :value="scope.row[rowKey]"
              :disabled="options.selectable ? !options.selectable(scope.row, scope.$index) : false"
              @change="selectionApi.handleSingleChange(scope.row)"
            />
          </template>
        </el-table-column>

        <!-- 序号列 -->
        <el-table-column v-if="options.showIndex" type="index" label="序号" width="64" align="center" />

        <!-- 业务列：递归渲染列树，单元格 / 表头插槽逐级透传 -->
        <column-node v-for="col in columnsApi.visibleColumnTree.value" :key="col.uid" :col="col">
          <template v-for="(_, name) in columnSlots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
          </template>
        </column-node>

        <!-- 展开行 -->
        <el-table-column v-if="options.showExpand && slots.expand" type="expand">
          <template #default="scope">
            <slot name="expand" v-bind="scope" />
          </template>
        </el-table-column>

        <!-- 空状态 -->
        <template v-if="slots.empty" #empty>
          <slot name="empty" />
        </template>
      </el-table>

      <!-- 分页区：单向绑定（handlePageChange 内有相同页码提前返回，禁用 v-model） -->
      <div v-if="options.showPagination !== false" class="cpt-protable__pagination">
        <el-pagination
          :current-page="fetcher.page.value"
          :page-size="fetcher.pageSize.value"
          :total="fetcher.total.value"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetcher.handlePageChange"
          @size-change="fetcher.handleSizeChange"
        />
      </div>
    </div>
  </el-config-provider>
</template>
