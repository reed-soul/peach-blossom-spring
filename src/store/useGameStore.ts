import { create } from 'zustand'

export type SceneName = 'menu' | 'opening' | 'forest' | 'cave' | 'village' | 'ending'

interface StoryState {
  visitedNPCs: string[]
  choicesMade: string[]
  currentEnding: string | null
}

interface GameState {
  currentScene: SceneName
  playerPosition: [number, number, number]
  storyState: StoryState
  transition: boolean
  setScene: (scene: SceneName) => void
  updatePosition: (pos: [number, number, number]) => void
  visitNPC: (name: string) => void
  addChoice: (choice: string) => void
  setEnding: (ending: string) => void
  setTransition: (t: boolean) => void
  reset: () => void
}

const initialState = {
  currentScene: 'menu' as SceneName,
  playerPosition: [0, 1.5, 0] as [number, number, number],
  storyState: { visitedNPCs: [], choicesMade: [], currentEnding: null },
  transition: false,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setScene: (scene) => set({ currentScene: scene }),
  updatePosition: (pos) => set({ playerPosition: pos }),
  visitNPC: (name) =>
    set((s) => ({
      storyState: {
        ...s.storyState,
        visitedNPCs: s.storyState.visitedNPCs.includes(name)
          ? s.storyState.visitedNPCs
          : [...s.storyState.visitedNPCs, name],
      },
    })),
  addChoice: (choice) =>
    set((s) => ({
      storyState: { ...s.storyState, choicesMade: [...s.storyState.choicesMade, choice] },
    })),
  setEnding: (ending) =>
    set((s) => ({ storyState: { ...s.storyState, currentEnding: ending } })),
  setTransition: (t) => set({ transition: t }),
  reset: () => set(initialState),
}))
