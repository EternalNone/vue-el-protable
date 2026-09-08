/** playground 本地 mock 接口：模拟延迟、筛选过滤、分页与三种响应结构 */

/** 模拟网络延迟 */
function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// ---------- 静态选项 ----------

/** 状态选项 */
export const statusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' }
]

/** 部门选项 */
export const deptOptions = [
  { label: '研发部', value: 'rd' },
  { label: '产品部', value: 'pm' },
  { label: '测试部', value: 'qa' },
  { label: '运营部', value: 'op' }
]

/** 渠道选项 */
export const channelOptions = [
  { label: '线上', value: 'online' },
  { label: '线下', value: 'offline' }
]

/** 状态文案映射 */
export const statusText: Record<string, string> = {
  enabled: '启用',
  disabled: '禁用'
}

/** 部门文案映射 */
export const deptText: Record<string, string> = {
  rd: '研发部',
  pm: '产品部',
  qa: '测试部',
  op: '运营部'
}

// ---------- 省市区三级数据 ----------

interface RegionOption {
  label: string
  value: string
}

const provinceData: RegionOption[] = [
  { label: '浙江省', value: 'zhejiang' },
  { label: '江苏省', value: 'jiangsu' },
  { label: '广东省', value: 'guangdong' }
]

const cityData: Record<string, RegionOption[]> = {
  zhejiang: [
    { label: '杭州市', value: 'hangzhou' },
    { label: '宁波市', value: 'ningbo' },
    { label: '温州市', value: 'wenzhou' }
  ],
  jiangsu: [
    { label: '南京市', value: 'nanjing' },
    { label: '苏州市', value: 'suzhou' }
  ],
  guangdong: [
    { label: '广州市', value: 'guangzhou' },
    { label: '深圳市', value: 'shenzhen' }
  ]
}

const districtData: Record<string, RegionOption[]> = {
  hangzhou: [
    { label: '西湖区', value: 'xihu' },
    { label: '滨江区', value: 'binjiang' },
    { label: '余杭区', value: 'yuhang' }
  ],
  ningbo: [
    { label: '海曙区', value: 'haishu' },
    { label: '鄞州区', value: 'yinzhou' }
  ],
  wenzhou: [{ label: '鹿城区', value: 'lucheng' }],
  nanjing: [
    { label: '玄武区', value: 'xuanwu' },
    { label: '鼓楼区', value: 'gulou' }
  ],
  suzhou: [{ label: '姑苏区', value: 'gusu' }],
  guangzhou: [
    { label: '天河区', value: 'tianhe' },
    { label: '越秀区', value: 'yuexiu' }
  ],
  shenzhen: [
    { label: '南山区', value: 'nanshan' },
    { label: '福田区', value: 'futian' }
  ]
}

// ---------- mock 用户数据 ----------

/** mock 用户行数据：字段含姓名、账号、状态、部门、金额、创建时间等 */
export interface MockUser {
  id: number
  name: string
  account: string
  status: string
  deptId: string
  channel: string
  amount: number
  createdAt: string
  creator: string
  provinceId: string
  cityId: string
  districtId: string
}

const SURNAMES = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫']
const GIVEN_NAMES = ['伟', '芳', '娜', '敏', '静', '磊', '军', '洋', '勇', '杰', '涛', '明']

/** 按下标轮询分配省市区 */
function regionOf(index: number): Pick<MockUser, 'provinceId' | 'cityId' | 'districtId'> {
  const province = provinceData[index % provinceData.length]
  const cities = cityData[province.value]
  const city = cities[index % cities.length]
  const districts = districtData[city.value]
  const district = districts[index % districts.length]
  return { provinceId: province.value, cityId: city.value, districtId: district.value }
}

/** 生成 36 条 mock 用户数据 */
export const userList: MockUser[] = Array.from({ length: 36 }, (_, i) => {
  const id = i + 1
  return {
    id,
    name: `${SURNAMES[i % 12]}${GIVEN_NAMES[(i * 7 + 3) % 12]}`,
    account: `user${pad(id)}`,
    status: i % 4 === 0 ? 'disabled' : 'enabled',
    deptId: deptOptions[i % deptOptions.length].value,
    channel: i % 3 === 0 ? 'offline' : 'online',
    amount: ((id * 137) % 9000) + 1000,
    createdAt: `2026-${pad(((id - 1) % 12) + 1)}-${pad(((id * 7) % 28) + 1)}`,
    creator: `${SURNAMES[(i * 5 + 1) % 12]}${GIVEN_NAMES[(i * 3 + 2) % 12]}`,
    ...regionOf(i)
  }
})

