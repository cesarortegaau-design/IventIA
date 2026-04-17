# Add Admin Page

Creates a standard admin page with the IventIA Admin design conventions: Ant Design Table with search, create/edit Modal with Form, and delete confirmation.

**Usage:** `/add-admin-page <PageName> [brief description and fields]`

Examples:
- `/add-admin-page Venues name, city, capacity, isActive`
- `/add-admin-page ExhibitorTypes name, description, color`

---

## Design Conventions

Reference page: `apps/admin/src/pages/catalogs/resources/ResourcesPage.tsx`

Key patterns used in all admin pages:
- **Data fetching**: `useQuery` from TanStack Query
- **Mutations**: `useMutation` with `onSuccess: () => queryClient.invalidateQueries(...)` and `message.success(...)`
- **Single modal** for create + edit: `editingItem` state is `null` (create) or the item object (edit)
- **Form**: `form.setFieldsValue(editingItem)` on open, `form.resetFields()` on close
- **Delete**: `Popconfirm` inline in Table actions column, not a separate modal
- **Search**: local `useState` filter on the fetched list, `<Input.Search>` in the Table header area
- **Privilege checks**: wrap destructive actions with `hp(PRIVILEGES.X)` from `useAuthStore`

---

## Step-by-step

### 1. Read existing reference

Read `apps/admin/src/pages/catalogs/resources/ResourcesPage.tsx` to stay aligned with the latest patterns.

### 2. Admin API Client — `apps/admin/src/api/<pageNames>.ts`

```ts
import { apiClient } from './client'
export const <pageNames>Api = {
  list: () => apiClient.get('/<route>').then(r => r.data.data),
  create: (data: any) => apiClient.post('/<route>', data).then(r => r.data.data),
  update: (id: string, data: any) => apiClient.patch(`/<route>/${id}`, data).then(r => r.data.data),
  remove: (id: string) => apiClient.delete(`/<route>/${id}`).then(r => r.data),
}
```

### 3. Page Component — `apps/admin/src/pages/<section>/<PageName>sPage.tsx`

Structure:
```tsx
import { useState } from 'react'
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { PRIVILEGES } from '@iventia/shared'
import { <pageNames>Api } from '../../../api/<pageNames>'

export default function <PageName>sPage() {
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { hasPrivilege: hp } = useAuthStore()

  const { data = [], isLoading } = useQuery({
    queryKey: ['<pageNames>'],
    queryFn: <pageNames>Api.list,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editingItem ? <pageNames>Api.update(editingItem.id, values) : <pageNames>Api.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<pageNames>'] })
      message.success(editingItem ? 'Actualizado' : 'Creado')
      setModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: <pageNames>Api.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<pageNames>'] })
      message.success('Eliminado')
    },
  })

  const openCreate = () => { setEditingItem(null); form.resetFields(); setModalOpen(true) }
  const openEdit   = (item: any) => { setEditingItem(item); form.setFieldsValue(item); setModalOpen(true) }

  const filtered = data.filter((d: any) =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    // add other columns matching the entity fields
    {
      title: 'Acciones', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {hp(PRIVILEGES.<PAGENAME>_EDIT) && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          )}
          {hp(PRIVILEGES.<PAGENAME>_DELETE) && (
            <Popconfirm title="¿Eliminar?" onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="<PageName>s"
      extra={
        <Space>
          <Input.Search placeholder="Buscar..." onSearch={setSearch} allowClear style={{ width: 220 }} />
          {hp(PRIVILEGES.<PAGENAME>_CREATE) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nuevo</Button>
          )}
        </Space>
      }
    >
      <Table dataSource={filtered} columns={columns} rowKey="id" loading={isLoading} />

      <Modal
        title={editingItem ? 'Editar' : 'Nuevo'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.validateFields().then(saveMutation.mutate)}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {/* add other fields */}
        </Form>
      </Modal>
    </Card>
  )
}
```

### 4. Router — `apps/admin/src/router/index.tsx`

```tsx
import <PageName>sPage from '../pages/<section>/<PageName>sPage'
// ...
<Route path="<section>/<route>" element={<PageName>sPage />} />
```

### 5. Menu — `apps/admin/src/layouts/MainLayout.tsx`

Add inside the appropriate group (`catalogos` children, top-level, etc.):
```ts
{ key: '/<section>/<route>', icon: <AppstoreOutlined />, label: '<PageName>s', show: hp(PRIVILEGES.<PAGENAME>_VIEW) },
```

---

## Checklist

- [ ] Admin API client created
- [ ] Page component created (Table + Modal + search pattern)
- [ ] Route added to router
- [ ] Menu item added to MainLayout
- [ ] Privileges referenced match entries in `packages/shared/src/privileges.ts`
- [ ] Offer to run `/deploy` when done
