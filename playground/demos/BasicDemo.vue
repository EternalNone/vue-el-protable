<script setup lang="ts">
/**
 * 最小配置示例：仅 columns + options.api
 * 展示：响应自动识别、分页、服务端排序（可切换三种响应形态）
 */
import { computed, ref } from 'vue'
import { ProTable } from 'vue-el-protable'
import type { ProTableColumn, ProTableOptions } from 'vue-el-protable'
import {
  getUserPageApi,
  getUserPageArrayApi,
  getUserPageWrappedApi,
  statusOptions,
  deptOptions,
  statusText,
  deptText
} from '../api'

/** 响应形态：{records, total} / 纯数组 / {data: {list, count}} */
type ResponseShape = 'records' | 'array' | 'wrapped'

const shape = ref<ResponseShape>('records')

const apiMap = {
  records: getUserPageApi,
  array: getUserPageArrayApi,
  wrapped: getUserPageWrappedApi
}

/** 三种形态对应不同的 api；纯数组形态由组件内部关闭分页 */
const options = computed<ProTableOptions>(() => ({
  api: apiMap[shape.value],
  showPagination: shape.value !== 'array'
}))

/** 状态列与部门列的静态选项（组件内联，不经请求） */
const columns: ProTableColumn[] = [
  { prop: 'name', label: '姓名', search: { key: 'keyword', props: { placeholder: '搜索姓名/账号' } } },
  { prop: 'account', label: '账号', minWidth: 110, search: true },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    search: { type: 'select', options: statusOptions, searchOnChange: true },
    formatter: (row: any) => statusText[row.status as keyof typeof statusText] ?? row.status
  },
  {
    prop: 'deptId',
    label: '部门',
    minWidth: 100,
    search: { type: 'select', options: deptOptions, searchOnChange: true },
    formatter: (row: any) => deptText[row.deptId as keyof typeof deptText] ?? row.deptId
  },
  { prop: 'amount', label: '金额(元)', width: 110, align: 'right', sortable: 'custom' },
  { prop: 'createdAt', label: '创建时间', minWidth: 120, sortable: 'custom' }
]

const shapeOptions: { label: string; value: ResponseShape; desc: string }[] = [
  { label: '{records, total}', value: 'records', desc: '默认结构，自动识别' },
  { label: '纯数组', value: 'array', desc: '无分页参数透传' },
  { label: '{data: {list, count}}', value: 'wrapped', desc: 'data 包装自动剥离' }
]
</script>

<template>
  <div class="basic-demo">
    <el-alert
      type="info"
      :closable="false"
      title="最小配置：仅传 columns + options.api，响应结构自动识别；切换下方响应形态观察差异"
      class="tip"
    />

    <div class="shape-switch">
      <span class="shape-label">响应形态：</span>
      <el-radio-group v-model="shape">
        <el-radio v-for="item in shapeOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- 切换响应形态时强制重挂载，重置筛选与分页状态 -->
    <ProTable :key="shape" :columns="columns" :options="options" />
  </div>
</template>

<style scoped>
.basic-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tip {
  align-items: flex-start;
}
.shape-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}
.shape-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
