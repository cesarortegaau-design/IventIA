import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Row, Col, Card, Button, Tag, message } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { membershipsApi } from '../api/memberships'

export default function MembershipsPage() {
  const queryClient = useQueryClient()
  const { data: tiers } = useQuery({ queryKey: ['membership-tiers'], queryFn: membershipsApi.getTiers })
  const { data: activeMembership } = useQuery({ queryKey: ['active-membership'], queryFn: membershipsApi.getActive })

  const { mutate: subscribe } = useMutation({
    mutationFn: (data: any) => membershipsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-membership'] })
      message.success('¡Membresía activada!')
    },
  })

  return (
    <div>
      <h2>Membresías Premium</h2>
      {activeMembership && (
        <Tag color="green" style={{ marginBottom: 24, padding: 8 }}>
          ✓ Miembro activo: {activeMembership.tier.name}
        </Tag>
      )}

      <Row gutter={[24, 24]}>
        {tiers?.map((tier: any) => (
          <Col xs={24} sm={12} md={8} key={tier.id}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3>{tier.name}</h3>
              <p style={{ color: '#a8a39d', marginBottom: 16 }}>{tier.description}</p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>${Number(tier.monthlyPrice).toFixed(2)}/mes</div>
              </div>
              {tier.benefits?.map((b: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <CheckOutlined style={{ color: '#16a34a' }} />
                  <span>{b}</span>
                </div>
              ))}
              <Button
                type="primary"
                block
                style={{ marginTop: 'auto' }}
                onClick={() => subscribe({ tierId: tier.id, billingCycle: 'MONTHLY' })}
                disabled={activeMembership?.tierId === tier.id}
              >
                {activeMembership?.tierId === tier.id ? 'Suscrito' : 'Suscribirse'}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
