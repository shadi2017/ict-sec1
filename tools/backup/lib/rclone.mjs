// ============================================================
//  رفع النسخ على Google Drive باستخدام rclone.
//
//  ليه rclone؟ لأن حساب الخدمة (Service Account) مالوش مساحة تخزين
//  وGoogle بترفض رفع الملفات على My Drive بيه. rclone بيستخدم OAuth
//  بحسابك الشخصي، والـ token بيتجدد لوحده.
//
//  الإعداد (مرة واحدة):
//     rclone config create gdrive drive scope=drive
//  وبعدها في .env:
//     RCLONE_REMOTE=gdrive
//     RCLONE_FOLDER=ICT Backups
// ============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const RCLONE = process.env.RCLONE_BIN || 'rclone';

function basePath(remote, folder) {
  const clean = String(folder || '').replace(/^\/+|\/+$/g, '');
  return clean ? `${remote}:${clean}` : `${remote}:`;
}

function filePath(remote, folder, filename) {
  const base = basePath(remote, folder);
  return base.endsWith(':') ? `${base}${filename}` : `${base}/${filename}`;
}

export async function rcloneAvailable() {
  try {
    await exec(RCLONE, ['version'], { timeout: 15_000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function rcloneUpload({ remote, folder, localFile, filename }) {
  if (!remote) throw new Error('RCLONE_REMOTE مش مضبوط.');
  const destination = filePath(remote, folder, filename);
  await exec(RCLONE, ['copyto', localFile, destination, '--log-level', 'ERROR'], {
    timeout: 10 * 60_000,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });
  return { ok: true, via: 'rclone', path: destination };
}

export async function rcloneList({ remote, folder }) {
  const base = basePath(remote, folder);
  const { stdout } = await exec(RCLONE, ['lsf', base, '--files-only', '--log-level', 'ERROR'], {
    timeout: 2 * 60_000,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });
  return String(stdout || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

export async function rclonePrune({ remote, folder, keepDays, prefix }) {
  const base = basePath(remote, folder);
  const { stdout } = await exec(
    RCLONE,
    ['delete', base, '--min-age', `${keepDays}d`, '--include', `${prefix}*`, '--log-level', 'ERROR', '--dry-run=false'],
    { timeout: 5 * 60_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
  );
  return { deleted: String(stdout || '').split(/\r?\n/).filter(Boolean) };
}
