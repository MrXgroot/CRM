import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';

interface QRScannerProps {
    onScan: (barcode: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
    const handleScan = (imgSrc: string) => {
        if (imgSrc) {
            const image = new Image();
            image.src = imgSrc;
            image.onload = async () => {
                const codeReader = new BrowserMultiFormatReader();

                try {
                    const result = await codeReader.decodeFromImage(image);
                    onScan(result.getText());
                } catch (error) {
                    if (error instanceof NotFoundException) {
                        console.log('No QR or Barcode detected.');
                    } else {
                        console.error('Error scanning:', error);
                    }
                }
            };
        }
    };

    return (
        <div>
            <WebcamCapture onScan={handleScan} />
        </div>
    );
};

interface WebcamCaptureProps {
    onScan: (barcode: string) => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onScan }) => {
    const webcamRef = useRef<Webcam | null>(null);

    const videoConstraints = {
        facingMode: 'environment',
    };

    const capture = () => {
        if (webcamRef.current) {
            const imgSrc = webcamRef.current.getScreenshot();
            if (imgSrc) {
                onScan(imgSrc);
            }
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            capture();
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    return (
        <div>
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                //   width="500"
                //   height="500"
            />
        </div>
    );
};

// ======= barcode reader input =========
// this input is used to scan qr code using the scanner as well as enter manually.
interface BarcodeInputProps {
    onBarcodeScan: (barcode: string) => void;
    label?: string;
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
    onBarcodeScan,
    label,
}) => {
    const [barcode, setBarcode] = useState<string>('');

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            if (barcode.trim()) {
                onBarcodeScan(barcode);
                setBarcode('');
            }
            event.preventDefault();
        }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBarcode(event.target.value);
    };

    return (
        <div className="input-field flex flex-col justify-end flex-wrap  mx-2 mt-2 relative ">
            {label && <label className="w-full">{label}</label>}
            <input
                className="h-12 w-full rounded border border-gray-400  px-4 py-3 pe-2 text-sm shadow-sm"
                type="text"
                placeholder={'Scan barcode here'}
                value={barcode}
                onKeyDown={handleKeyDown}
                onChange={handleChange}
                // autoFocus
            />
            <i className="fa-solid fa-barcode text-gray-500 absolute bottom-[17px] right-[15px] "></i>
        </div>
    );
};
