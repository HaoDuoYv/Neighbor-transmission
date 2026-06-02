import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'linchuan.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.init()
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ip TEXT,
        port INTEGER,
        ws_port INTEGER,
        avatar TEXT,
        is_online INTEGER DEFAULT 0,
        last_seen INTEGER,
        is_favorite INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        from_device TEXT NOT NULL,
        to_device TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        metadata TEXT,
        status TEXT DEFAULT 'sent',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_path TEXT,
        from_device TEXT NOT NULL,
        to_device TEXT NOT NULL,
        direction TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress REAL DEFAULT 0,
        speed INTEGER,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_device);
      CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_device);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
      CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at);
    `)
  }

  // 设备操作
  upsertDevice(device: { id: string; name: string; ip: string; port: number; wsPort: number; avatar?: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO devices (id, name, ip, port, ws_port, avatar, is_online, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        ip = excluded.ip,
        port = excluded.port,
        ws_port = excluded.ws_port,
        avatar = excluded.avatar,
        is_online = 1,
        last_seen = excluded.last_seen
    `)
    stmt.run(device.id, device.name, device.ip, device.port, device.wsPort, device.avatar || null, Date.now())
  }

  setDeviceOffline(deviceId: string) {
    const stmt = this.db.prepare('UPDATE devices SET is_online = 0 WHERE id = ?')
    stmt.run(deviceId)
  }

  getDevices() {
    return this.db.prepare('SELECT * FROM devices ORDER BY is_online DESC, is_favorite DESC, last_seen DESC').all()
  }

  getOnlineDevices() {
    return this.db.prepare('SELECT * FROM devices WHERE is_online = 1').all()
  }

  toggleFavorite(deviceId: string, isFavorite: boolean) {
    const stmt = this.db.prepare('UPDATE devices SET is_favorite = ? WHERE id = ?')
    stmt.run(isFavorite ? 1 : 0, deviceId)
  }

  // 消息操作
  insertMessage(msg: { id: string; fromDevice: string; toDevice: string; type: string; content: string; metadata?: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, from_device, to_device, type, content, metadata, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)
    `)
    stmt.run(msg.id, msg.fromDevice, msg.toDevice, msg.type, msg.content, msg.metadata || null, Date.now())
  }

  updateMessageStatus(msgId: string, status: string) {
    const stmt = this.db.prepare('UPDATE messages SET status = ? WHERE id = ?')
    stmt.run(status, msgId)
  }

  getMessages(device1: string, device2: string, limit = 50) {
    return this.db.prepare(`
      SELECT * FROM messages
      WHERE (from_device = ? AND to_device = ?) OR (from_device = ? AND to_device = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(device1, device2, device2, device1, limit)
  }

  searchMessages(keyword: string) {
    return this.db.prepare(`
      SELECT * FROM messages
      WHERE content LIKE ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(`%${keyword}%`)
  }

  // 传输记录操作
  insertTransfer(transfer: { id: string; fileName: string; fileSize: number; filePath?: string; fromDevice: string; toDevice: string; direction: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO transfers (id, file_name, file_size, file_path, from_device, to_device, direction, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `)
    stmt.run(transfer.id, transfer.fileName, transfer.fileSize, transfer.filePath || null, transfer.fromDevice, transfer.toDevice, transfer.direction, Date.now())
  }

  updateTransferStatus(id: string, status: string, progress?: number, speed?: number) {
    if (progress !== undefined && speed !== undefined) {
      const stmt = this.db.prepare('UPDATE transfers SET status = ?, progress = ?, speed = ? WHERE id = ?')
      stmt.run(status, progress, speed, id)
    } else {
      const stmt = this.db.prepare('UPDATE transfers SET status = ? WHERE id = ?')
      stmt.run(status, id)
    }
  }

  completeTransfer(id: string, filePath: string) {
    const stmt = this.db.prepare('UPDATE transfers SET status = ?, progress = 1, file_path = ?, completed_at = ? WHERE id = ?')
    stmt.run('completed', filePath, Date.now(), id)
  }

  getTransfers(limit = 100) {
    return this.db.prepare('SELECT * FROM transfers ORDER BY created_at DESC LIMIT ?').all(limit)
  }

  getTransfersByStatus(status: string) {
    return this.db.prepare('SELECT * FROM transfers WHERE status = ? ORDER BY created_at DESC').all(status)
  }

  // 文件库查询
  getFilesByType(type?: string, keyword?: string) {
    let sql = 'SELECT * FROM transfers WHERE status = ?'
    const params: unknown[] = ['completed']

    if (keyword) {
      sql += ' AND file_name LIKE ?'
      params.push(`%${keyword}%`)
    }

    if (type) {
      const extensions: Record<string, string[]> = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
        document: ['.doc', '.docx', '.pdf', '.txt', '.md', '.xls', '.xlsx', '.ppt', '.pptx'],
        video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'],
        audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg']
      }
      const exts = extensions[type] || []
      if (exts.length > 0) {
        const conditions = exts.map(() => 'LOWER(file_name) LIKE ?').join(' OR ')
        sql += ` AND (${conditions})`
        params.push(...exts.map(e => `%${e}`))
      }
    }

    sql += ' ORDER BY completed_at DESC LIMIT 200'
    return this.db.prepare(sql).all(...params)
  }

  close() {
    this.db.close()
  }
}
