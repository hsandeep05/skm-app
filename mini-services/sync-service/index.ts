import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface SyncEvent {
  type: 'invoice-created' | 'invoice-updated' | 'invoice-deleted' | 'invoice-finalized'
  invoiceId: string
  data?: any
  timestamp: string
  operator: string
}

const connectedClients = new Map<string, { id: string; operator: string; connectedAt: Date }>()

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  socket.on('register', (data: { operator: string }) => {
    connectedClients.set(socket.id, {
      id: socket.id,
      operator: data.operator,
      connectedAt: new Date()
    })
    io.emit('clients-update', { count: connectedClients.size })
    console.log(`Operator registered: ${data.operator} (${socket.id})`)
  })

  socket.on('invoice-change', (event: SyncEvent) => {
    console.log(`Sync event: ${event.type} - ${event.invoiceId}`)
    socket.broadcast.emit('invoice-change', event)
  })

  socket.on('force-refresh', () => {
    console.log('Force refresh requested')
    io.emit('force-refresh', { timestamp: new Date().toISOString() })
  })

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id)
    io.emit('clients-update', { count: connectedClients.size })
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Sync WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
