import {
  Component,
  Suspense,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Html, Stage, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Selbst gehostete Umgebungs-HDRI.
 *
 * drei laedt fuer environment="city" eine ~1,5 MB grosse HDRI von
 * https://raw.githack.com/pmndrs/drei-assets/... (siehe core/useEnvironment.js).
 * Das ist ein fremdes, community-betriebenes CDN ohne Zusage zur
 * Verfuegbarkeit: es bekommt die IP jedes Besuchers, und faellt es aus,
 * bleibt der Viewer im Ladezustand haengen.
 */
const ENVIRONMENT_FILE = "/hdri/potsdamer_platz_1k.hdr";

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
 * Bevorzugt `extras.label` aus der glTF-Datei, faellt sonst auf den
 * Node-Namen zurueck.
 *
 * Frueher stand hier zusaetzlich eine Ersetzung von "ue"/"ae"/"oe" durch
 * Umlaute. Die war nicht eingrenzbar -- sie haette jedes Label mit
 * legitimer Buchstabenfolge zerstoert ("Neue" wird zu "Nue"). glTF-Namen
 * sind UTF-8, Umlaute koennen direkt im CAD vergeben werden.
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
  meshesToExclude = [],
  disableOcclusion = false,
}: AnnotationProps) {
  const [isOccluded, setIsOccluded] = useState(false);
  const annotationGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const allSceneMeshes = useContext(MeshContext);

  const meshesToExcludeSet = useMemo(() => new Set(meshesToExclude), [meshesToExclude]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const worldTargetPosition = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  // Laeuft dank frameloop="demand" nur, wenn tatsaechlich ein Bild
  // gerendert wird -- also bei Kamerabewegung. Genau dann kann sich die
  // Verdeckung aendern.
  useFrame(() => {
    if (!annotationGroupRef.current || allSceneMeshes.length === 0) {
      setIsOccluded(false);
      return;
    }
    const intersectionTargets = allSceneMeshes.filter((mesh) => !meshesToExcludeSet.has(mesh));
    if (intersectionTargets.length === 0) return;

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
  controlsRef: React.RefObject<CameraControls | null>;
};

function Assembly({ modelUrl, labelOffset, mainLabel, modelScale, controlsRef }: AssemblyProps) {
  // useDraco=false: drei wuerde den Draco-Decoder sonst von
  // https://www.gstatic.com/ nachladen (core/Gltf.js). Die Modelle sind
  // Meshopt-komprimiert, dessen Decoder aus three-stdlib mitgebuendelt ist.
  const gltf = useGLTF(modelUrl, false, true);
  const [labels, setLabels] = useState<{ text: string; position: [number, number, number] }[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [allMeshes, setAllMeshes] = useState<THREE.Mesh[]>([]);
  const [assemblyBounds, setAssemblyBounds] = useState<THREE.Box3 | null>(null);
  const isFitted = useRef(false);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    if (!gltf.scene || !controlsRef.current || !camera) return;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    gltf.scene.scale.set(modelScale, modelScale, modelScale);
    gltf.scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(gltf.scene);
    setAssemblyBounds(box);

    if (!isFitted.current) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const cameraDistance = maxDim / (2 * Math.tan(fov / 2));
      const cameraY = center.y + size.y * 0.1;

      controlsRef.current.setLookAt(
        0,
        cameraY,
        center.z + cameraDistance,
        0,
        center.y - size.y * 0.5,
        center.z,
        true
      );

      controlsRef.current.saveState();
      isFitted.current = true;
    }

    const extractedLabels: { text: string; position: [number, number, number] }[] = [];
    const extractedAnnotations: AnnotationData[] = [];
    const allFoundMeshes: THREE.Mesh[] = [];

    gltf.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh && node.visible) allFoundMeshes.push(node as THREE.Mesh);

      if (node.name.startsWith("_label_")) {
        node.updateWorldMatrix(true, false);
        const nodeBox = new THREE.Box3().setFromObject(node);
        const center = new THREE.Vector3();
        nodeBox.getCenter(center);
        extractedLabels.push({
          text: readLabel(node, "_label_"),
          position: [center.x, nodeBox.max.y + labelOffset, center.z],
        });
      }

      if (node.name.startsWith("_ann_")) {
        const position = new THREE.Vector3();
        node.getWorldPosition(position);
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
  }, [gltf, labelOffset, modelScale, controlsRef, camera, invalidate]);

  const mainLabelPosition = useMemo<[number, number, number]>(() => {
    if (!assemblyBounds) return [0, 0, 0];
    const center = new THREE.Vector3();
    assemblyBounds.getCenter(center);
    return [center.x, assemblyBounds.max.y + labelOffset * 2, center.z];
  }, [assemblyBounds, labelOffset]);

  return (
    <MeshContext.Provider value={allMeshes}>
      <primitive object={gltf.scene} />
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
 * Faengt Ladefehler ab.
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
  /** Beschreibt fuer Screenreader, was das Modell zeigt. */
  description?: string;
  mainLabel?: string;
  allowFloorClip?: boolean;
  modelScale?: number;
  labelOffset?: number;
};

export default function AssemblyViewer({
  modelUrl,
  description,
  mainLabel,
  allowFloorClip = false,
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

  const handleControlStart = () => {
    if (!isViewChanged) setIsViewChanged(true);
  };

  const handleResetView = () => {
    if (!controlsRef.current) return;
    controlsRef.current.reset(true);
    setIsButtonVisible(false);
    setTimeout(() => setIsViewChanged(false), 300);
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
      <div
        className="assembly-viewer-container not-content"
        role="img"
        aria-label={
          description ??
          mainLabel ??
          "Interaktives 3D-Modell zur Veranschaulichung des im Text beschriebenen Prinzips"
        }
      >
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
        <Canvas
          // Rendert nur bei Bedarf statt dauerhaft mit 60 fps. Auf der Seite
          // "Stuetzmaterial vermeiden" laufen fuenf Viewer nebeneinander --
          // vorher hat jeder davon permanent die GPU beschaeftigt.
          frameloop="demand"
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          camera={{ position: [0, 2, 12], fov: 50 }}
        >
          <Suspense fallback={<Html center>Modell wird geladen…</Html>}>
            <Stage
              environment={{ files: ENVIRONMENT_FILE }}
              intensity={0.6}
              adjustCamera={false}
              shadows={{ type: "contact", opacity: 0.7, blur: 2 }}
            >
              <Assembly
                modelUrl={modelUrl}
                labelOffset={labelOffset}
                mainLabel={mainLabel}
                modelScale={modelScale}
                controlsRef={controlsRef}
              />
            </Stage>
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
    </ViewerErrorBoundary>
  );
}
