<script setup lang="ts">
/**
 * 选择列与实例方法示例：
 * - 单选/多选/关闭三种选择模式切换
 * - v-model:query 与 v-model:selection 双向绑定
 * - 实例方法：reload / refresh / getQuery / setQuery / resetQuery /
 *   getSelection / setSelection / clearSelection / getTableRef
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ProTable } from 'vue-el-protable'
import type { ProTableColumn, ProTableInstance, ProTableOptions, ProTableSelection } from 'vue-el-protable'
import { getUserPageApi, statusText, deptText } from '../api'

/** 选择模式：单选 / 多选 / 关闭 */
const mode = ref<ProTableSelection>('multiple')

const options = computed<ProTableOptions>(() => ({
  api: getUserPageApi,
  selection: mode.value,
  /** 禁用状态的行不可选 */
  selectable: (row: any) => row.status !== 'disabled'
}))

const columns: ProTableColumn[] = [
  { prop: 'name', label: '姓名', search: { key: 'keyword', props: { placeholder: '搜索姓名/账号' } } },
  { prop: 'account', label: '账号', minWidth: 110 },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    formatter: (row: any) => statusText[row.status] ?? row.status
  },
  {
    prop: 'deptId',
    label: '部门',
    minWidth: 100,
    formatter: (row: any) => deptText[row.deptId] ?? row.deptId
  },
  { prop: 'createdAt', label: '创建时间', minWidth: 120 }
]

/** 组件实例引用 */
const tableRef = ref<ProTableInstance>()
/** v-model:query 双向绑定 */
const query = ref<Record<string, any>>({})
/** v-model:selection 双向绑定 */
const selection = ref<any>(null)
/** 最近一次请求返回的行数据（用于编程式设置选中） */
const latestRows = ref<any[]>([])

function onFetchSuccess(payload: { data: any[] }) {
  latestRows.value = payload.data
}

function handleReload() {
  tableRef.value?.reload()
  ElMessage.success('已调用 reload：回到第一页重新查询')
}

function handleRefresh() {
  tableRef.value?.refresh()
  ElMessage.success('已调用 refresh：保持当前页重新请求')
}

function handleGetQuery() {
  ElMessage.success(`getQuery 结果：${JSON.stringify(tableRef.value?.getQuery())}`)
}

function handleSetQuery() {
  tableRef.value?.setQuery({ name: '赵' })
  ElMessage.success('已调用 setQuery：写入 name=赵（不自动查询，点击查询按钮生效）')
}

function handleResetQuery() {
  tableRef.value?.resetQuery()
  ElMessage.success('已调用 resetQuery：恢复默认值并查询')
}

function handleGetSelection() {
  ElMessage.success(`getSelection 结果：${JSON.stringify(tableRef.value?.getSelection())}`)
}

function handleSetSelection() {
  tableRef.value?.setSelection(latestRows.value.slice(0, 2))
  ElMessage.success('已调用 setSelection：勾选当前页前两行')
}

function handleClearSelection() {
  tableRef.value?.clearSelection()
  ElMessage.success('已调用 clearSelection：清空选中')
}

function handleGetTableRef() {
  ElMessage.success(`getTableRef 结果：${tableRef.value?.getTableRef() ? '已获取内部 el-table 实例' : '未获取到'}`)
}

const modeOptions: { label: string; value: ProTableSelection }[] = [
  { label: '多选', value: 'multiple' },
  { label: '单选', value: 'single' },
  { label: '关闭', value: false }
]
</script>

<template>
  <div class="selection-demo">
    <el-alert
      type="info"
      :closable="false"
      class="tip"
      title="切换选择模式会重挂载表格；「禁用」状态的行不可选；下方按钮演示全部实例方法"
    />

    <div class="mode-switch">
      <span class="mode-label">选择模式：</span>
      <el-radio-group v-model="mode">
        <el-radio v-for="item in modeOptions" :key="String(item.value)" :value="item.value">
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <div class="method-bar">
      <el-button size="small" @click="handleReload">reload</el-button>
      <el-button size="small" @click="handleRefresh">refresh</el-button>
      <el-button size="small" @click="handleGetQuery">getQuery</el-button>
      <el-button size="small" @click="handleSetQuery">setQuery</el-button>
      <el-button size="small" @click="handleResetQuery">resetQuery</el-button>
      <el-button size="small" @click="handleGetSelection">getSelection</el-button>
      <el-button size="small" @click="handleSetSelection">setSelection</el-button>
      <el-button size="small" @click="handleClearSelection">clearSelection</el-button>
      <el-button size="small" @click="handleGetTableRef">getTableRef</el-button>
    </div>

    <!-- 切换选择模式时强制重挂载，重置内部状态 -->
    <ProTable
      :key="String(mode)"
      ref="tableRef"
      v-model:query="query"
      v-model:selection="selection"
      :columns="columns"
      :options="options"
      @fetch-success="onFetchSuccess"
    />

    <div class="state-panel">
      <div class="state-item">
        <div class="state-title">v-model:query</div>
        <pre>{{ JSON.stringify(query, null, 2) }}</pre>
      </div>
      <div class="state-item">
        <div class="state-title">v-model:selection</div>
        <pre>{{ JSON.stringify(selection, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selection-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tip {
  align-items: flex-start;
}
.mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mode-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.method-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.state-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.state-item {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background-color: var(--el-fill-color-lighter);
}
.state-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}
.state-item pre {
  margin: 0;
  max-height: 200px;
  overflow: auto;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
