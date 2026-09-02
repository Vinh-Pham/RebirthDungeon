/**
 * O(1) dynamic occupancy index over the static grid. Cell index ↔ the stable
 * id of the entity occupying it (actors and closed doors). Floor tiles are
 * never entities and never enter this index.
 */

export interface OccupancyIndex {
  /** Registers an entity at a cell; the cell must be free. */
  occupy(cellIndex: number, entityId: string): void;
  /** Frees a cell. */
  vacate(cellIndex: number): void;
  /** Moves an entity between two free/target cells in one step. */
  move(fromCellIndex: number, toCellIndex: number, entityId: string): void;
  /** Stable id of the occupant, or undefined. */
  occupantAt(cellIndex: number): string | undefined;
}

export function createOccupancyIndex(): OccupancyIndex {
  const byCell = new Map<number, string>();
  return {
    occupy(cellIndex, entityId) {
      if (byCell.has(cellIndex)) {
        throw new Error(
          `occupancy: cell ${cellIndex} already held by '${byCell.get(cellIndex)}'`,
        );
      }
      byCell.set(cellIndex, entityId);
    },
    vacate(cellIndex) {
      byCell.delete(cellIndex);
    },
    move(fromCellIndex, toCellIndex, entityId) {
      byCell.delete(fromCellIndex);
      byCell.set(toCellIndex, entityId);
    },
    occupantAt(cellIndex) {
      return byCell.get(cellIndex);
    },
  };
}
