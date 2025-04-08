import { createContext, ReactNode, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type GameContextType = {
  gameHistory: any[];
  isLoadingHistory: boolean;
  refreshGameHistory: () => void;
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch game history
  const {
    data: gameHistory = [],
    isLoading: isLoadingHistory,
    refetch: refreshGameHistory,
  } = useQuery({
    queryKey: ["/api/game-history"],
    enabled: !!user,
  });

  return (
    <GameContext.Provider
      value={{
        gameHistory,
        isLoadingHistory,
        refreshGameHistory,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
