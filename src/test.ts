import * as THREE from "three";
import { Vector2, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { disposeNode } from "./disposeNode";
import { CHUNK_SIZE } from "./lib/constants";
import { generateMesh } from "./lib/meshGenerator";
import { generateNoiseMap } from "./lib/noiseMapGenerator";
import { LoadedChunks, NoiseLayers, WorkerReturnMessage } from "./lib/types";
import { getChunkKey } from "./lib/utils";

/* ============ SETUP ============ */

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("app") as HTMLCanvasElement,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animation);
const canvasContainer = document.getElementById("canvas-container");
canvasContainer?.appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  1,
  10000
);
camera.position.y = 90;
camera.position.x = 60;
camera.position.z = 60;

// Scene
const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

/* ============ CONTROLS ============ */

const controls = new OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, 0, 0);
controls.update();
controls.zoomSpeed = 0.4;

/* ============ MESH GENERATOR ============ */

const MAP_SIZE = 8;

let loadedChunks: LoadedChunks = {};

let seed = 0.21368721387641278; //Math.random();

let noiseLayers: NoiseLayers = [50, 25, 10];

function generateMap() {
  for (let z = -MAP_SIZE / 2; z <= MAP_SIZE / 2; z++) {
    for (let y = -MAP_SIZE / 2; y <= MAP_SIZE / 2; y++) {
      for (let x = -MAP_SIZE / 2; x <= MAP_SIZE / 2; x++) {
        // if (getChunkKey(x, z) in loadedChunks) {
        //   loadedChunks[getChunkKey(x, z)].noiseMap = generateNoiseMap(
        //     x,
        //     0,
        //     z,
        //     noiseLayers,
        //     seed,
        //     false
        //   );
        // } else {
        loadedChunks[getChunkKey(x, y, z)] = {
          noiseMap: generateNoiseMap(x, y, z, noiseLayers, seed, false),
          mesh: null,
        };
        // }
      }
    }
  }
}

generateMap();

function updateMap() {
  for (let z = -MAP_SIZE / 2; z <= MAP_SIZE / 2; z++) {
    for (let y = -MAP_SIZE / 2; y <= MAP_SIZE / 2; y++) {
      for (let x = -MAP_SIZE / 2; x <= MAP_SIZE / 2; x++) {
        const chunk = loadedChunks[getChunkKey(x, y, z)];
        if (!chunk) continue;

        const { mesh: oldMesh, noiseMap, lastLod } = chunk;

        const levelOfDetail = Math.max(
          Math.min(
            Math.floor(
              Math.log10(
                camera.position.distanceToSquared(
                  new Vector3(x * CHUNK_SIZE, y * CHUNK_SIZE, z * CHUNK_SIZE)
                )
              ) - 3
            ),
            4
          ),
          0
        );

        if (lastLod === levelOfDetail) continue;

        if (oldMesh) {
          disposeNode(scene, oldMesh);
        }

        const mesh = generateMesh({ noiseMap }, true, false, levelOfDetail);
        mesh.position.set(x * CHUNK_SIZE, y * CHUNK_SIZE, z * CHUNK_SIZE);
        chunk.mesh = mesh;
        chunk.lastLod = levelOfDetail;

        scene.add(mesh);
      }
    }
  }
}

/* ============ ANIMATION ============ */

function animation(_time: number) {
  controls.update();
  updateMap();
  renderer.render(scene, camera);
}

/* ============ MISC EVENT LISTENERS ============ */

window.addEventListener("resize", () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
