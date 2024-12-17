import { useEffect, useRef, useState } from "react";
import { WifiMetrics } from "./WifiMetrics";
import { Toolbar } from "./Toolbar";
import { ComparisonView } from "./ComparisonView";
import { ReportGenerator } from "./ReportGenerator";
import { ClientInfoForm } from "./ClientInfoForm";
import arService from "@/services/arService";
import wifiService from "@/services/wifiService";
import supabaseService from "@/services/supabaseService";
import { toast } from "sonner";
import * as THREE from "three";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";

interface ClientInfo {
  documentType: string;
  documentNumber: string;
  phone: string;
  subscriberNumber: string;
  orderNumber: string;
  serviceType: string;
}

export function ARView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAREnabled, setIsAREnabled] = useState(true);
  const [signalThreshold, setSignalThreshold] = useState(-70);
  const [showComparison, setShowComparison] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (clientInfo) {
      setupCamera();
    }
  }, [clientInfo]);

  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("No se pudo acceder a la cámara");
    }
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.appendChild(arService.getRenderer().domElement);
    }

    function animate() {
      requestAnimationFrame(animate);
      arService.render();
    }
    animate();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const handleMeasure = async () => {
    if (!clientInfo) {
      toast.error("Por favor, ingrese la información del cliente primero");
      return;
    }

    const measurement = await wifiService.measureWifiQuality();

    const position = new THREE.Vector3(
      Math.random() * 4 - 2,
      Math.random() * 4 - 2,
      -3
    );

    arService.addMeasurementMarker(position, measurement);

    await supabaseService.storeMeasurement(
      measurement,
      "Medición " + (wifiService.getMeasurements().length + 1),
      "demo-client",
      clientInfo
    );

    toast.success("¡Medición tomada y almacenada!");
  };

  const handleClientInfoSubmit = (info: ClientInfo) => {
    setClientInfo(info);
    toast.success("Información del cliente registrada");
  };

  if (!clientInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 flex items-center justify-center">
        <ClientInfoForm onSubmit={handleClientInfoSubmit} />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen" ref={containerRef}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${
          isAREnabled ? "visible" : "hidden"
        }`}
      />

      <WifiMetrics measurements={wifiService.filterMeasurements(signalThreshold)} />

      {showComparison && (
        <div className="fixed top-4 left-4 right-4 max-h-[60vh] overflow-auto bg-white/90 backdrop-blur-sm rounded-lg shadow-lg">
          <ComparisonView measurements={wifiService.getMeasurements()} />
        </div>
      )}

      <button
        onClick={() => navigate("/reports", { state: { from: location.pathname } })}
        className="fixed top-4 right-4 bg-primary hover:bg-primary/90 text-white p-3 rounded-lg shadow-lg flex items-center gap-2"
      >
        <Settings className="w-5 h-5" />
        <span className="hidden md:inline">Gestionar Informes</span>
      </button>

      <Toolbar
        onMeasure={handleMeasure}
        onToggleAR={() => setIsAREnabled((prev) => !prev)}
        onFilterChange={setSignalThreshold}
        onToggleComparison={() => setShowComparison((prev) => !prev)}
      />
    </div>
  );
}
