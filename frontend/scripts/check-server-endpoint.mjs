import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(root, 'src', 'utils', 'serverEndpoint.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
})
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-endpoint-'))
const tempFile = path.join(tempDir, 'serverEndpoint.mjs')
fs.writeFileSync(tempFile, compiled.outputText, 'utf8')

const {
  buildServerUrl,
  formatServerAddress,
  parseOptionalPort,
  parseRequiredPort,
} = await import(pathToFileURL(tempFile).href)

assert.equal(parseOptionalPort(''), undefined)
assert.equal(parseOptionalPort('   '), undefined)
assert.equal(parseOptionalPort('8088'), 8088)
assert.throws(() => parseOptionalPort('abc'), /端口号/)
assert.throws(() => parseOptionalPort('70000'), /端口号/)

assert.equal(parseRequiredPort('', 8081), 8081)
assert.equal(parseRequiredPort('9090', 8081), 9090)
assert.throws(() => parseRequiredPort('0', 8081), /端口号/)

assert.equal(buildServerUrl('192.168.1.8'), 'http://192.168.1.8')
assert.equal(buildServerUrl('192.168.1.8', 9000), 'http://192.168.1.8:9000')
assert.equal(formatServerAddress('192.168.1.8'), '192.168.1.8')
assert.equal(formatServerAddress('192.168.1.8', 9000), '192.168.1.8:9000')

fs.rmSync(tempDir, { recursive: true, force: true })
