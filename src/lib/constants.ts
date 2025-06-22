import { NoiseLayers } from "./types";

export const CHUNK_SIZE = 32;

export const CHUNK_HEIGHT = 32;

export const DEFAULT_NOISE_LAYERS: NoiseLayers = [50, 25, 10];

export const storageKeys = {
  NOISE_LAYERS: "noise-layers",
  MAP_SEED: "map-seed",
  INTERPOLATE: "interpolate",
  WIREFRAME: "wireframe",
};
