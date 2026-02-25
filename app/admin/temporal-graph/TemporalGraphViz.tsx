'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface GraphNode {
    id: string
    entity_key: string
    entity_type: string
    entity_value: string | null
    occurrence_count: number
    community_id?: number
    // Layout positions computed by force simulation
    x?: number
    y?: number
    vx?: number
    vy?: number
}

interface GraphEdge {
    source_node_id: string
    target_node_id: string
    weight: number
}

interface Props {
    nodes: GraphNode[]
    edges: GraphEdge[]
    communityColors?: Record<number, string>
    colorMode?: 'type' | 'community'
    onNodeClick?: (node: GraphNode) => void
}

// Color palette for entity types
const TYPE_COLORS: Record<string, string> = {
    field: '#f97316',   // orange
    url: '#3b82f6',     // blue
    text: '#a855f7',    // purple
    number: '#22c55e',  // green
    date: '#eab308',    // yellow
    unknown: '#6b7280', // gray
}

/**
 * Force-directed graph visualization using SVG.
 * Spring physics simulation with zoom/pan support.
 */
export function TemporalGraphViz({ nodes, edges, communityColors, colorMode = 'type', onNodeClick }: Props) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
    const [hoveredNode, setHoveredNode] = useState<string | null>(null)
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>([])
    const animationRef = useRef<number | null>(null)

    // Measure container
    useEffect(() => {
        const container = svgRef.current?.parentElement
        if (container) {
            const rect = container.getBoundingClientRect()
            setDimensions({ width: rect.width, height: Math.max(rect.height, 500) })
        }
    }, [])

    // Force-directed layout simulation
    useEffect(() => {
        if (nodes.length === 0) {
            setLayoutNodes([])
            return
        }

        // Initialize positions in a circle
        const cx = dimensions.width / 2
        const cy = dimensions.height / 2
        const radius = Math.min(cx, cy) * 0.6

        const simNodes: GraphNode[] = nodes.map((n, i) => {
            const angle = (2 * Math.PI * i) / nodes.length
            return {
                ...n,
                x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 50,
                y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 50,
                vx: 0,
                vy: 0,
            }
        })

        const nodeMap = new Map(simNodes.map((n) => [n.id, n]))

        // Run simulation steps
        let step = 0
        const maxSteps = 120
        const damping = 0.92

        function simulate() {
            if (step >= maxSteps) {
                setLayoutNodes([...simNodes])
                return
            }

            const alpha = 1 - step / maxSteps

            // Repulsion between all nodes (Coulomb's law)
            for (let i = 0; i < simNodes.length; i++) {
                for (let j = i + 1; j < simNodes.length; j++) {
                    const a = simNodes[i]
                    const b = simNodes[j]
                    const dx = (b.x ?? 0) - (a.x ?? 0)
                    const dy = (b.y ?? 0) - (a.y ?? 0)
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1
                    const force = (800 * alpha) / (dist * dist)
                    const fx = (dx / dist) * force
                    const fy = (dy / dist) * force
                    a.vx = (a.vx ?? 0) - fx
                    a.vy = (a.vy ?? 0) - fy
                    b.vx = (b.vx ?? 0) + fx
                    b.vy = (b.vy ?? 0) + fy
                }
            }

            // Attraction along edges (Hooke's law)
            for (const edge of edges) {
                const source = nodeMap.get(edge.source_node_id)
                const target = nodeMap.get(edge.target_node_id)
                if (!source || !target) continue
                const dx = (target.x ?? 0) - (source.x ?? 0)
                const dy = (target.y ?? 0) - (source.y ?? 0)
                const dist = Math.sqrt(dx * dx + dy * dy) || 1
                const idealDist = 120
                const force = ((dist - idealDist) * 0.03 * alpha) * Math.min(edge.weight, 5)
                const fx = (dx / dist) * force
                const fy = (dy / dist) * force
                source.vx = (source.vx ?? 0) + fx
                source.vy = (source.vy ?? 0) + fy
                target.vx = (target.vx ?? 0) - fx
                target.vy = (target.vy ?? 0) - fy
            }

            // Center gravity
            for (const node of simNodes) {
                node.vx = (node.vx ?? 0) + (cx - (node.x ?? 0)) * 0.005 * alpha
                node.vy = (node.vy ?? 0) + (cy - (node.y ?? 0)) * 0.005 * alpha
            }

            // Apply velocities
            for (const node of simNodes) {
                node.vx = (node.vx ?? 0) * damping
                node.vy = (node.vy ?? 0) * damping
                node.x = (node.x ?? 0) + (node.vx ?? 0)
                node.y = (node.y ?? 0) + (node.vy ?? 0)

                // Boundary constraints
                node.x = Math.max(30, Math.min(dimensions.width - 30, node.x!))
                node.y = Math.max(30, Math.min(dimensions.height - 30, node.y!))
            }

            step++
            setLayoutNodes([...simNodes])
            animationRef.current = requestAnimationFrame(simulate)
        }

        animationRef.current = requestAnimationFrame(simulate)

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [nodes, edges, dimensions])

    // Zoom handler
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1
        setTransform((prev) => ({
            ...prev,
            scale: Math.max(0.3, Math.min(3, prev.scale * scaleDelta)),
        }))
    }, [])

    // Pan handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
            setIsDragging(true)
            setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
        }
    }, [transform])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) {
            setTransform((prev) => ({
                ...prev,
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            }))
        }
    }, [isDragging, dragStart])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    // Node sizing based on occurrence count
    const getNodeRadius = (count: number) => {
        return Math.max(6, Math.min(24, 4 + Math.sqrt(count) * 3))
    }

    const getLabel = (node: GraphNode) => {
        const val = node.entity_value || node.entity_key
        if (val.length > 20) return val.substring(0, 18) + '…'
        return val
    }

    if (nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-[500px] text-neutral-500">
                <div className="text-center">
                    <div className="text-6xl mb-4 opacity-20">◎</div>
                    <p className="text-lg font-medium">No graph data yet</p>
                    <p className="text-sm mt-1">Entities will appear here as collectors extract data</p>
                </div>
            </div>
        )
    }

    return (
        <svg
            ref={svgRef}
            width="100%"
            height={dimensions.height}
            className="cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Background */}
            <rect width="100%" height="100%" fill="transparent" />

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
                {/* Edges */}
                {edges.map((edge, i) => {
                    const source = layoutNodes.find((n) => n.id === edge.source_node_id)
                    const target = layoutNodes.find((n) => n.id === edge.target_node_id)
                    if (!source || !target) return null

                    const isHighlighted = hoveredNode === source.id || hoveredNode === target.id
                    const opacity = hoveredNode ? (isHighlighted ? 0.8 : 0.08) : 0.25

                    return (
                        <line
                            key={`edge-${i}`}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke={isHighlighted ? '#f97316' : '#525252'}
                            strokeWidth={Math.min(edge.weight * 0.5, 4)}
                            opacity={opacity}
                            className="transition-opacity duration-200"
                        />
                    )
                })}

                {/* Nodes */}
                {layoutNodes.map((node) => {
                    const r = getNodeRadius(node.occurrence_count)
                    const color = colorMode === 'community' && communityColors && node.community_id != null
                        ? (communityColors[node.community_id] || TYPE_COLORS.unknown)
                        : (TYPE_COLORS[node.entity_type] || TYPE_COLORS.unknown)
                    const isHovered = hoveredNode === node.id

                    // Check if this node is connected to the hovered node
                    const isConnected = hoveredNode && edges.some(
                        (e) =>
                            (e.source_node_id === hoveredNode && e.target_node_id === node.id) ||
                            (e.target_node_id === hoveredNode && e.source_node_id === node.id)
                    )

                    const opacity = hoveredNode
                        ? isHovered || isConnected ? 1 : 0.15
                        : 1

                    return (
                        <g
                            key={node.id}
                            className="cursor-pointer transition-opacity duration-200"
                            style={{ opacity }}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={() => onNodeClick?.(node)}
                        >
                            {/* Glow effect */}
                            {isHovered && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={r + 8}
                                    fill={color}
                                    opacity={0.15}
                                />
                            )}

                            {/* Node circle */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={r}
                                fill={color}
                                stroke={isHovered ? '#fff' : color}
                                strokeWidth={isHovered ? 2 : 1}
                                opacity={0.85}
                            />

                            {/* Label (shown for larger/hovered nodes) */}
                            {(r > 10 || isHovered) && (
                                <text
                                    x={node.x}
                                    y={(node.y ?? 0) + r + 14}
                                    textAnchor="middle"
                                    fill={isHovered ? '#fff' : '#a3a3a3'}
                                    fontSize={isHovered ? 12 : 10}
                                    fontFamily="monospace"
                                    className="pointer-events-none select-none"
                                >
                                    {getLabel(node)}
                                </text>
                            )}

                            {/* Tooltip on hover */}
                            {isHovered && (
                                <foreignObject
                                    x={(node.x ?? 0) - 100}
                                    y={(node.y ?? 0) - r - 60}
                                    width={200}
                                    height={50}
                                    className="pointer-events-none"
                                >
                                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-center shadow-xl">
                                        <p className="text-xs text-neutral-400">{node.entity_type}</p>
                                        <p className="text-xs font-mono text-white truncate">
                                            {node.entity_value || node.entity_key}
                                        </p>
                                        <p className="text-[10px] text-orange-400">{node.occurrence_count}× seen</p>
                                    </div>
                                </foreignObject>
                            )}
                        </g>
                    )
                })}
            </g>

            {/* Legend */}
            <g transform={`translate(16, ${dimensions.height - 100})`}>
                <rect x={-8} y={-8} width={120} height={96} rx={8} fill="#171717" opacity={0.85} />
                {Object.entries(TYPE_COLORS).map(([type, color], i) => (
                    <g key={type} transform={`translate(0, ${i * 16})`}>
                        <circle cx={6} cy={4} r={4} fill={color} />
                        <text x={16} y={8} fill="#a3a3a3" fontSize={10}>{type}</text>
                    </g>
                ))}
            </g>
        </svg>
    )
}
