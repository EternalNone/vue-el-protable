<script setup lang="ts">
import { ref } from 'vue'
import BasicDemo from './demos/BasicDemo.vue'
import LinkageDemo from './demos/LinkageDemo.vue'
import SelectionDemo from './demos/SelectionDemo.vue'
import SlotsDemo from './demos/SlotsDemo.vue'

const active = ref('basic')
</script>

<template>
  <div class="playground">
    <header class="playground-header">
      <h1>vue-el-protable playground</h1>
      <p>基于 Element Plus 的配置驱动表格组件 —— 一份 columns 配置生成筛选表单 + 表格 + 分页 + 数据请求</p>
    </header>
    <el-tabs v-model="active">
      <el-tab-pane label="基础用法" name="basic" lazy>
        <BasicDemo />
      </el-tab-pane>
      <el-tab-pane label="联动与远程搜索" name="linkage" lazy>
        <LinkageDemo />
      </el-tab-pane>
      <el-tab-pane label="选择与实例方法" name="selection" lazy>
        <SelectionDemo />
      </el-tab-pane>
      <el-tab-pane label="插槽与工具栏" name="slots" lazy>
        <SlotsDemo />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.playground {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px 48px;
}

.playground-header h1 {
  margin-bottom: 4px;
}

.playground-header p {
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
}
</style>
