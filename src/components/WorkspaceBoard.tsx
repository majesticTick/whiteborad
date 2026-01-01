'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

import { hasFirebaseConfig } from '@/lib/firebase'
import {
  subscribeWorkspace,
  updateWorkspaceBoard,
  updateWorkspaceCursors,
  type BoardArrow,
  type BoardCursor,
  type BoardFrame,
  type BoardNote,
  type BoardPath,
  type BoardPoint,
  type BoardShape,
  type BoardText,
} from '@/lib/firestore'
import { useAuthUser } from '@/lib/useAuthUser'

type Tool =
  | 'select'
  | 'pan'
  | 'pen'
  | 'eraser'
  | 'note'
  | 'text'
  | 'rect'
  | 'arrow'
  | 'frame'

type WorkspaceBoardProps = {
  workspaceId: string
  title: string
  backHref: string
}

type DragMode = 'move' | 'resize' | 'arrow-start' | 'arrow-end' | 'pan'

type DragState = {
  type: 'note' | 'text' | 'shape' | 'arrow' | 'frame'
  id: string
  mode: DragMode
  start: BoardPoint
  origin: BoardPoint
  size?: { width: number; height: number }
}

const strokeColors = ['#111111', '#444444', '#6b6b6b', '#9a9a9a', '#d1d1d1']
const noteColors = ['#fff6a3', '#ffe4c7', '#cfe8ff', '#d8f1e5']

const createId = () => Math.random().toString(36).slice(2, 9)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getCursorColor = (seed: string) => {
  const palette = ['#3f7cff', '#ff9f1c', '#22c55e', '#ec4899', '#8b5cf6']
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
  }
  return palette[Math.abs(hash) % palette.length]
}

