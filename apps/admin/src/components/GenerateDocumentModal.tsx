import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Select, App, Typography, Tag, Space } from 'antd'
import { templatesApi } from '../api/templates'

const { Text } = Typography

const QUERY_KEY_MAP: Record<string, string> = {
  EVENT: 'event',
  ORDER: 'order',
  CONTRACT: 'contract',
}

interface Props {
  open: boolean
  onClose: () => void
  context: 'EVENT' | 'ORDER' | 'CONTRACT'
  entityId: string
}

export default function GenerateDocumentModal({ open, onClose, context, entityId }: Props) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const { data: templates } = useQuery({
    queryKey: ['templates', context],
    queryFn: () => templatesApi.list({ context }),
    enabled: open,
  })

  async function handleGenerate() {
    if (!selectedId) {
      message.warning('Selecciona una plantilla')
      return
    }
    setGenerating(true)
    try {
      const response = await templatesApi.generate(selectedId, entityId)
      // Extract filename from Content-Disposition header
      const disposition = response.headers['content-disposition'] || ''
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/)
      const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : 'documento_generado.docx'

      // Download the blob
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Refresh the entity detail so documents section shows the new file
      const queryKey = QUERY_KEY_MAP[context]
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey: [queryKey, entityId] })
      }

      message.success('Documento generado y guardado')
      onClose()
    } catch (err: any) {
      message.error('Error al generar documento')
    } finally {
      setGenerating(false)
    }
  }

  const selected = templates?.find((t: any) => t.id === selectedId)

  return (
    <Modal
      title="Generar Documento desde Plantilla"
      open={open}
      onCancel={onClose}
      onOk={handleGenerate}
      okText="Generar y Descargar"
      confirmLoading={generating}
      okButtonProps={{ disabled: !selectedId }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text>Selecciona la plantilla a utilizar:</Text>
      </div>
      <Select
        style={{ width: '100%' }}
        placeholder="Seleccionar plantilla..."
        value={selectedId}
        onChange={setSelectedId}
        options={(templates || []).map((t: any) => ({
          value: t.id,
          label: t.name,
        }))}
      />
      {selected && (selected.placeholders as string[])?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Marcadores que se reemplazarán:</Text>
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              {(selected.placeholders as string[]).map((p: string) => (
                <Tag key={p} color="geekblue">*[{p}]</Tag>
              ))}
            </Space>
          </div>
        </div>
      )}
      {templates?.length === 0 && (
        <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          No hay plantillas para este contexto. Sube una desde la página de Plantillas.
        </Text>
      )}
    </Modal>
  )
}
