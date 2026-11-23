import {
  Component,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CameraControls,
  Center,
  type CenterProps,
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * Lädt die Modelle vorab in den Cache von useLoader.
 *
 * Wird von ModelViewer.astro aufgerufen, sobald der Browser nach dem
 * Seitenaufbau Leerlauf hat. Springt jemand direkt zu einem Viewer weiter
 * unten, sind die Dateien dann schon geladen und geparst -- es bleibt nur
 * noch das Anlegen des Canvas.
 */
export function preloadViewerAssets(modelUrls: string[]) {
  for (const url of modelUrls) useGLTF.preload(url, false, true);
}

/** Ab diesem Winkel zwischen zwei Flächen gilt eine Kante als "hart". */
const EDGE_THRESHOLD_ANGLE = 25;

const edgeMaterial = new THREE.LineBasicMaterial({
  color: "#14161c",
  transparent: true,
  opacity: 0.55,
});

/**
 * Hängt jedem Mesh dünne Linien auf seinen harten Kanten an, wie in einer
 * CAD-Ansicht. Winkel und Fasen bleiben so auch dann lesbar, wenn zwei
 * benachbarte Flächen fast gleich hell sind.
 */
function addEdgeLines(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });
  for (const mesh of meshes) {
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, EDGE_THRESHOLD_ANGLE),
      edgeMaterial
    );
    // Linien sollen weder Annotationen verdecken noch Schatten werfen.
    lines.raycast = () => {};
    mesh.add(lines);
  }
}

const NO_MESHES: THREE.Mesh[] = [];

const MeshContext = createContext<THREE.Mesh[]>([]);

/** Sammelt alle Meshes unterhalb eines Nodes (inklusive des Nodes selbst). */
function findChildMeshes(object: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });
  return meshes;
}

/**
 * Liest die Beschriftung eines Nodes.
 *
 * Bevorzugt `extras.label` aus der glTF-Datei, fällt sonst auf den
 * Node-Namen zurück.
 *
 * Früher stand hier zusätzlich eine Ersetzung von "ue"/"ae"/"oe" durch
 * Umlaute. Die war nicht eingrenzbar -- sie hätte jedes Label mit
 * legitimer Buchstabenfolge zerstört ("Neue" wird zu "Nue"). glTF-Namen
 * sind UTF-8, Umlaute können direkt im CAD vergeben werden.
 */
function readLabel(node: THREE.Object3D, tag: string): string {
  const extras = node.userData as { label?: unknown } | undefined;
  if (typeof extras?.label === "string" && extras.label.trim() !== "") {
    return extras.label.trim();
  }
  return node.name
    .replace(tag, "")
    .replace("--no-occlude", "")
    .replace(/_/g, " ")
    .replace(/\s*<.*?>\s*/g, "")
    .trim();
}

type AnnotationData = {
  label: string;
  position: [number, number, number];
  meshesToExclude: THREE.Mesh[];
  disableOcclusion: boolean;
};

type AnnotationProps = {
  label: string;
  position: [number, number, number];
  meshesToExclude?: THREE.Mesh[];
  disableOcclusion?: boolean;
};

