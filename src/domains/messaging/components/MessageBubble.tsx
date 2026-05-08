import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DecryptedMessage } from '../types/message.types'

interface Props {
  message: DecryptedMessage
  isMine: boolean
  onDownloadFile?: (fileId: string) => void
  downloadingFileId?: string | null
}

function ImageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function fileTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon />
  return <DocIcon />
}

export default function MessageBubble({ message, isMine, onDownloadFile, downloadingFileId }: Props) {
  const isExpiring = message.expiresAt !== null

  return (
    <div className={clsx('flex items-end gap-2 px-4', isMine ? 'justify-end' : 'justify-start')}>
      <div className={clsx(
        'relative max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm',
        isMine
          ? 'bg-brand-700 text-white rounded-br-sm'
          : 'bg-[#1e2a3a] text-slate-100 rounded-bl-sm'
      )}>

        {/* Text message */}
        {message.type === 'text' && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* File message */}
        {message.type === 'file' && message.fileRef && (() => {
          const [mimeType = '', fileName = message.content] = message.content.split('|')
          const isDownloading = downloadingFileId === message.fileRef

          return (
            <button
              onClick={() => onDownloadFile?.(message.fileRef!)}
              disabled={isDownloading}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left transition-opacity',
                isMine ? 'bg-white/10 hover:bg-white/15' : 'bg-black/15 hover:bg-black/25',
                isDownloading && 'opacity-60 pointer-events-none'
              )}
            >
              <div className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                isMine ? 'bg-white/15' : 'bg-brand-600/20'
              )}>
                {fileTypeIcon(mimeType)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate max-w-[160px]">
                  {isDownloading ? 'Descargando…' : fileName}
                </p>
                <p className="text-[10px] opacity-50 mt-0.5 uppercase tracking-wide">
                  {mimeType.split('/')[1] || 'archivo'}
                </p>
              </div>
              {!isDownloading && (
                <span className="shrink-0 opacity-60">
                  <DownloadIcon />
                </span>
              )}
            </button>
          )
        })()}

        {/* Timestamp row */}
        <div className={clsx(
          'flex items-center gap-1 mt-1',
          isMine ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-[10px] opacity-50 select-none tabular-nums">
            {message.createdAt
              ? format(new Date(message.createdAt), 'HH:mm', { locale: es })
              : ''}
          </span>
          {isExpiring && (
            <span className="opacity-40" title="Mensaje temporal — se elimina en 24 h">
              <ClockIcon />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
