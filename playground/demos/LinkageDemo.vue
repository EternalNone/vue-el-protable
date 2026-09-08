<script setup lang="ts">
/**
 * 选项联动与远程搜索示例：
 * - 省/市/区三级联动（deps：依赖变化自动清空并重拉选项，依赖为空时禁用）
 * - 创建人远程搜索（关键字参数固定为 keyword，300ms 防抖）
 * - 渠道静态选项
 */
import { ProTable } from 'vue-el-protable'
import type { ProTableColumn, ProTableOptions } from 'vue-el-protable'
import {
  getUserPageApi,
  getProvinceList,
  getCityList,
  getDistrictList,
  searchCreatorOptions,
  channelOptions,
  statusText,
  deptText
} from '../api'

const options: ProTableOptions = {
  api: getUserPageApi
}

const columns: ProTableColumn[] = [
  { prop: 'name', label: '姓名', search: { key: 'keyword', props: { placeholder: '搜索姓名/账号' } } },
  { prop: 'account', label: '账号', minWidth: 110, search: true },
  {
    prop: 'channel',
    label: '渠道',
    width: 90,
    search: { type: 'select', options: channelOptions, searchOnChange: true }
  },
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
  // 以下为纯筛选列（不在表格展示），演示省市区三级联动
  {
    prop: 'provinceId',
    label: '省份',
    hidden: true,
    search: {
      type: 'select',
      api: getProvinceList,
      searchOnChange: true,
      props: { placeholder: '请选择省份' }
    }
  },
  {
    prop: 'cityId',
    label: '城市',
    hidden: true,
    search: {
      type: 'select',
      deps: ['provinceId'],
      api: getCityList,
      searchOnChange: true,
      props: { placeholder: '请选择城市' }
    }
  },
  {
    prop: 'districtId',
    label: '区县',
    hidden: true,
    search: {
      type: 'select',
      deps: ['cityId'],
      api: getDistrictList,
      props: { placeholder: '请选择区县' }
    }
  },
  // 远程搜索示例：输入关键字调 api 拉取候选项
  {
    prop: 'creator',
    label: '创建人',
    minWidth: 100,
    search: {
      type: 'select',
      remote: true,
      api: searchCreatorOptions,
      props: { filterable: true, remote: true, placeholder: '输入姓名搜索' }
    }
  }
]
</script>

<template>
  <div class="linkage-demo">
    <el-alert
      type="info"
      :closable="false"
      class="tip"
      title="省/市/区三级联动：切换省份会自动清空并禁用下级；创建人支持远程搜索（输入后 300ms 防抖请求）"
    />
    <ProTable :columns="columns" :options="options" />
  </div>
</template>

<style scoped>
.linkage-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tip {
  align-items: flex-start;
}
</style>