function Annotation({
  label,
  position,
  meshesToExclude = NO_MESHES,
  disableOcclusion = false,
}: AnnotationProps) {
  const [isOccluded, setIsOccluded] = useState(false);
  const annotationGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const allSceneMeshes = useContext(MeshContext);

  // Einmal pro Modell statt in jedem Frame gefiltert.
  const intersectionTargets = useMemo(() => {
    const excluded = new Set(meshesToExclude);
    return allSceneMeshes.filter((mesh) => !excluded.has(mesh));
  }, [allSceneMeshes, meshesToExclude]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const worldTargetPosition = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  // Läuft dank frameloop="demand" nur, wenn tatsächlich ein Bild
  // gerendert wird -- also bei Kamerabewegung. Genau dann kann sich die
  // Verdeckung ändern.
  useFrame(() => {
    if (!annotationGroupRef.current || intersectionTargets.length === 0) {
      setIsOccluded(false);
      return;
    }

    annotationGroupRef.current.getWorldPosition(worldTargetPosition);
    const distanceToAnnotation = camera.position.distanceTo(worldTargetPosition);
    direction.subVectors(worldTargetPosition, camera.position).normalize();
    raycaster.set(camera.position, direction);
    const intersects = raycaster.intersectObjects(intersectionTargets, true);

    setIsOccluded(intersects.length > 0 && intersects[0]!.distance < distanceToAnnotation - 0.01);
  });

  const occluded = isOccluded && !disableOcclusion;

  return (
    <group ref={annotationGroupRef} position={position}>
      <Html center zIndexRange={[100, 0]}>
        <div className={`annotation-container ${occluded ? "occluded" : ""}`}>
          <div className="dot" />
          <div className="label-wrapper">
            <div className="line" />
            <div className="model-label annotation-label">{label}</div>
          </div>
        </div>
      </Html>
    </group>
  );
}

type AssemblyProps = {
  modelUrl: string;
  labelOffset: number;
  mainLabel?: string;
  modelScale: number;
  edges: boolean;
};

function Assembly({ modelUrl, labelOffset, mainLabel, modelScale, edges }: AssemblyProps) {
  // useDraco=false: drei würde den Draco-Decoder sonst von
  // https://www.gstatic.com/ nachladen (core/Gltf.js). Die Modelle sind
  // Meshopt-komprimiert, dessen Decoder aus three-stdlib mitgebündelt ist.
  const gltf = useGLTF(modelUrl, false, true);
  // useGLTF cached die Szene pro URL. Die Kopie hält Skalierung und
  // Schatten-Flags aus dem Cache heraus, und dasselbe Modell kann in
  // mehreren Viewern einer Seite stehen (ein Object3D hat nur einen Parent).
  // Geometrien und Materialien bleiben geteilt.
  const scene = useMemo(() => {
    const copy = gltf.scene.clone(true);
    if (edges) addEdgeLines(copy);
    return copy;
  }, [gltf.scene, edges]);
  const [labels, setLabels] = useState<{ text: string; position: [number, number, number] }[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [allMeshes, setAllMeshes] = useState<THREE.Mesh[]>([]);
  const [assemblyBounds, setAssemblyBounds] = useState<THREE.Box3 | null>(null);
  const isFitted = useRef(false);
  const fitBox = useRef<THREE.Box3 | null>(null);
  const camera = useThree((state) => state.camera);
  // Aus dem Store statt per Ref: Ist das Modell schon im Cache, mountet
  // Assembly im selben Commit wie CameraControls -- und damit, bevor dessen
  // Ref gesetzt ist. Der Store-Wert löst dagegen ein erneutes Rendern aus.
  const controls = useThree((state) => state.controls) as unknown as CameraControls | null;
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.scale.setScalar(modelScale);
    scene.updateWorldMatrix(true, true);

    // Die Beschriftungen hängen neben der Szene unter demselben Parent,
    // ihre Positionen gelten also in dessen Koordinatensystem. Stage
    // verschiebt diesen Parent beim Zentrieren -- ohne die Umrechnung
    // wären die Labels nach jedem erneuten Lauf dieses Effekts versetzt.
    const worldToParent = scene.parent
      ? scene.parent.matrixWorld.clone().invert()
      : new THREE.Matrix4();

    const box = new THREE.Box3().setFromObject(scene);
    setAssemblyBounds(box.clone().applyMatrix4(worldToParent));

    // Die Kamera richtet sich nach dem Modell, bevor Stage es zentriert.
    fitBox.current ??= box.clone();

    const extractedLabels: { text: string; position: [number, number, number] }[] = [];
    const extractedAnnotations: AnnotationData[] = [];
    const allFoundMeshes: THREE.Mesh[] = [];

    scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh && node.visible) allFoundMeshes.push(node as THREE.Mesh);

      if (node.name.startsWith("_label_")) {
        const nodeBox = new THREE.Box3().setFromObject(node).applyMatrix4(worldToParent);
        const center = new THREE.Vector3();
        nodeBox.getCenter(center);
        extractedLabels.push({
          text: readLabel(node, "_label_"),
          position: [center.x, nodeBox.max.y + labelOffset, center.z],
        });
      }

      if (node.name.startsWith("_ann_")) {
        const position = new THREE.Vector3();
        node.getWorldPosition(position).applyMatrix4(worldToParent);
        extractedAnnotations.push({
          label: readLabel(node, "_ann_"),
          position: position.toArray() as [number, number, number],
          meshesToExclude: findChildMeshes(node),
          disableOcclusion: node.name.includes("--no-occlude"),
        });
      }
    });

    setLabels(extractedLabels);
    setAnnotations(extractedAnnotations);
    setAllMeshes(allFoundMeshes);

    // frameloop="demand" rendert nicht von sich aus. Nach dem Setzen der
    // Beschriftungen muss einmal explizit neu gezeichnet werden, damit die
    // Html-Overlays ihre Position bekommen.
    invalidate();
  }, [scene, labelOffset, modelScale, invalidate]);

  useEffect(() => {
    const box = fitBox.current;
    if (!controls || !box || isFitted.current) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    const cameraY = center.y + size.y * 0.1;

    controls.setLookAt(
      0,
      cameraY,
      center.z + cameraDistance,
      0,
      center.y - size.y * 0.5,
      center.z,
      true
    );
    controls.saveState();
    isFitted.current = true;
  }, [controls, camera]);

  const mainLabelPosition = useMemo<[number, number, number]>(() => {
    if (!assemblyBounds) return [0, 0, 0];
    const center = new THREE.Vector3();
    assemblyBounds.getCenter(center);
    return [center.x, assemblyBounds.max.y + labelOffset * 2, center.z];
  }, [assemblyBounds, labelOffset]);

  return (
    <MeshContext.Provider value={allMeshes}>
      <primitive object={scene} />
      {mainLabel && assemblyBounds && (
        <Html position={mainLabelPosition} zIndexRange={[100, 0]}>
          <div className="model-label main-label bottom-center">{mainLabel}</div>
        </Html>
      )}
      {labels.map((label, i) => (
        <Html key={`label-${i}`} position={label.position} zIndexRange={[100, 0]}>
          <div className="model-label main-label bottom-center">{label.text}</div>
        </Html>
      ))}
      {annotations.map((ann, i) => (
        <Annotation
          key={`ann-${i}`}
          label={ann.label}
          position={ann.position}
          meshesToExclude={ann.meshesToExclude}
          disableOcclusion={ann.disableOcclusion}
        />
      ))}
    </MeshContext.Provider>
  );
}

