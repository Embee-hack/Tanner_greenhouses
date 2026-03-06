import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ImageCropper({ imageUrl, onCropComplete, onCancel }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 200 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - crop.size / 2;
    const y = e.clientY - rect.top - crop.size / 2;
    setCrop(c => ({
      ...c,
      x: Math.max(0, Math.min(x, rect.width - crop.size)),
      y: Math.max(0, Math.min(y, rect.height - crop.size))
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = async () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    canvas.width = 200;
    canvas.height = 200;
    
    const scale = img.naturalWidth / img.width;
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.drawImage(
      img,
      crop.x * scale,
      crop.y * scale,
      crop.size * scale,
      crop.size * scale,
      0,
      0,
      200,
      200
    );
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCropComplete(blob);
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold">Crop Image</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="relative w-full h-80 bg-muted rounded-lg overflow-hidden cursor-move" 
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}>
            <img ref={imageRef} src={imageUrl} alt="Crop" className="w-full h-full object-contain" />
            <div
              className="absolute border-2 border-primary rounded-full pointer-events-none"
              style={{
                width: crop.size,
                height: crop.size,
                left: crop.x,
                top: crop.y,
                boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.5)"
              }}
            />
          </div>
          
          <div className="text-xs text-muted-foreground">Drag to position • Result will be circular</div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleCrop}>Apply Crop</Button>
          </div>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