export default function WorkspaceBoard({
  workspaceId,
  title,
  backHref,
}: WorkspaceBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const activePathRef = useRef<BoardPath | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressSyncRef = useRef(false)
  const cursorsRef = useRef<BoardCursor[]>([])

  const [tool, setTool] = useState<Tool>('select')
  const [stroke, setStroke] = useState(strokeColors[0])
  const [notes, setNotes] = useState<BoardNote[]>([])
  const [texts, setTexts] = useState<BoardText[]>([])
  const [shapes, setShapes] = useState<BoardShape[]>([])
  const [arrows, setArrows] = useState<BoardArrow[]>([])
  const [frames, setFrames] = useState<BoardFrame[]>([])
  const [paths, setPaths] = useState<BoardPath[]>([])
  const [cursors, setCursors] = useState<BoardCursor[]>([])
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [selected, setSelected] = useState<{ type: DragState['type']; id: string } | null>(
    null
  )

  const { user } = useAuthUser()
  const isDemo = workspaceId === 'demo'
  const canSync = hasFirebaseConfig && !!user && !isDemo
  const cursorId = user?.uid ?? 'guest'
  const cursorName = user?.displayName ?? user?.email ?? 'Guest'
  const cursorColor = useMemo(
    () => getCursorColor(cursorId),
    [cursorId]
  )

  useEffect(() => {
    const resizeCanvas = () => {
      const board = boardRef.current
      const canvas = canvasRef.current
      if (!board || !canvas) return
      const rect = board.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const context = canvas.getContext('2d')
      if (context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.lineCap = 'round'
        context.lineJoin = 'round'
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  useEffect(() => {
    if (!canSync) return
    if (!workspaceId) return
    const unsubscribe = subscribeWorkspace(workspaceId, (data) => {
      if (!data?.board) return
      suppressSyncRef.current = true
      setNotes(data.board.notes ?? [])
      setPaths(data.board.paths ?? [])
      setShapes(data.board.shapes ?? [])
      setTexts(data.board.texts ?? [])
      setArrows(data.board.arrows ?? [])
      setFrames(data.board.frames ?? [])
      setCursors(data.board.cursors ?? [])
      cursorsRef.current = data.board.cursors ?? []
      setTimeout(() => {
        suppressSyncRef.current = false
      }, 0)
    })
    return () => unsubscribe()
  }, [canSync, workspaceId])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.translate(offset.x, offset.y)
    context.scale(scale, scale)
    paths.filter(Boolean).forEach((path) => drawPath(context, path))
    context.restore()
  }, [paths, offset, scale])

  useEffect(() => {
    if (!canSync || !workspaceId) return
    if (suppressSyncRef.current) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      const updatedBy = user?.uid ?? 'guest'
      updateWorkspaceBoard(
        workspaceId,
        {
          notes,
          paths,
          shapes,
          texts,
          arrows,
          frames,
          cursors: cursorsRef.current,
        },
        updatedBy
      ).catch((error) => {
        console.error(error)
      })
    }, 600)
  }, [arrows, frames, notes, paths, shapes, texts, canSync, workspaceId, user])

  const updateContext = (context: CanvasRenderingContext2D) => {
    context.lineWidth = tool === 'eraser' ? 18 : 3
    context.strokeStyle = stroke
    context.globalCompositeOperation =
      tool === 'eraser' ? 'destination-out' : 'source-over'
  }

  const getWorldPoint = (event: PointerEvent<HTMLElement>): BoardPoint => {
    const board = boardRef.current
    if (!board) return { x: 0, y: 0 }
    const rect = board.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left - offset.x) / scale,
      y: (event.clientY - rect.top - offset.y) / scale,
    }
  }

  const drawPath = (
    context: CanvasRenderingContext2D,
    path: BoardPath | null
  ) => {
    if (!path || path.points.length < 2) return
    context.save()
    context.lineWidth = path.width
    context.strokeStyle = path.color
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.globalCompositeOperation =
      path.mode === 'erase' ? 'destination-out' : 'source-over'
    context.beginPath()
    context.moveTo(path.points[0].x, path.points[0].y)
    path.points.slice(1).forEach((point) => {
      context.lineTo(point.x, point.y)
    })
    context.stroke()
    context.restore()
  }

  const addNoteAt = (point: BoardPoint) => {
    setNotes((prev) => [
      ...prev,
      {
        id: createId(),
        x: point.x,
        y: point.y,
        text: 'New note',
        color: noteColors[prev.length % noteColors.length],
      },
    ])
    setTool('select')
  }

  const addTextAt = (point: BoardPoint) => {
    const id = createId()
    setTexts((prev) => [
      ...prev,
      { id, x: point.x, y: point.y, width: 220, height: 80, text: 'Text' },
    ])
    setSelected({ type: 'text', id })
    setTool('select')
  }

  const startShapeAt = (point: BoardPoint) => {
    const id = createId()
    setShapes((prev) => [
      ...prev,
      {
        id,
        x: point.x,
        y: point.y,
        width: 10,
        height: 10,
        color: '#ffffff',
        type: 'rect',
      },
    ])
    dragRef.current = {
      type: 'shape',
      id,
      mode: 'resize',
      start: point,
      origin: point,
      size: { width: 10, height: 10 },
    }
    setSelected({ type: 'shape', id })
  }

  const startArrowAt = (point: BoardPoint) => {
    const id = createId()
    setArrows((prev) => [
      ...prev,
      { id, start: point, end: point, color: stroke },
    ])
    dragRef.current = {
      type: 'arrow',
      id,
      mode: 'arrow-end',
      start: point,
      origin: point,
    }
    setSelected({ type: 'arrow', id })
  }

  const startFrameAt = (point: BoardPoint) => {
    const id = createId()
    setFrames((prev) => [
      ...prev,
      { id, x: point.x, y: point.y, width: 200, height: 140, title: 'Frame' },
    ])
    dragRef.current = {
      type: 'frame',
      id,
      mode: 'resize',
      start: point,
      origin: point,
      size: { width: 200, height: 140 },
    }
    setSelected({ type: 'frame', id })
  }

  const handleBoardPointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return
    const point = getWorldPoint(event)

    if (tool === 'pan') {
      dragRef.current = {
        type: 'frame',
        id: 'pan',
        mode: 'pan',
        start: { x: event.clientX, y: event.clientY },
        origin: { x: offset.x, y: offset.y },
      }
      return
    }

    if (tool === 'note') {
      addNoteAt(point)
      return
    }

    if (tool === 'text') {
      addTextAt(point)
      return
    }

    if (tool === 'rect') {
      startShapeAt(point)
      return
    }

    if (tool === 'arrow') {
      startArrowAt(point)
      return
    }

    if (tool === 'frame') {
      startFrameAt(point)
      return
    }

    if (tool === 'pen' || tool === 'eraser') {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return

      drawingRef.current = true
      updateContext(context)
      activePathRef.current = {
        id: createId(),
        color: stroke,
        width: tool === 'eraser' ? 18 : 3,
        mode: tool === 'eraser' ? 'erase' : 'draw',
        points: [point],
      }
      context.beginPath()
      context.moveTo(point.x * scale + offset.x, point.y * scale + offset.y)
      return
    }

    setSelected(null)
  }

  const handleBoardPointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    const point = getWorldPoint(event)

    if (drawingRef.current && activePathRef.current) {
      activePathRef.current.points.push(point)
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return
      updateContext(context)
      context.lineTo(point.x * scale + offset.x, point.y * scale + offset.y)
      context.stroke()
    }

    if (dragRef.current) {
      const drag = dragRef.current
      if (drag.mode === 'pan') {
        setOffset({
          x: drag.origin.x + (event.clientX - drag.start.x),
          y: drag.origin.y + (event.clientY - drag.start.y),
        })
        return
      }

      const deltaX = point.x - drag.start.x
      const deltaY = point.y - drag.start.y

      if (drag.type === 'note') {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === drag.id
              ? { ...note, x: drag.origin.x + deltaX, y: drag.origin.y + deltaY }
              : note
          )
        )
        return
      }

      if (drag.type === 'text') {
        setTexts((prev) =>
          prev.map((text) =>
            text.id === drag.id
              ? drag.mode === 'resize' && drag.size
                ? {
                    ...text,
                    width: Math.max(120, drag.size.width + deltaX),
                    height: Math.max(60, drag.size.height + deltaY),
                  }
                : {
                    ...text,
                    x: drag.origin.x + deltaX,
                    y: drag.origin.y + deltaY,
                  }
              : text
          )
        )
        return
      }

      if (drag.type === 'shape') {
        setShapes((prev) =>
          prev.map((shape) =>
            shape.id === drag.id
              ? drag.mode === 'resize' && drag.size
                ? {
                    ...shape,
                    width: Math.max(40, drag.size.width + deltaX),
                    height: Math.max(40, drag.size.height + deltaY),
                  }
                : {
                    ...shape,
                    x: drag.origin.x + deltaX,
                    y: drag.origin.y + deltaY,
                  }
              : shape
          )
        )
        return
      }

      if (drag.type === 'frame') {
        setFrames((prev) =>
          prev.map((frame) =>
            frame.id === drag.id
              ? drag.mode === 'resize' && drag.size
                ? {
                    ...frame,
                    width: Math.max(120, drag.size.width + deltaX),
                    height: Math.max(80, drag.size.height + deltaY),
                  }
                : {
                    ...frame,
                    x: drag.origin.x + deltaX,
                    y: drag.origin.y + deltaY,
                  }
              : frame
          )
        )
        return
      }

      if (drag.type === 'arrow') {
        setArrows((prev) =>
          prev.map((arrow) =>
            arrow.id === drag.id
              ? drag.mode === 'arrow-start'
                ? { ...arrow, start: point }
                : { ...arrow, end: point }
              : arrow
          )
        )
      }
    }

    if (canSync) {
      const nextCursor: BoardCursor = {
        id: cursorId,
        name: cursorName,
        color: cursorColor,
        x: point.x,
        y: point.y,
      }
      setCursors((prev) => {
        const other = prev.filter((item) => item.id !== cursorId)
        const next = [...other, nextCursor]
        cursorsRef.current = next
        return next
      })
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
      cursorTimerRef.current = setTimeout(() => {
        updateWorkspaceCursors(workspaceId, cursorsRef.current, cursorId).catch(
          (error) => {
            console.error(error)
          }
        )
      }, 200)
    }
  }

  const handleBoardPointerUp = () => {
    drawingRef.current = false
    if (activePathRef.current && activePathRef.current.points.length > 1) {
      setPaths((prev) => [...prev, activePathRef.current as BoardPath])
    }
    activePathRef.current = null
    dragRef.current = null
  }

  const zoomBy = (delta: number) => {
    setScale((prev) => clamp(prev + delta, 0.4, 2))
  }

  return (
    <div className="relative h-[78vh] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="absolute left-6 top-6 z-20 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm shadow-[var(--shadow)]">
        <Link
          href={backHref}
          className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--muted)]"
        >
          Back
        </Link>
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-[var(--muted)]">Auto sync</span>
        <div className="ml-2 flex items-center gap-1">
          {['#8fb5ff', '#ffd3a4', '#d1d5db'].map((color) => (
            <span
              key={color}
              className="h-6 w-6 rounded-full border border-white"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="ml-1 rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
            12
          </span>
        </div>
        <button
          type="button"
          className="ml-2 rounded-lg bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--bg)]"
        >
          Share
        </button>
      </div>

      <div className="absolute left-6 top-24 z-20 flex w-12 flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-2 py-3 shadow-[var(--shadow)]">
        {(
          [
            ['select', 'Sel'],
            ['pan', 'Pan'],
            ['pen', 'Pen'],
            ['note', 'Note'],
            ['text', 'Txt'],
            ['rect', 'Rect'],
            ['arrow', 'Arr'],
            ['frame', 'Fr'],
            ['eraser', 'Er'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTool(value)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-[10px] ${
              tool === value
                ? 'bg-[var(--ink)] text-[var(--bg)]'
                : 'text-[var(--muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--muted)] shadow-[var(--shadow)]">
        {strokeColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setStroke(color)}
            className={`h-5 w-5 rounded-full border ${
              stroke === color
                ? 'border-[var(--ink)]'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--muted)] shadow-[var(--shadow)]">
        <button
          type="button"
          onClick={() => setOffset({ x: 0, y: 0 })}
          className="rounded-lg border border-[var(--border)] px-2 py-1"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setTool('pan')}
          className="rounded-lg border border-[var(--border)] px-2 py-1"
        >
          Hand
        </button>
      </div>

      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--muted)] shadow-[var(--shadow)]">
        <button
          type="button"
          onClick={() => zoomBy(-0.1)}
          className="rounded-lg border border-[var(--border)] px-2 py-1"
        >
          -
        </button>
        <span className="w-12 text-center">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          onClick={() => zoomBy(0.1)}
          className="rounded-lg border border-[var(--border)] px-2 py-1"
        >
          +
        </button>
      </div>

      {!hasFirebaseConfig && (
        <div className="absolute bottom-6 left-28 z-20 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs text-[var(--muted)] shadow-[var(--shadow)]">
          Firebase sync disabled. Add `.env.local` to enable realtime sync.
        </div>
      )}
      {hasFirebaseConfig && !user && !isDemo && (
        <div className="absolute bottom-6 left-28 z-20 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs text-[var(--muted)] shadow-[var(--shadow)]">
          Login required to sync this workspace.
        </div>
      )}

      <div
        ref={boardRef}
        className="relative h-full w-full"
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerLeave={handleBoardPointerUp}
      >
        <div className="absolute inset-0 grid-surface" />
        <canvas ref={canvasRef} className="absolute inset-0" />

        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {frames.map((frame) => (
            <div
              key={frame.id}
              className={`absolute rounded-xl border-2 border-dashed border-[var(--border)] bg-transparent px-4 py-3 text-sm ${
                selected?.type === 'frame' && selected.id === frame.id
                  ? 'border-[var(--ink)]'
                  : ''
              }`}
              style={{
                left: frame.x,
                top: frame.y,
                width: frame.width,
                height: frame.height,
              }}
              onPointerDown={(event) => {
                event.stopPropagation()
                const point = getWorldPoint(event)
                setSelected({ type: 'frame', id: frame.id })
                dragRef.current = {
                  type: 'frame',
                  id: frame.id,
                  mode: 'move',
                  start: point,
                  origin: { x: frame.x, y: frame.y },
                }
              }}
            >
              <div className="text-xs text-[var(--muted)]">{frame.title}</div>
              {selected?.type === 'frame' && selected.id === frame.id && (
                <button
                  type="button"
                  className="absolute bottom-2 right-2 h-3 w-3 rounded-full border border-[var(--border)] bg-white"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    const point = getWorldPoint(event)
                    dragRef.current = {
                      type: 'frame',
                      id: frame.id,
                      mode: 'resize',
                      start: point,
                      origin: { x: frame.x, y: frame.y },
                      size: { width: frame.width, height: frame.height },
                    }
                  }}
                />
              )}
            </div>
          ))}

          {shapes.map((shape) => (
            <div
              key={shape.id}
              className={`absolute border border-[var(--border)] bg-white/80 ${
                shape.type === 'ellipse' ? 'rounded-full' : 'rounded-lg'
              } ${
                selected?.type === 'shape' && selected.id === shape.id
                  ? 'ring-2 ring-[var(--ink)]'
                  : ''
              }`}
              style={{
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
              }}
              onPointerDown={(event) => {
                event.stopPropagation()
                const point = getWorldPoint(event)
                setSelected({ type: 'shape', id: shape.id })
                dragRef.current = {
                  type: 'shape',
                  id: shape.id,
                  mode: 'move',
                  start: point,
                  origin: { x: shape.x, y: shape.y },
                }
              }}
            >
              {selected?.type === 'shape' && selected.id === shape.id && (
                <button
                  type="button"
                  className="absolute bottom-2 right-2 h-3 w-3 rounded-full border border-[var(--border)] bg-white"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    const point = getWorldPoint(event)
                    dragRef.current = {
                      type: 'shape',
                      id: shape.id,
                      mode: 'resize',
                      start: point,
                      origin: { x: shape.x, y: shape.y },
                      size: { width: shape.width, height: shape.height },
                    }
                  }}
                />
              )}
            </div>
          ))}

          {arrows.map((arrow) => (
            <div key={arrow.id} className="absolute left-0 top-0">
              <svg
                className="absolute overflow-visible"
                style={{
                  left: Math.min(arrow.start.x, arrow.end.x),
                  top: Math.min(arrow.start.y, arrow.end.y),
                }}
                width={Math.abs(arrow.end.x - arrow.start.x) || 1}
                height={Math.abs(arrow.end.y - arrow.start.y) || 1}
              >
                <line
                  x1={arrow.start.x < arrow.end.x ? 0 : Math.abs(arrow.end.x - arrow.start.x)}
                  y1={arrow.start.y < arrow.end.y ? 0 : Math.abs(arrow.end.y - arrow.start.y)}
                  x2={arrow.start.x < arrow.end.x ? Math.abs(arrow.end.x - arrow.start.x) : 0}
                  y2={arrow.start.y < arrow.end.y ? Math.abs(arrow.end.y - arrow.start.y) : 0}
                  stroke={arrow.color}
                  strokeWidth={2}
                />
              </svg>
              {[arrow.start, arrow.end].map((point, index) => (
                <button
                  key={`${arrow.id}-${index}`}
                  type="button"
                  className="absolute h-3 w-3 rounded-full border border-[var(--border)] bg-white"
                  style={{ left: point.x - 6, top: point.y - 6 }}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    const world = getWorldPoint(event)
                    dragRef.current = {
                      type: 'arrow',
                      id: arrow.id,
                      mode: index === 0 ? 'arrow-start' : 'arrow-end',
                      start: world,
                      origin: world,
                    }
                    setSelected({ type: 'arrow', id: arrow.id })
                  }}
                />
              ))}
            </div>
          ))}

          {texts.map((text) => (
            <div
              key={text.id}
              className={`absolute rounded-lg border border-[var(--border)] bg-white/90 p-2 text-sm ${
                selected?.type === 'text' && selected.id === text.id
                  ? 'ring-2 ring-[var(--ink)]'
                  : ''
              }`}
              style={{ left: text.x, top: text.y, width: text.width }}
              onPointerDown={(event) => {
                event.stopPropagation()
                const point = getWorldPoint(event)
                setSelected({ type: 'text', id: text.id })
                dragRef.current = {
                  type: 'text',
                  id: text.id,
                  mode: 'move',
                  start: point,
                  origin: { x: text.x, y: text.y },
                }
              }}
            >
              <textarea
                value={text.text}
                onChange={(event) =>
                  setTexts((prev) =>
                    prev.map((item) =>
                      item.id === text.id
                        ? { ...item, text: event.target.value }
                        : item
                    )
                  )
                }
                className="h-16 w-full resize-none border-none bg-transparent text-sm outline-none"
              />
              {selected?.type === 'text' && selected.id === text.id && (
                <button
                  type="button"
                  className="absolute bottom-2 right-2 h-3 w-3 rounded-full border border-[var(--border)] bg-white"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    const point = getWorldPoint(event)
                    dragRef.current = {
                      type: 'text',
                      id: text.id,
                      mode: 'resize',
                      start: point,
                      origin: { x: text.x, y: text.y },
                      size: { width: text.width, height: text.height },
                    }
                  }}
                />
              )}
            </div>
          ))}

          {notes.map((note) => (
            <div
              key={note.id}
              className={`absolute w-[200px] cursor-grab rounded-xl border border-[var(--border)] p-3 text-sm shadow-[var(--shadow)] ${
                selected?.type === 'note' && selected.id === note.id
                  ? 'ring-2 ring-[var(--ink)]'
                  : ''
              }`}
              style={{ left: note.x, top: note.y, backgroundColor: note.color }}
              onPointerDown={(event) => {
                event.stopPropagation()
                const point = getWorldPoint(event)
                setSelected({ type: 'note', id: note.id })
                dragRef.current = {
                  type: 'note',
                  id: note.id,
                  mode: 'move',
                  start: point,
                  origin: { x: note.x, y: note.y },
                }
              }}
            >
              <textarea
                value={note.text}
                onChange={(event) =>
                  setNotes((prev) =>
                    prev.map((item) =>
                      item.id === note.id
                        ? { ...item, text: event.target.value }
                        : item
                    )
                  )
                }
                className="h-24 w-full resize-none border-none bg-transparent text-sm outline-none"
              />
            </div>
          ))}

          {cursors
            .filter((cursor) => cursor.id !== cursorId)
            .map((cursor) => (
              <div
                key={cursor.id}
                className="absolute"
                style={{ left: cursor.x, top: cursor.y }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: cursor.color }}
                />
                <div className="mt-1 rounded-full bg-white px-2 py-1 text-[10px] shadow">
                  {cursor.name}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