/**
 * Studio-Beleuchtung, Zentrierung und Bodenschatten.
 *
 * Die Modelle sollen Winkel, Fasen und Überhänge erklären. Deshalb gibt es
 * statt einer fotografierten Umgebung drei definierte Lichtflächen und ein
 * gerichtetes Hauptlicht, dessen Schatten Überhänge sichtbar macht. Alles
 * hängt nur von der Modellgröße ab -- keine Datei, kein Download.
 */
function Studio({ children }: { children: ReactNode }) {
  const [{ radius, height }, setSize] = useState({ radius: 0, height: 0 });

  // Stabile Referenz: Center misst bei jeder neuen Callback-Identität neu.
  const handleCentered = useCallback<NonNullable<CenterProps["onCentered"]>>(
    ({ height, boundingSphere }) => {
      setSize((previous) =>
        previous.radius === boundingSphere.radius && previous.height === height
          ? previous
          : { radius: boundingSphere.radius, height }
      );
    },
    []
  );

  return (
    <>
      <Environment resolution={256}>
        {/* Grundhelligkeit, damit abgewandte Flächen nicht schwarz werden. */}
        <color attach="background" args={["#23252b"]} />
        {/* Softbox: vorne links oben */}
        <Lightformer form="rect" intensity={5} position={[-6, 6, 6]} scale={[10, 10, 1]} />
        {/* Aufhellung: rechts, schwächer */}
        <Lightformer form="rect" intensity={1} position={[8, 2, 3]} scale={[8, 8, 1]} />
        {/* Kantenlicht von hinten, trennt die Teile vom dunklen Hintergrund */}
        <Lightformer form="rect" intensity={4} position={[2, 5, -9]} scale={[14, 5, 1]} />
      </Environment>

      {radius > 0 && (
        <directionalLight
          position={[-radius * 1.2, radius * 2.2, radius * 1.6]}
          intensity={1.6}
          castShadow
          shadow-mapSize={2048}
          shadow-bias={-0.0002}
          shadow-normalBias={radius * 0.004}
          shadow-camera-left={-radius * 1.3}
          shadow-camera-right={radius * 1.3}
          shadow-camera-top={radius * 1.3}
          shadow-camera-bottom={-radius * 1.3}
          shadow-camera-near={radius * 0.1}
          shadow-camera-far={radius * 6}
        />
      )}

      <Center onCentered={handleCentered}>{children}</Center>

      <group position={[0, -height / 2, 0]}>
        <ContactShadows scale={radius * 4} far={radius} opacity={0.5} blur={2.6} />
      </group>
    </>
  );
}

