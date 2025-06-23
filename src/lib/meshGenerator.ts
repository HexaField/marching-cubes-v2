import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshNormalMaterial,
} from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { CHUNK_SIZE, storageKeys } from "./constants";
import { edgeCorners, edges, table } from "./triangulation";
import { Generate, NoiseMap } from "./types";

const SURFACE_LEVEL = 0;

function createTriangle(
  offset: number,
  vertices: Float32Array,
  tableEdges: number[],
  cornerNoises: number[],
  interpolate: boolean
) {
  // Vectors of edges
  const edge1 = edges[tableEdges[offset]];
  const edge2 = edges[tableEdges[offset + 1]];
  const edge3 = edges[tableEdges[offset + 2]];

  if (interpolate) {
    // Id of corners that make up the edges
    const edgeCorners1 = edgeCorners[tableEdges[offset]];
    const edgeCorners2 = edgeCorners[tableEdges[offset + 1]];
    const edgeCorners3 = edgeCorners[tableEdges[offset + 2]];

    // Interpolate edges for smoother surface
    let edgeInterpolate1 =
      Math.abs(cornerNoises[edgeCorners1[0]] - SURFACE_LEVEL) /
      Math.abs(cornerNoises[edgeCorners1[1]] - cornerNoises[edgeCorners1[0]]);

    let edgeInterpolate2 =
      Math.abs(cornerNoises[edgeCorners2[0]] - SURFACE_LEVEL) /
      Math.abs(cornerNoises[edgeCorners2[1]] - cornerNoises[edgeCorners2[0]]);

    let edgeInterpolate3 =
      Math.abs(cornerNoises[edgeCorners3[0]] - SURFACE_LEVEL) /
      Math.abs(cornerNoises[edgeCorners3[1]] - cornerNoises[edgeCorners3[0]]);

    vertices.set(
      [
        edge1[0] === 0.5 ? edgeInterpolate1 : edge1[0],
        edge1[1] === 0.5 ? edgeInterpolate1 : edge1[1],
        edge1[2] === 0.5 ? edgeInterpolate1 : edge1[2],
        edge2[0] === 0.5 ? edgeInterpolate2 : edge2[0],
        edge2[1] === 0.5 ? edgeInterpolate2 : edge2[1],
        edge2[2] === 0.5 ? edgeInterpolate2 : edge2[2],
        edge3[0] === 0.5 ? edgeInterpolate3 : edge3[0],
        edge3[1] === 0.5 ? edgeInterpolate3 : edge3[1],
        edge3[2] === 0.5 ? edgeInterpolate3 : edge3[2],
      ],
      offset * 9
    );
  } else {
    vertices.set(
      [
        edge1[0],
        edge1[1],
        edge1[2],
        edge2[0],
        edge2[1],
        edge2[2],
        edge3[0],
        edge3[1],
        edge3[2],
      ],
      offset * 9
    );
  }
}

export function triangulateChunkCells(
  noiseMap: NoiseMap,
  quality: number,
  interpolate: boolean
) {
  const geoms = [] as BufferGeometry[];

  // Create cube based on noise map
  let cubeCounter = 0;
  for (let x = 0; x < CHUNK_SIZE; x += quality) {
    for (let y = 0; y < CHUNK_SIZE; y += quality) {
      for (let z = 0; z < CHUNK_SIZE; z += quality) {
        let cubeIndex = 0;
        const noiseMapYBot = noiseMap[y];
        const noiseMapYTop = noiseMap[y + quality];

        // Get noise value of each corner of the cube
        const cornerNoises = [
          noiseMapYBot[z][x],
          noiseMapYBot[z][x + quality],
          noiseMapYBot[z + quality][x + quality],
          noiseMapYBot[z + quality][x],
          noiseMapYTop[z][x],
          noiseMapYTop[z][x + quality],
          noiseMapYTop[z + quality][x + quality],
          noiseMapYTop[z + quality][x],
        ];

        // Calculate cube index based on corner noises
        for (let n = 0; n < cornerNoises.length; n++) {
          if (cornerNoises[n] < SURFACE_LEVEL) {
            cubeIndex += 1 << n;
          }
        }

        if (cubeIndex !== 0 && cubeIndex !== 255) {
          // Get edges from table based on cube index
          const tableEdges = table[cubeIndex];

          const vertices = new Float32Array(tableEdges.length * 9);

          for (let i = 0; i < tableEdges.length; i += 3) {
            createTriangle(i, vertices, tableEdges, cornerNoises, interpolate);
          }

          if (vertices.every((v) => v === 0)) continue;

          const geom = new BufferGeometry();

          // Create surface from vertices
          geom.setAttribute("position", new BufferAttribute(vertices, 3));
          geom.scale(quality, quality, quality);
          geom.translate(x, y, z);
          geoms.push(geom);
        }
        cubeCounter++;
      }
    }
  }

  if (!geoms.length) return

  const chunk = mergeBufferGeometries(geoms);
  chunk.computeVertexNormals();

  return chunk;
}

export function generateMesh(
  generate?: Generate,
  interpolate?: boolean,
  wireframe?: boolean,
  levelOfDetail = 0
) {
  let densityField = generate!.noiseMap!;

  if (interpolate === undefined)
    interpolate = sessionStorage.getItem(storageKeys.INTERPOLATE) === "true";
  if (wireframe === undefined)
    wireframe = sessionStorage.getItem(storageKeys.WIREFRAME) === "true";

  const quality = Math.pow(2, levelOfDetail);

  const geoms = triangulateChunkCells(densityField, quality, interpolate);

  // Merge chunk;
  let mesh = new Mesh(
    geoms,
    new MeshNormalMaterial({
      side: DoubleSide,
      wireframe: !!wireframe,
    })
  );

  return mesh;
}
