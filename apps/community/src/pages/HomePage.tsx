export default function HomePage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>IventIA Community Platform</h1>
      <p>Welcome to the IventIA Community Platform. This is a space for exhibitors to connect and collaborate.</p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
          Browse Community
        </button>
        <button style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
          Create Post
        </button>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
        <p style={{ color: '#666' }}>Community features coming soon</p>
      </div>
    </div>
  )
}
