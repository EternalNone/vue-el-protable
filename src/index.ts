import ProTable from './ProTable/index.vue'

// 支持 app.use(ProTable) 全局注册
const install = (app: { component: (name: string, comp: any) => void }): void => {
  app.component('ProTable', ProTable)
}

export { ProTable }
export * from './ProTable/types'
export default Object.assign(ProTable, { install })
