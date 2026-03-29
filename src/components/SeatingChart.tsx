import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';
import { Guest } from '../types';
import { Users, Plus, Trash2, Save, Move, MousePointer2, Layout, Users2, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'round' | 'rectangular';
  capacity: number;
  guestIds: string[];
}

export const SeatingChart: React.FC<{ weddingId: string }> = ({ weddingId }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);

  // Virtualize guests for plus ones
  const virtualGuests = guests.flatMap(g => {
    const list = [{ ...g, isPlusOne: false }];
    if (g.plusOne) {
      list.push({
        ...g,
        id: `${g.id}_plusone`,
        name: g.plusOneName || `Acompañante de ${g.name}`,
        isPlusOne: true,
        originalGuestId: g.id
      } as Guest & { isPlusOne: boolean, originalGuestId?: string });
    }
    return list;
  });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableType, setNewTableType] = useState<'round' | 'rectangular'>('round');
  const [newTableCapacity, setNewTableCapacity] = useState(8);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        console.log('SeatingChart Dimensions:', { width, height });
        setDimensions({
          width: width > 10 ? width : 800,
          height: height > 10 ? height : 600
        });
      }
    };

    updateDimensions();
    // Use a small timeout to ensure layout has settled
    const timer = setTimeout(updateDimensions, 100);
    
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!weddingId) return;
    console.log('Fetching tables for wedding:', weddingId);
    const q = query(collection(db, `weddings/${weddingId}/tables`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tablesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Table));
      console.log('Tables fetched:', tablesData);
      setTables(tablesData);
    }, (error) => {
      console.error('Error fetching tables:', error);
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/tables`);
    });
    return unsubscribe;
  }, [weddingId]);

  useEffect(() => {
    const q = query(collection(db, `weddings/${weddingId}/guests`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Guest)).filter(g => g.status === 'confirmed'));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/guests`);
    });
    return unsubscribe;
  }, [weddingId]);

  const generatePDF = async () => {
    if (!stageRef.current) return;

    // Create PDF
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(244, 63, 94); // rose-500
    doc.text('Organización de Mesas', pageWidth / 2, 20, { align: 'center' });

    // Capture stage
    const stage = stageRef.current;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });

    // Add image to PDF
    const imgProps = doc.getImageProperties(dataUrl);
    const imgWidth = pageWidth - 40;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
    let finalImgHeight = imgHeight;
    let finalImgWidth = imgWidth;
    if (imgHeight > pageHeight - 60) {
      finalImgHeight = pageHeight - 60;
      finalImgWidth = (imgProps.width * finalImgHeight) / imgProps.height;
    }

    doc.addImage(dataUrl, 'PNG', (pageWidth - finalImgWidth) / 2, 30, finalImgWidth, finalImgHeight);

    // Add a second page with the guest list per table
    doc.addPage();
    doc.setFontSize(18);
    doc.text('Listado de Invitados por Mesa', pageWidth / 2, 20, { align: 'center' });

    const tableData = tables.map(table => {
      const guestNames = table.guestIds
        .map(id => virtualGuests.find(vg => vg.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      return [table.name, `${table.guestIds.length}/${table.capacity}`, guestNames];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Mesa', 'Capacidad', 'Invitados']],
      body: tableData,
      headStyles: { fillColor: [244, 63, 94] }, // rose-500
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' }
      }
    });

    doc.save('Organizacion_Mesas.pdf');
  };

  const addTable = async () => {
    if (!newTableName.trim()) return;
    try {
      await addDoc(collection(db, `weddings/${weddingId}/tables`), {
        name: newTableName,
        type: newTableType,
        capacity: newTableCapacity,
        x: 100,
        y: 100,
        guestIds: []
      });
      setNewTableName('');
      setIsAddingTable(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/tables`);
    }
  };

  const updateTablePosition = async (id: string, x: number, y: number) => {
    try {
      await updateDoc(doc(db, `weddings/${weddingId}/tables`, id), { x, y });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/tables/${id}`);
    }
  };

  const deleteTable = async (id: string) => {
    try {
      await deleteDoc(doc(db, `weddings/${weddingId}/tables`, id));
      if (selectedTableId === id) setSelectedTableId(null);
      setTableToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/tables/${id}`);
    }
  };

  const assignGuestToTable = async (tableId: string, guestId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Find the guest and their potential companion
    const guest = virtualGuests.find(vg => vg.id === guestId);
    if (!guest) return;

    let companionId: string | null = null;
    if ((guest as any).isPlusOne) {
      // If we're assigning a plus-one, find the main guest
      companionId = (guest as any).originalGuestId;
    } else {
      // If we're assigning a main guest, find their plus-one if it exists
      const companion = virtualGuests.find(vg => (vg as any).originalGuestId === guestId);
      if (companion) companionId = companion.id;
    }

    const idsToAssign = [guestId];
    if (companionId && !table.guestIds.includes(companionId)) {
      idsToAssign.push(companionId);
    }

    // Check capacity for all being assigned (only those not already in the table)
    const currentOccupancy = table.guestIds.length;
    const newGuestsCount = idsToAssign.filter(id => !table.guestIds.includes(id)).length;
    
    if (currentOccupancy + newGuestsCount > table.capacity) {
      alert('Esta mesa no tiene suficiente espacio para el invitado y su acompañante.');
      return;
    }

    // Remove these guests from any other table first
    for (const id of idsToAssign) {
      const otherTable = tables.find(t => t.guestIds.includes(id));
      if (otherTable && otherTable.id !== tableId) {
        try {
          await updateDoc(doc(db, `weddings/${weddingId}/tables`, otherTable.id), {
            guestIds: otherTable.guestIds.filter(gid => gid !== id)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/tables/${otherTable.id}`);
        }
      }
    }

    try {
      // Use Set to ensure uniqueness, though we've handled it above
      const updatedGuestIds = Array.from(new Set([...table.guestIds, ...idsToAssign]));
      await updateDoc(doc(db, `weddings/${weddingId}/tables`, tableId), {
        guestIds: updatedGuestIds
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/tables/${tableId}`);
    }
  };

  const removeGuestFromTable = async (tableId: string, guestId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Find the guest and their potential companion
    const guest = virtualGuests.find(vg => vg.id === guestId);
    if (!guest) return;

    let companionId: string | null = null;
    if ((guest as any).isPlusOne) {
      companionId = (guest as any).originalGuestId;
    } else {
      const companion = virtualGuests.find(vg => (vg as any).originalGuestId === guestId);
      if (companion) companionId = companion.id;
    }

    const idsToRemove = [guestId];
    if (companionId && table.guestIds.includes(companionId)) {
      idsToRemove.push(companionId);
    }

    try {
      await updateDoc(doc(db, `weddings/${weddingId}/tables`, tableId), {
        guestIds: table.guestIds.filter(id => !idsToRemove.includes(id))
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/tables/${tableId}`);
    }
  };

  // Group unassigned guests to show them as pairs if they have a plus-one
  const unassignedGroups = React.useMemo(() => {
    const unassigned = virtualGuests.filter(vg => !tables.some(t => t.guestIds.includes(vg.id)));
    const groups: { main: Guest, companion?: Guest & { isPlusOne: boolean, originalGuestId?: string } }[] = [];
    const processedIds = new Set<string>();

    unassigned.forEach(vg => {
      if (processedIds.has(vg.id)) return;

      if ((vg as any).isPlusOne) {
        const mainGuest = unassigned.find(u => u.id === (vg as any).originalGuestId);
        if (mainGuest) {
          groups.push({ main: mainGuest, companion: vg as any });
          processedIds.add(mainGuest.id);
          processedIds.add(vg.id);
        } else {
          // Companion is unassigned but main guest is assigned? 
          // This shouldn't happen with our new logic, but handle it just in case
          groups.push({ main: vg as any });
          processedIds.add(vg.id);
        }
      } else {
        const companion = unassigned.find(u => (u as any).originalGuestId === vg.id);
        if (companion) {
          groups.push({ main: vg, companion: companion as any });
          processedIds.add(vg.id);
          processedIds.add(companion.id);
        } else {
          groups.push({ main: vg });
          processedIds.add(vg.id);
        }
      }
    });

    return groups;
  }, [virtualGuests, tables]);

  console.log('Rendering SeatingChart, tables count:', tables.length);

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">Organizador de Mesas</h2>
          <p className="text-slate-500">Arrastra y suelta para organizar a tus invitados.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => console.log('Current tables:', tables)}
            className="bg-slate-100 text-slate-600 px-4 py-3 rounded-2xl hover:bg-slate-200 transition-all font-bold"
          >
            Debug Log
          </button>
          <button 
            onClick={() => setIsAddingTable(true)}
            className="bg-rose-500 text-white px-6 py-3 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 flex items-center gap-2 font-bold"
          >
            <Plus className="w-5 h-5" />
            Agregar Mesa
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Canvas Area */}
        <div 
          ref={containerRef} 
          className="flex-1 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 relative overflow-hidden min-h-[400px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const guestId = e.dataTransfer.getData('guestId');
            if (!guestId) return;

            const stage = stageRef.current;
            if (!stage) return;

            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Find which table is at this position
            // We can iterate through tables and check if (x,y) is inside the table's bounds
            const droppedTable = tables.find(t => {
              const dx = x - t.x;
              const dy = y - t.y;
              if (t.type === 'round') {
                return Math.sqrt(dx*dx + dy*dy) < 60;
              } else {
                return Math.abs(dx) < 60 && Math.abs(dy) < 40;
              }
            });

            if (droppedTable) {
              assignGuestToTable(droppedTable.id, guestId);
            }
          }}
        >
          <Stage width={dimensions.width} height={dimensions.height} ref={stageRef}>
            <Layer>
              {/* Test Rect to verify Konva is working */}
              <Rect x={10} y={10} width={50} height={50} fill="rgba(244, 63, 94, 0.1)" stroke="#f43f5e" strokeWidth={1} dash={[5, 5]} />
              
              {tables.map((table) => (
                <Group
                  key={table.id}
                  x={table.x}
                  y={table.y}
                  draggable
                  opacity={selectedTableId && selectedTableId !== table.id ? 0.4 : 1}
                  onDragEnd={(e) => {
                    updateTablePosition(table.id, e.target.x(), e.target.y());
                  }}
                  onMouseEnter={(e) => {
                    setHoveredTableId(table.id);
                    const stage = e.target.getStage();
                    if (stage) {
                      const pos = stage.getPointerPosition();
                      if (pos) setMousePos(pos);
                    }
                  }}
                  onMouseMove={(e) => {
                    const stage = e.target.getStage();
                    if (stage) {
                      const pos = stage.getPointerPosition();
                      if (pos) setMousePos(pos);
                    }
                  }}
                  onMouseLeave={() => setHoveredTableId(null)}
                  onClick={() => setSelectedTableId(table.id)}
                  onTap={() => setSelectedTableId(table.id)}
                >
                  {selectedTableId === table.id && (
                    table.type === 'round' ? (
                      <Circle
                        radius={72}
                        stroke="#f43f5e"
                        strokeWidth={1}
                        dash={[4, 4]}
                        opacity={0.6}
                      />
                    ) : (
                      <Rect
                        width={144}
                        height={104}
                        offsetX={72}
                        offsetY={52}
                        stroke="#f43f5e"
                        strokeWidth={1}
                        dash={[4, 4]}
                        opacity={0.6}
                        cornerRadius={14}
                      />
                    )
                  )}
                  {table.type === 'round' ? (
                    <Circle
                      radius={60}
                      fill={selectedTableId === table.id ? '#fff1f2' : '#ffffff'}
                      stroke={selectedTableId === table.id ? '#f43f5e' : '#e2e8f0'}
                      strokeWidth={selectedTableId === table.id ? 3 : 2}
                      shadowColor={selectedTableId === table.id ? '#f43f5e' : '#000'}
                      shadowBlur={selectedTableId === table.id ? 20 : 10}
                      shadowOpacity={selectedTableId === table.id ? 0.3 : 0.1}
                      shadowOffset={{ x: 0, y: 4 }}
                    />
                  ) : (
                    <Rect
                      width={120}
                      height={80}
                      offsetX={60}
                      offsetY={40}
                      fill={selectedTableId === table.id ? '#fff1f2' : '#ffffff'}
                      stroke={selectedTableId === table.id ? '#f43f5e' : '#e2e8f0'}
                      strokeWidth={selectedTableId === table.id ? 3 : 2}
                      cornerRadius={10}
                      shadowColor={selectedTableId === table.id ? '#f43f5e' : '#000'}
                      shadowBlur={selectedTableId === table.id ? 20 : 10}
                      shadowOpacity={selectedTableId === table.id ? 0.3 : 0.1}
                      shadowOffset={{ x: 0, y: 4 }}
                    />
                  )}
                  <Text
                    text={table.name}
                    width={120}
                    offsetX={60}
                    offsetY={10}
                    align="center"
                    fontStyle="bold"
                    fontSize={14}
                    fill="#1e293b"
                  />
                  <Text
                    text={`${table.guestIds.length}/${table.capacity}`}
                    width={120}
                    offsetX={60}
                    offsetY={-15}
                    align="center"
                    fontSize={12}
                    fill="#64748b"
                  />
                  {/* Visual indicators for occupied seats */}
                  {Array.from({ length: table.capacity }).map((_, i) => {
                    const angle = (i / table.capacity) * Math.PI * 2;
                    const radius = 75;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isOccupied = i < table.guestIds.length;
                    const guestId = isOccupied ? table.guestIds[i] : null;
                    const guest = guestId ? virtualGuests.find(vg => vg.id === guestId) : null;
                    const guestColor = guest?.color || '#f43f5e';

                    return (
                      <Circle
                        key={i}
                        x={x}
                        y={y}
                        radius={8}
                        fill={isOccupied ? guestColor : '#f1f5f9'}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  })}
                  {/* Delete button on table when selected */}
                  {selectedTableId === table.id && (
                    <Group
                      x={table.type === 'round' ? 0 : 0}
                      y={table.type === 'round' ? -85 : -65}
                    >
                      <Rect
                        width={60}
                        height={20}
                        offsetX={30}
                        offsetY={10}
                        fill="#f43f5e"
                        cornerRadius={10}
                      />
                      <Text
                        text="ACTIVA"
                        width={60}
                        offsetX={30}
                        offsetY={5}
                        align="center"
                        fontSize={10}
                        fontStyle="bold"
                        fill="#ffffff"
                      />
                    </Group>
                  )}
                  {selectedTableId === table.id && (
                    <Group
                      x={table.type === 'round' ? 45 : 65}
                      y={table.type === 'round' ? -45 : -45}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setTableToDelete(table.id);
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        setTableToDelete(table.id);
                      }}
                    >
                      <Circle
                        radius={12}
                        fill="#fff"
                        stroke="#f43f5e"
                        strokeWidth={1}
                        shadowBlur={5}
                        shadowOpacity={0.2}
                      />
                      <Text
                        text="×"
                        fontSize={20}
                        x={-6}
                        y={-12}
                        fill="#f43f5e"
                        fontStyle="bold"
                      />
                    </Group>
                  )}
                </Group>
              ))}

              {/* Tooltip */}
              {hoveredTableId && (
                <Group
                  x={mousePos.x + 15}
                  y={mousePos.y + 15}
                  listening={false}
                >
                  {(() => {
                    const table = tables.find(t => t.id === hoveredTableId);
                    if (!table) return null;
                    
                    const tableGuests = table.guestIds
                      .map(id => virtualGuests.find(vg => vg.id === id))
                      .filter(Boolean) as (Guest & { isPlusOne: boolean, originalGuestId?: string })[];
                    
                    if (tableGuests.length === 0) return null;

                    // Group guests into pairs
                    const pairs: { main: string, companion?: string }[] = [];
                    const processedIds = new Set<string>();

                    tableGuests.forEach(g => {
                      if (processedIds.has(g.id)) return;

                      if (g.isPlusOne) {
                        const mainGuest = tableGuests.find(tg => tg.id === g.originalGuestId);
                        if (mainGuest) {
                          pairs.push({ main: mainGuest.name, companion: g.name });
                          processedIds.add(mainGuest.id);
                          processedIds.add(g.id);
                        } else {
                          pairs.push({ main: g.name });
                          processedIds.add(g.id);
                        }
                      } else {
                        const companion = tableGuests.find(tg => tg.originalGuestId === g.id);
                        if (companion) {
                          pairs.push({ main: g.name, companion: companion.name });
                          processedIds.add(g.id);
                          processedIds.add(companion.id);
                        } else {
                          pairs.push({ main: g.name });
                          processedIds.add(g.id);
                        }
                      }
                    });

                    const padding = 16;
                    const fontSize = 13;
                    const lineHeight = 22;
                    const pairSpacing = 8;
                    const headerHeight = 30;
                    const width = 240;
                    
                    // Calculate height based on pairs and their companions
                    let contentHeight = 0;
                    pairs.forEach(p => {
                      contentHeight += lineHeight;
                      if (p.companion) contentHeight += lineHeight - 4; // Slightly tighter for companion
                      contentHeight += pairSpacing;
                    });

                    const height = headerHeight + contentHeight + (padding * 2) - pairSpacing;

                    return (
                      <Group>
                        <Rect
                          width={width}
                          height={height}
                          fill="rgba(15, 23, 42, 0.95)"
                          cornerRadius={12}
                          shadowBlur={15}
                          shadowOpacity={0.3}
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeWidth={1}
                        />
                        <Text
                          text={table.name.toUpperCase()}
                          x={padding}
                          y={padding}
                          fill="#f43f5e"
                          fontSize={10}
                          fontStyle="bold"
                          letterSpacing={1.5}
                        />
                        <Rect 
                          x={padding}
                          y={padding + 18}
                          width={width - (padding * 2)}
                          height={1}
                          fill="rgba(255, 255, 255, 0.1)"
                        />
                        {(() => {
                          let currentY = padding + headerHeight;
                          return pairs.map((pair, i) => {
                            const pairGroup = (
                              <Group key={i} x={padding} y={currentY}>
                                {/* Main Guest */}
                                <Group>
                                  <Circle radius={2.5} y={fontSize / 2 + 1} fill="#f43f5e" />
                                  <Text
                                    text={pair.main}
                                    x={12}
                                    fill="#ffffff"
                                    fontSize={fontSize}
                                    fontStyle="bold"
                                    width={width - (padding * 2) - 12}
                                    wrap="none"
                                    ellipsis={true}
                                  />
                                </Group>
                                {/* Companion */}
                                {pair.companion && (
                                  <Group y={lineHeight - 4}>
                                    <Rect x={12} y={fontSize / 2} width={6} height={1} fill="rgba(255, 255, 255, 0.3)" />
                                    <Text
                                      text={pair.companion}
                                      x={22}
                                      fill="rgba(255, 255, 255, 0.7)"
                                      fontSize={fontSize - 1}
                                      fontStyle="italic"
                                      width={width - (padding * 2) - 22}
                                      wrap="none"
                                      ellipsis={true}
                                    />
                                  </Group>
                                )}
                              </Group>
                            );
                            currentY += lineHeight + (pair.companion ? lineHeight - 4 : 0) + pairSpacing;
                            return pairGroup;
                          });
                        })()}
                      </Group>
                    );
                  })()}
                </Group>
              )}
            </Layer>
          </Stage>

          {/* Canvas Controls Overlay */}
          <div className="absolute bottom-6 left-6 flex gap-2">
            <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-lg flex gap-1">
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600" title="Seleccionar">
                <MousePointer2 className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600" title="Mover">
                <Move className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={generatePDF}
              className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-2 text-slate-700 font-bold text-sm hover:bg-white transition-all"
              title="Descargar PDF"
            >
              <FileDown className="w-5 h-5 text-rose-500" />
              <span>PDF</span>
            </button>
          </div>

          {/* Floating Add Button */}
          <button 
            onClick={() => setIsAddingTable(true)}
            className="absolute bottom-6 right-6 w-14 h-14 bg-rose-500 text-white rounded-full shadow-xl shadow-rose-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
            title="Agregar Mesa"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          {/* Selected Table Details */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col min-h-0">
                  <h3 className="font-serif font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <Layout className="w-5 h-5 text-rose-500" />
                    <div className="flex flex-col">
                      <span>{selectedTableId ? tables.find(t => t.id === selectedTableId)?.name : 'Selecciona una mesa'}</span>
                      {selectedTableId && (
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Mesa Seleccionada</span>
                      )}
                    </div>
                  </h3>
            
            {selectedTableId ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Invitados ({tables.find(t => t.id === selectedTableId)?.guestIds.length}/{tables.find(t => t.id === selectedTableId)?.capacity})
                  </span>
                  <button 
                    onClick={() => setTableToDelete(selectedTableId)}
                    className="flex items-center gap-1 text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-all text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Borrar
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {tables.find(t => t.id === selectedTableId)?.guestIds.map(guestId => {
                    const guest = guestId ? virtualGuests.find(g => g.id === guestId) : null;
                    const guestColor = guest?.color || '#f43f5e';
                    return (
                      <div key={guestId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-white shadow-sm"
                            style={{ backgroundColor: guestColor }}
                          >
                            {(guest as any)?.isPlusOne ? '+1' : (guest?.name?.[0] || '?')}
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate">{guest?.name || 'Invitado desconocido'}</span>
                        </div>
                        <button 
                          onClick={() => removeGuestFromTable(selectedTableId!, guestId)}
                          className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {tables.find(t => t.id === selectedTableId)?.guestIds.length === 0 && (
                    <p className="text-center text-slate-400 text-sm italic py-4">Mesa vacía</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic">Haz clic en una mesa para ver sus detalles y asignar invitados.</p>
            )}
          </div>

          {/* Unassigned Guests */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col flex-1 min-h-0">
            <h3 className="font-serif font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
              <Users2 className="w-5 h-5 text-indigo-500" />
              Sin Asignar
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {unassignedGroups.map(group => (
                <button
                  key={group.main.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('guestId', group.main.id);
                  }}
                  disabled={!selectedTableId}
                  onClick={() => selectedTableId && assignGuestToTable(selectedTableId, group.main.id)}
                  className={`w-full flex flex-col p-3 rounded-xl transition-all border cursor-grab active:cursor-grabbing ${
                    selectedTableId 
                      ? 'bg-slate-50 hover:bg-indigo-50 border-transparent hover:border-indigo-100 text-slate-700' 
                      : 'bg-slate-50 opacity-50 cursor-not-allowed text-slate-400 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: group.main.color || '#f43f5e' }}
                      >
                        {group.main.name?.[0] || '?'}
                      </div>
                      <span className="text-sm font-medium">{group.main.name}</span>
                    </div>
                    <Plus className="w-4 h-4" />
                  </div>
                  {group.companion && (
                    <div className="flex items-center gap-2 mt-2 ml-8 border-l-2 border-indigo-100 pl-2">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: group.companion.color || group.main.color || '#f43f5e' }}
                      >
                        +1
                      </div>
                      <span className="text-xs text-slate-500 italic">{group.companion.name}</span>
                    </div>
                  )}
                </button>
              ))}
              {unassignedGroups.length === 0 && (
                <p className="text-center text-slate-400 text-sm italic py-4">Todos los invitados están asignados</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Table Modal */}
      <AnimatePresence>
        {isAddingTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <h3 className="text-2xl font-serif font-bold text-slate-800">Nueva Mesa</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre de la Mesa</label>
                    <input
                      type="text"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      placeholder="Ej: Mesa 1, Familia Pérez..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                      <select
                        value={newTableType}
                        onChange={(e) => setNewTableType(e.target.value as 'round' | 'rectangular')}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                      >
                        <option value="round">Redonda</option>
                        <option value="rectangular">Rectangular</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Capacidad</label>
                      <input
                        type="number"
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAddingTable(false)}
                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={addTable}
                    disabled={!newTableName.trim()}
                    className="flex-1 bg-rose-500 text-white font-bold py-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Crear Mesa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {tableToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-bold text-slate-800">¿Eliminar mesa?</h3>
                  <p className="text-slate-500">Esta acción no se puede deshacer y los invitados quedarán sin asignar.</p>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setTableToDelete(null)}
                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => deleteTable(tableToDelete)}
                    className="flex-1 bg-rose-500 text-white font-bold py-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
