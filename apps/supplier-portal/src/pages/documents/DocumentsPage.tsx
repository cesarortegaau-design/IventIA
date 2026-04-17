import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Typography, Spin, Button, App, Popconfirm, Input } from 'antd'
import {
  FileTextOutlined, DownloadOutlined, DeleteOutlined,
  UploadOutlined, CloudUploadOutlined, LockOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { documentsApi } from '../../api/documents'

const { Text, Title } = Typography

const PRIMARY  = '#0369a1'
const DARK     = '#0c4a6e'
const DARK_MID = '#0369a1'

function SectionCard({ icon, title, action, children }: {
  icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      marginBottom: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #E5E7EB', background: '#F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${PRIMARY}, #0284c7)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 16 }}>{icon}</span>
          </div>
          <Text strong style={{ fontSize: 15 }}>{title}</Text>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const qc             = useQueryClient()
  const { message }    = App.useApp()
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName]     = useState('')

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['supplier-docs'],
    queryFn:  documentsApi.list,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      message.success('Documento eliminado')
      qc.invalidateQueries({ queryKey: ['supplier-docs'] })
    },
    onError: () => message.error('Error al eliminar el documento'),
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await documentsApi.upload(file, docName.trim() || undefined)
      message.success('Documento subido correctamente')
      setDocName('')
      qc.invalidateQueries({ queryKey: ['supplier-docs'] })
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Error al subir el documento')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const adminDocs    = (docs as any[]).filter((d: any) => d.uploaderType === 'ADMIN')
  const supplierDocs = (docs as any[]).filter((d: any) => d.uploaderType !== 'ADMIN')

  const DocRow = ({ doc, canDelete }: { doc: any; canDelete?: boolean }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: '#f8fafc', borderRadius: 8,
      border: '1px solid #E5E7EB', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <FileTextOutlined style={{ color: PRIMARY, fontSize: 18, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 14, display: 'block' }} ellipsis>
            {doc.name ?? doc.fileName ?? 'Documento'}
          </Text>
          {doc.createdAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(doc.createdAt).format('DD/MM/YYYY')}
            </Text>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button
          type="text"
          icon={<DownloadOutlined />}
          onClick={() => window.open(doc.blobKey ?? doc.fileUrl ?? doc.url, '_blank')}
          style={{ color: PRIMARY }}
          size="small"
        />
        {canDelete && (
          <Popconfirm
            title="¿Eliminar documento?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => deleteMut.mutate(doc.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              loading={deleteMut.isPending}
            />
          </Popconfirm>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_MID} 100%)`,
        padding: '28px 24px 36px',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180,
          background: 'radial-gradient(circle, rgba(2,132,199,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.12)', borderRadius: 20,
            padding: '3px 12px', marginBottom: 10,
          }}>
            <FileTextOutlined style={{ color: '#bae6fd', fontSize: 12 }} />
            <Text style={{ color: '#bae6fd', fontSize: 12, fontWeight: 500 }}>Archivos</Text>
          </div>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>Documentos</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Documentos compartidos y tus archivos cargados
          </Text>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Admin documents */}
          <SectionCard icon={<LockOutlined />} title="Documentos de IventIA">
            {adminDocs.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
                No hay documentos disponibles de IventIA
              </Text>
            ) : (
              adminDocs.map((doc: any) => <DocRow key={doc.id} doc={doc} canDelete={false} />)
            )}
          </SectionCard>

          {/* Supplier documents */}
          <SectionCard
            icon={<CloudUploadOutlined />}
            title="Mis Documentos"
            action={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  placeholder="Nombre del archivo (opcional)"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  size="small"
                  style={{ width: 200 }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip"
                />
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  size="small"
                  loading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: PRIMARY, borderColor: PRIMARY }}
                >
                  Subir Documento
                </Button>
              </div>
            }
          >
            {supplierDocs.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
                Aún no has subido documentos. Usa el botón "Subir Documento" para agregar archivos.
              </Text>
            ) : (
              supplierDocs.map((doc: any) => <DocRow key={doc.id} doc={doc} canDelete={true} />)
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
