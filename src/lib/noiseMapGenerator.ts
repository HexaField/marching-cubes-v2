import { createNoise3D } from "simplex-noise";
import { CHUNK_SIZE, DEFAULT_NOISE_LAYERS } from "./constants";
import { NoiseLayers, NoiseMap, NoiseMapCache, Seed } from "./types";
import { getChunkKey } from "./utils";

const heightBiasMultiplier = 0.1;

let noiseMapCache: NoiseMapCache = {};

export function generateNoiseMap(
  chunkX: number,
  chunkY: number,
  chunkZ: number,
  noiseLayers?: NoiseLayers | null,
  seed?: Seed | null,
  cacheNoiseMap: boolean = false
): NoiseMap {
  const currentSeed = seed || Math.random();
  const noise = createNoise3D(() => currentSeed);

  const noiseMap: NoiseMap = [];
  if (!noiseLayers) noiseLayers = DEFAULT_NOISE_LAYERS;

  const noiseLayerChanged = [true, true, true];

  const chunkKey = getChunkKey(chunkX, chunkY, chunkZ);
  let initialCache = cacheNoiseMap && !(chunkKey in noiseMapCache);
  if (initialCache)
    noiseMapCache[chunkKey] = {
      noiseMap: [],
      noiseLayers: [0, 0, 0],
      seed: currentSeed,
    };

  // Cache noise layers
  if (cacheNoiseMap) {
    for (let i = 0; i < noiseLayers.length; i++) {
      if (
        noiseLayers[i] === noiseMapCache[chunkKey].noiseLayers[i] &&
        currentSeed === noiseMapCache[chunkKey].seed
      ) {
        noiseLayerChanged[i] = false;
      } else {
        noiseMapCache[chunkKey].noiseLayers[i] = noiseLayers[i];
      }
    }
  }

  let y = 0;
  while (y <= CHUNK_SIZE) {
    const plane = [];
    const planeCache = [];
    let z = 0;
    while (z <= CHUNK_SIZE) {
      const buffer = new ArrayBuffer((CHUNK_SIZE + 1) * 4);
      const line = new Float32Array(buffer);
      const lineCache = [];
      let x = 0;
      while (x <= CHUNK_SIZE) {
        const noiseOne = noiseLayerChanged[0]
          ? noise(
              (x + (chunkX - 0.5) * CHUNK_SIZE) / noiseLayers[0],
              (y + (chunkY - 0.5) * CHUNK_SIZE) / noiseLayers[0],
              (z + (chunkZ - 0.5) * CHUNK_SIZE) / noiseLayers[0]
            )
          : noiseMapCache[chunkKey].noiseMap[y][z][x][0];

        const noiseTwo = noiseLayerChanged[1]
          ? 0.5 *
            noise(
              (x + (chunkX - 0.5) * CHUNK_SIZE) / noiseLayers[1],
              (y + (chunkY - 0.5) * CHUNK_SIZE) / noiseLayers[1],
              (z + (chunkZ - 0.5) * CHUNK_SIZE) / noiseLayers[1]
            )
          : noiseMapCache[chunkKey].noiseMap[y][z][x][1];

        const noiseThree = noiseLayerChanged[2]
          ? 0.25 *
            noise(
              (x + (chunkX - 0.5) * CHUNK_SIZE) / noiseLayers[2],
              (y + (chunkY - 0.5) * CHUNK_SIZE) / noiseLayers[2],
              (z + (chunkZ - 0.5) * CHUNK_SIZE) / noiseLayers[2]
            )
          : noiseMapCache[chunkKey].noiseMap[y][z][x][2];

        // add height bias based on world-space y value in order to create ground
        const heightBias =
          (y + (chunkY - 0.5) * CHUNK_SIZE) * heightBiasMultiplier;

        // Layer three noise values for more varied terrain
        const noiseValue = noiseOne + noiseTwo + noiseThree + heightBias;

        if (cacheNoiseMap) {
          if (initialCache) {
            lineCache.push([noiseOne, noiseTwo, noiseThree]);
          } else {
            // Cache noise values
            if (noiseLayerChanged[0])
              noiseMapCache[chunkKey].noiseMap[y][z][x][0] = noiseOne;
            if (noiseLayerChanged[1])
              noiseMapCache[chunkKey].noiseMap[y][z][x][1] = noiseTwo;
            if (noiseLayerChanged[2])
              noiseMapCache[chunkKey].noiseMap[y][z][x][2] = noiseThree;
          }
        }

        line[x] = noiseValue;
        x++;
      }
      if (initialCache) planeCache.push(lineCache);
      plane.push(line);
      z++;
    }
    if (initialCache) noiseMapCache[chunkKey].noiseMap.push(planeCache);
    noiseMap.push(plane);
    y++;
  }

  return noiseMap;
}
