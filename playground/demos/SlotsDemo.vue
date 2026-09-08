<script setup lang="ts">
/**
 * 插槽示例：
 * - #toolbar 工具栏插槽（自定义按钮统一在左侧，右侧为固定内置功能）
 * - 单元格插槽（slot: true → 插槽名为 prop）
 * - 表头插槽（headerSlot: true → 插槽名为 ${prop}-header）
 * - 展开行插槽（options.showExpand）
 * - 自定义筛选项插槽（search.type: 'custom' → search-{key}）
 * - #search-actions 筛选按钮区插槽
 */
import { ElButton, ElMessage, ElTag, ElInput } from 'element-plus'
import { ProTable } from 'vue-el-protable'
import type { ProTableColumn, ProTableOptions } from 'vue-el-protable'
import { getUserPageApi, statusText, deptText } from '../api'

const options: ProTableOptions = {
  api: getUserPageApi,
  showIndex: true,
  showExpand: true,
  /** 关闭全屏，保留刷新与列设置，突出工具栏插槽 */
  toolbarConfig: { fullscreen: false }
}

const columns: ProTableColumn[] = [
  // headerSlot: true → 表头插槽名 name-header
  { prop: 'name', label: '姓名', headerSlot: true, search: { props: { placeholder: '请输入姓名' } } },
  // slot: true → 单元格插槽名 status
  { prop: 'status', label: '状态', width: 90, slot: true },
  { prop: 'account', label: '账号', minWidth: 110, search: true },
  {
    prop: 'deptId',
    label: '部门',
    minWidth: 100,
    formatter: (row: any) => deptText[row.deptId] ?? row.deptId
  },
  { prop: 'amount', label: '金额(元)', width: 110, align: 'right' },
  // 自定义筛选项：type 为 custom 时，插槽名为 search-{key}，这里为 search-keyword
  {
    prop: 'remark',
    label: '备注',
    hidden: true,
    search: { type: 'custom', key: 'keyword', label: '自定义筛选' }
  },
  // 操作列：固定右侧，单元格插槽名 action
  { prop: 'action', label: '操作', width: 150, fixed: 'right', slot: true }
]

function handleCreate() {
  ElMessage.success('工具栏插槽：点击了「新增」')
}

function handleBatchDelete() {
  ElMessage.success('工具栏插槽：点击了「批量删除」')
}

function handleExport() {
  ElMessage.success('工具栏插槽：点击了「导出」')
}

function handleEdit(row: any) {
  ElMessage.success(`编辑：${row.name}`)
}

function handleDelete(row: any) {
  ElMessage.success(`删除：${row.name}`)
}

function handleAdvancedSearch() {
  ElMessage.success('筛选按钮区插槽：点击了「高级搜索」')
}

const statusTypeMap: Record<string, 'success' | 'danger'> = {
  enabled: 'success',
  disabled: 'danger'
}
</script>

<template>
  <div class="slots-demo">
    <el-alert
      type="info"
      :closable="false"
      class="tip"
      title="演示全部插槽：工具栏 / 单元格 / 表头 / 展开行 / 自定义筛选项 / 筛选按钮区"
    />

    <ProTable :columns="columns" :options="options">
      <!-- 工具栏：自定义业务按钮统一放在左侧（右侧为刷新 / 列设置 / 全屏等固定内置功能） -->
      <template #toolbar>
        <ElButton type="primary" size="small" @click="handleCreate">新增</ElButton>
        <ElButton size="small" @click="handleBatchDelete">批量删除</ElButton>
        <ElButton size="small" plain @click="handleExport">导出</ElButton>
      </template>

      <!-- 表头插槽：name-header（headerSlot: true） -->
      <template #name-header>
        <span class="custom-header">姓名（自定义表头）</span>
      </template>

      <!-- 单元格插槽：status（slot: true） -->
      <template #status="{ row }">
        <ElTag :type="statusTypeMap[row.status]" size="small">
          {{ statusText[row.status] ?? row.status }}
        </ElTag>
      </template>

      <!-- 操作列插槽：action（slot: true） -->
      <template #action="{ row }">
        <ElButton type="primary" link size="small" @click="handleEdit(row)">编辑</ElButton>
        <ElButton type="danger" link size="small" @click="handleDelete(row)">删除</ElButton>
      </template>

      <!-- 展开行插槽 -->
      <template #expand="{ row }">
        <div class="expand-content">
          <div>账号：{{ row.account }}</div>
          <div>创建人：{{ row.creator }}</div>
          <div>创建时间：{{ row.createdAt }}</div>
          <div>金额：{{ row.amount }} 元</div>
        </div>
      </template>

      <!-- 自定义筛选项插槽：search-{key}（search.type: 'custom'，key 为 keyword） -->
      <template #search-keyword="{ value, setValue }">
        <ElInput :model-value="value" placeholder="自定义筛选项（参数名 keyword）" clearable @update:model-value="setValue" />
      </template>

      <!-- 筛选按钮区插槽：追加自定义按钮 -->
      <template #search-actions>
        <ElButton size="small" link type="primary" @click="handleAdvancedSearch">高级搜索</ElButton>
      </template>
    </ProTable>
  </div>
</template>

<style scoped>
.slots-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tip {
  align-items: flex-start;
}
.custom-header {
  color: var(--el-color-primary);
  font-weight: 600;
}
.expand-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
</style>
