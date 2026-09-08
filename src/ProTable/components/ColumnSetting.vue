<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElCheckbox, ElPopover } from 'element-plus'
import type { UseColumnsReturn } from '../hooks/useColumns'

const props = defineProps<{
  /** useColumns 的完整返回值（列显隐数据与操作） */
  columns: UseColumnsReturn
}>()

const items = computed(() => props.columns.settingItems.value)
/** 全部可见 → 全选；部分隐藏 → 半选 */
const allVisible = computed(() => items.value.length > 0 && items.value.every((item) => !item.hidden))
const indeterminate = computed(() => {
  const hiddenCount = items.value.filter((item) => item.hidden).length
  return hiddenCount > 0 && hiddenCount < items.value.length
})

function onAllChange(checked: any): void {
  props.columns.setAllHidden(!checked)
}
</script>

<template>
  <el-popover placement="bottom-end" :width="200" trigger="click" popper-class="cpt-column-setting-popper">
    <template #reference>
      <button type="button" class="cpt-toolbar__btn" title="列设置">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>
    </template>
    <div class="cpt-column-setting">
      <div class="cpt-column-setting__head">
        <el-checkbox :model-value="allVisible" :indeterminate="indeterminate" @change="onAllChange">
          列展示
        </el-checkbox>
        <el-button link type="primary" size="small" @click="columns.resetColumns()">重置</el-button>
      </div>
      <div class="cpt-column-setting__list">
        <el-checkbox
          v-for="item in items"
          :key="item.uid"
          :model-value="!item.hidden"
          @change="(checked: any) => columns.toggleColumn(item.uid, !checked)"
        >
          {{ item.label }}
        </el-checkbox>
      </div>
    </div>
  </el-popover>
</template>
