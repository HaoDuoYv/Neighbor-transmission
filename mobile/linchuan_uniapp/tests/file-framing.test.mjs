import test from 'node:test'
import assert from 'node:assert/strict'

import {
  appendJsonLine,
  createChunkAck,
  createChunkHeader,
  createFileAccept,
  createFileComplete,
  createFileRequest,
  extractJsonLines
} from '../src/protocol/linchuanProtocol.js'

test('encodes file transfer headers as JSON line frames', () => {
  assert.equal(
    appendJsonLine(createFileRequest({
      fileId: 'file-1',
      fileName: '报告.pdf',
      fileSize: 1024
    })),
    '{"type":"file-request","fileId":"file-1","fileName":"报告.pdf","fileSize":1024}\n'
  )

  assert.deepEqual(createFileAccept('file-1'), { type: 'file-accept', fileId: 'file-1' })
  assert.deepEqual(createChunkHeader('file-1', 2, 65536), {
    type: 'chunk',
    fileId: 'file-1',
    chunkIndex: 2,
    size: 65536
  })
  assert.deepEqual(createChunkAck('file-1', 2), {
    type: 'chunk-ack',
    fileId: 'file-1',
    chunkIndex: 2
  })
  assert.deepEqual(createFileComplete('file-1'), {
    type: 'file-complete',
    fileId: 'file-1'
  })
})

test('extracts complete JSON lines and preserves incomplete tail', () => {
  const input = [
    appendJsonLine({ type: 'discovery-ping', deviceId: 'a' }),
    appendJsonLine({ type: 'discovery-pong', deviceId: 'b' }),
    '{"type":"chunk"'
  ].join('')

  const result = extractJsonLines(input)

  assert.deepEqual(result.messages, [
    { type: 'discovery-ping', deviceId: 'a' },
    { type: 'discovery-pong', deviceId: 'b' }
  ])
  assert.equal(result.rest, '{"type":"chunk"')
})

test('reports malformed JSON lines without discarding later valid frames', () => {
  const result = extractJsonLines('{"type":\n{"type":"file-complete","fileId":"f"}\n')

  assert.equal(result.messages.length, 1)
  assert.deepEqual(result.messages[0], { type: 'file-complete', fileId: 'f' })
  assert.equal(result.errors.length, 1)
  assert.equal(result.rest, '')
})