/**
 * Fängt Ladefehler ab.
 *
 * Ohne das bleibt bei einem fehlenden oder defekten Modell der
 * Suspense-Fallback stehen und die Seite zeigt dauerhaft
 * "Modell wird geladen ...".
 */
class ViewerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("AssemblyViewer: Modell konnte nicht geladen werden.", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export type AssemblyViewerProps = {
  modelUrl: string;
  /** Beschreibt für Screenreader, was das Modell zeigt. */
  description?: string;
  mainLabel?: string;
  allowFloorClip?: boolean;
  /** Dünne Linien auf harten Kanten, wie in einer CAD-Ansicht. */
  edges?: boolean;
  modelScale?: number;
  labelOffset?: number;
};

export default function AssemblyViewer({
  modelUrl,
  description,
  mainLabel,
  allowFloorClip = false,
  edges = true,
  modelScale = 100,
  labelOffset = 0.4,
}: AssemblyViewerProps) {
  const controlsRef = useRef<CameraControls | null>(null);
  const [isViewChanged, setIsViewChanged] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(false);

  useEffect(() => {
    if (!isViewChanged) return;
    const timer = setTimeout(() => setIsButtonVisible(true), 10);
    return () => clearTimeout(timer);
  }, [isViewChanged]);

  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleControlStart = () => {
    if (!isViewChanged) setIsViewChanged(true);
  };

  const handleResetView = () => {
    if (!controlsRef.current) return;
    controlsRef.current.reset(true);
    setIsButtonVisible(false);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setIsViewChanged(false), 300);
  };

  return (
    <ViewerErrorBoundary
      fallback={
        <div className="assembly-viewer-container not-content">
          <p className="assembly-viewer-status">
            Das 3D-Modell konnte nicht geladen werden. Die Erklärung im Text daneben kommt ohne das
            Modell aus.
          </p>
        </div>
      }
    >
      {/* data-model-url liest ModelViewer.astro aus, um die Modelle vorab zu laden. */}
      <div className="assembly-viewer-container not-content" data-model-url={modelUrl}>
        {isViewChanged && (
          <button
            onClick={handleResetView}
            className={`reset-button ${isButtonVisible ? "visible" : ""}`}
            title="Ansicht zurücksetzen"
            aria-label="Ansicht zurücksetzen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </button>
        )}
        {/*
          role="img" macht alle Kindelemente für Screenreader zur reinen
          Darstellung. Der Button oben muss deshalb außerhalb liegen.
        */}
        <div
          className="assembly-viewer-canvas"
          role="img"
          aria-label={
            description ??
            mainLabel ??
            "Interaktives 3D-Modell zur Veranschaulichung des im Text beschriebenen Prinzips"
          }
        >
          <Canvas
            // Rendert nur bei Bedarf statt dauerhaft mit 60 fps. Auf der Seite
            // "Stützmaterial vermeiden" laufen fünf Viewer nebeneinander --
            // vorher hat jeder davon permanent die GPU beschäftigt.
            frameloop="demand"
            shadows
            gl={{
              antialias: true,
              // Neutral statt ACES: Die flachen CAD-Farben kommen so an, wie
              // sie vergeben wurden, statt entsättigt und verschoben.
              toneMapping: THREE.NeutralToneMapping,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            camera={{ position: [0, 2, 12], fov: 50 }}
          >
            <Suspense fallback={<Html center>Modell wird geladen…</Html>}>
              <Studio>
                <Assembly
                  modelUrl={modelUrl}
                  labelOffset={labelOffset}
                  mainLabel={mainLabel}
                  modelScale={modelScale}
                  edges={edges}
                />
              </Studio>
            </Suspense>

            <CameraControls
              ref={controlsRef}
              makeDefault
              minPolarAngle={0}
              maxPolarAngle={allowFloorClip ? undefined : Math.PI / 2}
              mouseButtons-wheel={0}
              onControlStart={handleControlStart}
            />
          </Canvas>
        </div>
      </div>
    </ViewerErrorBoundary>
  );
}
