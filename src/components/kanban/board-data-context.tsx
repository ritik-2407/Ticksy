"use client";

/**
 * Hands the board's BoardDataSource to every component under <Board>,
 * so the drawer and its children do not need it passed down by hand.
 */

import { createContext, useContext } from "react";
import type { BoardDataSource } from "@/lib/board-data";

const BoardDataContext = createContext<BoardDataSource | null>(null);

export const BoardDataProvider = BoardDataContext.Provider;

export function useBoardData(): BoardDataSource {
  const source = useContext(BoardDataContext);
  if (!source) {
    throw new Error("useBoardData must be used inside <Board>.");
  }
  return source;
}
