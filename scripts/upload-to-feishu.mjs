#!/usr/bin/env node
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';

const BASE = 'https://open.feishu.cn/open-apis';
const filePath = process.env.FEISHU_FILE || 'out/mobile-os-extinction.mp4';
const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;
const folderToken = process.env.FEISHU_FOLDER_TOKEN;

function fail(message, details = '') {
  throw new Error(`${message}${details ? `: ${details}` : ''}`);
}
async function jsonResponse(response, label) {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { fail(`${label} returned non-JSON`, text.slice(0, 500)); }
  if (!response.ok || data.code !== 0) fail(label, `${response.status} ${data.msg || text}`);
  return data.data;
}
async function api(pathname, options, label) {
  return jsonResponse(await fetch(`${BASE}${pathname}`, options), label);
}

async function main() {
  if (!appId || !appSecret || !folderToken) fail('FEISHU_APP_ID, FEISHU_APP_SECRET, and FEISHU_FOLDER_TOKEN are required');
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) fail(`Rendered file not found: ${filePath}`);
  const fileName = path.basename(filePath);
  console.log(`Preparing upload of ${fileName} (${(stat.size / 1024 / 1024).toFixed(1)} MiB)`);

  const tokenData = await api('/auth/v3/tenant_access_token/internal', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  }, 'Token request');
  const token = tokenData.tenant_access_token;
  const headers = { Authorization: `Bearer ${token}` };
  const prepared = await api('/drive/v1/files/upload_prepare', {
    method: 'POST', headers: {...headers, 'Content-Type': 'application/json'},
    body: JSON.stringify({ file_name: fileName, parent_type: 'explorer', parent_node: folderToken, size: stat.size })
  }, 'Upload prepare');
  const uploadId = prepared.upload_id;
  const blockSize = Number(prepared.block_size || 4 * 1024 * 1024);
  const uploadUrl = prepared.upload_url || `${BASE}/drive/v1/files/upload_part`;
  const stream = createReadStream(filePath, { highWaterMark: blockSize });
  let seq = 0;
  for await (const chunk of stream) {
    const form = new FormData();
    form.append('upload_id', uploadId);
    form.append('seq', String(seq));
    form.append('size', String(chunk.length));
    form.append('file', new Blob([chunk]), fileName);
    await jsonResponse(await fetch(uploadUrl, { method: 'POST', headers, body: form }), `Upload part ${seq + 1}`);
    seq++;
    console.log(`Uploaded part ${seq} (${Math.min(stat.size, seq * blockSize)}/${stat.size} bytes)`);
  }
  const finished = await api('/drive/v1/files/upload_finish', {
    method: 'POST', headers: {...headers, 'Content-Type': 'application/json'},
    body: JSON.stringify({ upload_id: uploadId, block_num: seq })
  }, 'Upload finish');
  const fileToken = finished.file_token || finished.token;
  console.log(`Upload complete. File token: ${fileToken || '(not returned)'}`);
  if (fileToken) console.log(`File URL: https://feishu.cn/file/${fileToken}`);
}

main().catch(error => { console.error(`Feishu upload failed: ${error.message}`); process.exitCode = 1; });
