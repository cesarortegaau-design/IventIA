import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { List, Button, Upload, Empty, Space, Typography, Popconfirm, message as antMessage } from 'antd'
import { FileOutlined, DeleteOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons'
import { collabTasksApi } from '../../../api/collabTasks'

const { Text } = Typography

export function TaskDocumentsPanel({ taskId, documents = [] }: any) {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const deleteMut = useMutation({
    mutationFn: (docId: string) => collabTasksApi.deleteDocument(taskId, docId),
    onSuccess: () => {
      antMessage.success('Documento eliminado')
      qc.invalidateQueries({ queryKey: ['collab-task', taskId] })
    },
    onError: () => {
      antMessage.error('Error al eliminar documento')
    },
  })

  const handleUpload = async (file: File) => {
    if (!file) return false

    setUploading(true)
    try {
      await collabTasksApi.uploadDocument(taskId, file)
      antMessage.success('Documento subido')
      qc.invalidateQueries({ queryKey: ['collab-task', taskId] })
    } catch (err) {
      antMessage.error('Error al subir el documento')
    } finally {
      setUploading(false)
    }
    return false
  }

  if (!documents || documents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <Empty description="Sin documentos" />
        <Upload beforeUpload={handleUpload} style={{ marginTop: 16 }}>
          <Button loading={uploading} icon={<FileOutlined />}>
            Subir documento
          </Button>
        </Upload>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Upload beforeUpload={handleUpload}>
          <Button loading={uploading} icon={uploading ? <LoadingOutlined /> : <FileOutlined />}>
            Subir documento
          </Button>
        </Upload>
      </div>

      <List
        dataSource={documents}
        renderItem={(doc: any) => {
          const isImage = doc.blobKey.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          return (
            <List.Item
              key={doc.id}
              actions={[
                <Button type="text" size="small" icon={<DownloadOutlined />} href={doc.blobKey} target="_blank" rel="noreferrer">
                  Descargar
                </Button>,
                <Popconfirm
                  title="Eliminar documento"
                  description="¿Estás seguro?"
                  onConfirm={() => deleteMut.mutate(doc.id)}
                  okText="Sí"
                  cancelText="No"
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleteMut.isPending}>
                    Eliminar
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ width: 40, height: 40, background: '#f0f7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isImage ? '🖼️' : '📄'}
                  </div>
                }
                title={<Text strong>{doc.fileName}</Text>}
                description={
                  <Space size="small" style={{ fontSize: 12 }}>
                    <span>{doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}</span>
                    <span>—</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString('es-MX')}</span>
                  </Space>
                }
              />
            </List.Item>
          )
        }}
      />
    </div>
  )
}