// ---------- 用户列表 ----------

/** 列表查询参数（mock 支持的过滤字段；排序参数名与 useFetch 约定一致：sortProp / sortOrder） */
interface UserQueryParams {
  keyword?: string
  name?: string
  account?: string
  status?: string
  deptId?: string
  channel?: string
  creator?: string
  provinceId?: string
  cityId?: string
  districtId?: string
  startTime?: string
  endTime?: string
  sortProp?: keyof MockUser
  sortOrder?: string
  page?: number
  pageSize?: number
  [key: string]: any
}

/** 按查询条件过滤 + 服务端排序 */
function filterUsers(params: UserQueryParams): MockUser[] {
  let rows = userList.filter((u) => {
    if (params.keyword && !u.name.includes(params.keyword) && !u.account.includes(params.keyword)) return false
    if (params.name && !u.name.includes(params.name)) return false
    if (params.account && !u.account.includes(params.account)) return false
    if (params.status && u.status !== params.status) return false
    if (params.deptId && u.deptId !== params.deptId) return false
    if (params.channel && u.channel !== params.channel) return false
    if (params.creator && u.creator !== params.creator) return false
    if (params.provinceId && u.provinceId !== params.provinceId) return false
    if (params.cityId && u.cityId !== params.cityId) return false
    if (params.districtId && u.districtId !== params.districtId) return false
    if (params.startTime && u.createdAt < params.startTime) return false
    if (params.endTime && u.createdAt > params.endTime) return false
    return true
  })
  const { sortProp, sortOrder } = params
  if (sortProp && sortOrder) {
    const dir = sortOrder === 'ascending' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      if (a[sortProp] === b[sortProp]) return 0
      return (a[sortProp] > b[sortProp] ? 1 : -1) * dir
    })
  }
  return rows
}

/** 按页截取 */
function paginate(rows: MockUser[], params: UserQueryParams): MockUser[] {
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 10
  return rows.slice((page - 1) * pageSize, page * pageSize)
}

/** 用户列表（默认响应结构 { records, total }），模拟 300ms 延迟 */
export async function getUserPageApi(params: UserQueryParams): Promise<{ records: MockUser[]; total: number }> {
  await delay()
  const rows = filterUsers(params)
  return { records: paginate(rows, params), total: rows.length }
}

/** 用户列表（纯数组响应：不分页返回全部过滤结果，组件以数组长度作为 total） */
export async function getUserPageArrayApi(params: UserQueryParams): Promise<MockUser[]> {
  await delay()
  return filterUsers(params)
}

/** 用户列表（多层包装响应 { data: { list, count } }，验证包装剥离与字段探测） */
export async function getUserPageWrappedApi(params: UserQueryParams): Promise<Record<string, any>> {
  await delay()
  const rows = filterUsers(params)
  return { data: { list: paginate(rows, params), count: rows.length } }
}

// ---------- 省市区接口 ----------

/** 省份列表 */
export async function getProvinceList(): Promise<RegionOption[]> {
  await delay()
  return provinceData
}

/** 城市列表：组件自动把依赖值合并为参数 { provinceId } */
export async function getCityList(params: Record<string, any>): Promise<RegionOption[]> {
  await delay()
  return cityData[String(params.provinceId ?? '')] ?? []
}

/** 区县列表：组件自动把依赖值合并为参数 { cityId } */
export async function getDistrictList(params: Record<string, any>): Promise<RegionOption[]> {
  await delay()
  return districtData[String(params.cityId ?? '')] ?? []
}

// ---------- 远程搜索 ----------

/** 远程搜索：按关键字搜索创建人选项（关键字参数名固定为 keyword，防抖由组件完成） */
export async function searchCreatorOptions(params: Record<string, any>): Promise<RegionOption[]> {
  await delay()
  const keyword = String(params.keyword ?? '')
  const creators = Array.from(new Set(userList.map((u) => u.creator)))
  return creators
    .filter((name) => !keyword || name.includes(keyword))
    .map((name) => ({ label: name, value: name }))
}
