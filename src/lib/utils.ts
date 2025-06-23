import { storageKeys } from "./constants";

export function getChunkKey(chunkX: number, chunkY: number, chunkZ: number) {
  return `${chunkX},${chunkY},${chunkZ}`;
}

export function getSeed(): number {
  return parseFloat(
    sessionStorage.getItem(storageKeys.MAP_SEED) || Math.random().toString()
  );
}
