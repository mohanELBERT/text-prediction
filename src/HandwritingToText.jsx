import React, { useRef, useState, useEffect } from "react";
import { Grid3X3 } from "lucide-react";

const HandwritingToText = () => {
  const canvasRef = useRef(null);
  const [text, setText] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const points = useRef([]);

  // Replace with your Google Cloud Vision API key
  const GOOGLE_API_KEY = "AIzaSyB4ergnT8XaZw-eP2nECHh_k1nxaNGyjqM";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing styles
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    if (showGrid) {
      drawGrid();
    }
  }, [showGrid]);

  const drawGrid = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const gridSize = 50;

    ctx.save();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = gridSize; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = gridSize; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  const smoothLine = (points) => {
    const smoothing = 0.2;
    const line = [];

    line.push(points[0]);

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const smoothX = curr.x + (next.x - prev.x) * smoothing;
      const smoothY = curr.y + (next.y - prev.y) * smoothing;

      line.push({ x: smoothX, y: smoothY });
    }

    line.push(points[points.length - 1]);
    return line;
  };

  const getCoordinates = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const coords = getCoordinates(event, canvas);

    setIsDrawing(true);
    setLastPos(coords);
    points.current = [coords];
  };

  const handleMove = (event) => {
    event.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCoordinates(event, canvas);

    points.current.push(coords);

    if (points.current.length > 3) {
      const smoothedPoints = smoothLine(points.current.slice(-4));

      ctx.beginPath();
      ctx.moveTo(smoothedPoints[0].x, smoothedPoints[0].y);

      for (let i = 1; i < smoothedPoints.length; i++) {
        ctx.lineTo(smoothedPoints[i].x, smoothedPoints[i].y);
      }

      ctx.stroke();
    }

    setLastPos(coords);
  };

  const handleEnd = () => {
    setIsDrawing(false);
    points.current = [];
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (showGrid) {
      drawGrid();
    }
    setText("");
  };

  const handleGoogleVisionOCR = async () => {
    setIsProcessing(true);
    const canvas = canvasRef.current;

    try {
      // Convert canvas to base64
      const imageData = canvas.toDataURL("image/png").split(",")[1];

      // Prepare the request to Google Cloud Vision API
      debugger
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageData,
                },
                features: [
                  {
                    type: "DOCUMENT_TEXT_DETECTION",
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (result.responses && result.responses[0].fullTextAnnotation) {
        setText(result.responses[0].fullTextAnnotation.text);
      } else {
        setText("No text detected. Please try writing more clearly.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      setText("Error processing image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Handwriting to Text Converter
      </h1>

      <div className="w-full bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between mb-4">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Toggle Grid"
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full border-2 border-gray-300 rounded-lg touch-none cursor-crosshair bg-white"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={handleGoogleVisionOCR}
            disabled={isProcessing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? "Converting..." : "Convert to Text"}
          </button>

          <button
            onClick={handleClearCanvas}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-black font-semibold rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {text && (
        <div className="w-full mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-2">Recognized Text:</h2>
          <p className="break-words text-gray-800 font-mono">{text}</p>
        </div>
      )}
    </div>
  );
};

export default HandwritingToText;
