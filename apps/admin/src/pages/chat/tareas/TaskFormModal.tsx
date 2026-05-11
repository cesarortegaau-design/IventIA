import { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, DatePicker, Slider, Space, Button, message as antMessage } from 'antd'
import dayjs from 'dayjs'

export function TaskFormModal({ open, task, onCancel, onSubmit, isLoading, users = [], events: eventsData = [], clients: clientsData = [], departments: departmentsData = [], orders: ordersData = [], initialEventId, hideEventField = false }: any) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    if (task) {
      // Edit mode: populate form with task data
      form.setFieldsValue({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        progress: task.progress || 0,
        startDate: task.startDate ? dayjs(task.startDate) : null,
        endDate: task.endDate ? dayjs(task.endDate) : null,
        assignedToId: task.assignedToId,
        eventId: task.eventId ?? initialEventId,
        clientId: task.clientId,
        departmentIds: task.departments?.map((d: any) => d.departmentId) || [],
        orderIds: task.orders?.map((o: any) => o.orderId) || [],
      })
    } else {
      // Create mode: reset then apply defaults
      form.resetFields()
      if (initialEventId) form.setFieldValue('eventId', initialEventId)
    }
  }, [open, task, form, initialEventId])

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    }
    onSubmit(payload)
  }

  return (
    <Modal
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      open={open}
      onCancel={onCancel}
      width={600}
      onOk={() => form.submit()}
      okText={task ? 'Guardar' : 'Crear'}
      okButtonProps={{ loading: isLoading, style: { background: '#1a3a5c', borderColor: '#1a3a5c' } }}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: 16 }}
      >
        {/* Title */}
        <Form.Item name="title" label="Título" rules={[{ required: true, message: 'El título es obligatorio' }]}>
          <Input placeholder="Ej: Revisar presupuesto" maxLength={300} />
        </Form.Item>

        {/* Description */}
        <Form.Item name="description" label="Descripción">
          <Input.TextArea placeholder="Detalles de la tarea..." rows={3} />
        </Form.Item>

        {/* Status and Priority */}
        <Space style={{ width: '100%' }}>
          <Form.Item name="status" label="Estado" style={{ flex: 1 }} initialValue="PENDING">
            <Select
              options={[
                { value: 'PENDING', label: 'Pendiente' },
                { value: 'IN_PROGRESS', label: 'En Progreso' },
                { value: 'ON_HOLD', label: 'En Espera' },
                { value: 'DONE', label: 'Completada' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
            />
          </Form.Item>

          <Form.Item name="priority" label="Prioridad" style={{ flex: 1 }} initialValue="MEDIUM">
            <Select
              options={[
                { value: 'LOW', label: 'Baja' },
                { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'CRITICAL', label: 'Crítica' },
              ]}
            />
          </Form.Item>
        </Space>

        {/* Dates */}
        <Space style={{ width: '100%' }}>
          <Form.Item name="startDate" label="Fecha de inicio" style={{ flex: 1 }}>
            <DatePicker placeholder="Seleccionar" showTime />
          </Form.Item>

          <Form.Item name="endDate" label="Fecha de vencimiento" style={{ flex: 1 }}>
            <DatePicker placeholder="Seleccionar" showTime />
          </Form.Item>
        </Space>

        {/* Progress */}
        <Form.Item name="progress" label="Progreso (%)" initialValue={0}>
          <Slider marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
        </Form.Item>

        {/* Assigned User */}
        <Form.Item name="assignedToId" label="Asignar a">
          <Select
            placeholder="Seleccionar usuario"
            allowClear
            showSearch
            optionFilterProp="label"
            options={(Array.isArray(users) ? users : []).map((u: any) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
            }))}
          />
        </Form.Item>

        {/* Event, Client, Departments, Orders */}
        <Space style={{ width: '100%' }}>
          {!hideEventField && (
            <Form.Item name="eventId" label="Evento" style={{ flex: 1 }}>
              <Select
                placeholder="Seleccionar evento"
                allowClear
                showSearch
                optionFilterProp="label"
                options={(Array.isArray(eventsData) ? eventsData : []).map((e: any) => ({
                  value: e.id,
                  label: e.name || e.code,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item name="clientId" label="Cliente" style={{ flex: 1 }}>
            <Select
              placeholder="Seleccionar cliente"
              allowClear
              showSearch
              optionFilterProp="label"
              options={(Array.isArray(clientsData) ? clientsData : []).map((c: any) => ({
                value: c.id,
                label: c.companyName || `${c.firstName} ${c.lastName}`,
              }))}
            />
          </Form.Item>
        </Space>

        {/* Departments */}
        <Form.Item name="departmentIds" label="Departamentos" initialValue={[]}>
          <Select
            mode="multiple"
            placeholder="Seleccionar departamentos"
            options={(Array.isArray(departmentsData) ? departmentsData : []).map((d: any) => ({
              value: d.id,
              label: d.name,
            }))}
          />
        </Form.Item>

        {/* Orders */}
        <Form.Item name="orderIds" label="Órdenes asociadas" initialValue={[]}>
          <Select
            mode="multiple"
            placeholder="Seleccionar órdenes"
            options={(Array.isArray(ordersData) ? ordersData : []).map((o: any) => ({
              value: o.id,
              label: o.orderNumber,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
